/// <reference types="node" />
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Guards the promises on the Privacy page. If someone adds a network call, a
 * cookie, an analytics service, an advert or an outside link, one of these
 * fails and the page would no longer be true. Reads the real files.
 */
const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), 'utf8')

function sourceFiles(dir: string): string[] {
  return readdirSync(join(root, dir)).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(join(root, path)).isDirectory()) return sourceFiles(path)
    return /\.(ts|tsx|css)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)
      ? [path]
      : []
  })
}

// Test helpers are not shipped, so they may use anything.
const shipped = sourceFiles('src').filter(
  (f) => !f.startsWith(join('src', 'test')),
)
const code = shipped.map((f) => ({ file: relative(root, f), text: read(f) }))

function offenders(pattern: RegExp) {
  return code.filter(({ text }) => pattern.test(text)).map(({ file }) => file)
}

describe('nothing leaves the device', () => {
  it('makes no network requests of its own', () => {
    expect(
      offenders(
        /\bfetch\s*\(|XMLHttpRequest|sendBeacon|new\s+WebSocket|EventSource|navigator\.connection/,
      ),
    ).toEqual([])
  })

  it('has no web addresses to send anything to or load anything from', () => {
    // (The XML namespace of an SVG is an identifier, not an address to visit.)
    const text = code.map((c) =>
      c.text.replace(/http:\/\/www\.w3\.org\/\d+\/\w+/g, ''),
    )
    expect(text.filter((t) => /https?:\/\//.test(t))).toEqual([])
  })

  it('loads nothing from outside in the page or its public files', () => {
    for (const path of ['index.html', 'public/favicon.svg']) {
      const text = read(path).replace(/http:\/\/www\.w3\.org\/2000\/svg/g, '')
      expect(text, path).not.toMatch(/https?:\/\/|\/\/[a-z0-9-]+\.[a-z]{2,}/i)
    }
  })

  it('keeps data only in the browser: local storage, through one wrapper', () => {
    expect(
      offenders(
        /\bsessionStorage\b|\bindexedDB\b|\bcaches\.open|serviceWorker/,
      ),
    ).toEqual([])
    const usingLocalStorage = offenders(/\blocalStorage\b/)
    expect(usingLocalStorage).toEqual([
      join('src', 'services', 'storageService.ts'),
    ])
  })
})

describe('no tracking, no cookies, no adverts', () => {
  it('sets and reads no cookies', () => {
    expect(offenders(/document\.cookie|Set-Cookie/i)).toEqual([])
  })

  it('has no analytics, tracking or advertising code', () => {
    expect(
      offenders(
        /google-?analytics|googletagmanager|gtag\(|\bga\(|segment\.|mixpanel|hotjar|sentry|datadog|fullstory|amplitude|plausible|matomo|facebook|fbq\(|doubleclick|adsbygoogle|adsense|pixel/i,
      ),
    ).toEqual([])
  })

  it('has no identifiers for a person: no names, emails or accounts', () => {
    expect(
      offenders(
        /\bemail\b|\bpassword\b|\blogin\b|\bsign[ -]?up\b|\bsign[ -]?in\b/i,
      ),
    ).toEqual([])
  })

  it('adds no libraries beyond React and its router', () => {
    const { dependencies } = JSON.parse(read('package.json'))
    expect(Object.keys(dependencies).sort()).toEqual([
      'react',
      'react-dom',
      'react-router',
    ])
  })

  it('opens no frames and embeds nothing', () => {
    expect(offenders(/<iframe|<embed|<object\b|<script\b/)).toEqual([])
  })
})

describe('the hosting settings back the same promises up', () => {
  const headersFile = read('public/_headers')
  const policyOf = (text: string) =>
    /Content-Security-Policy:\s*(.+)/.exec(text)?.[1].trim() ?? ''
  const csp = policyOf(headersFile)

  it('only allows what comes from the site itself', () => {
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("script-src 'self'")
    expect(csp).toContain("connect-src 'self'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("frame-ancestors 'none'")
  })

  it('does not weaken the policy with inline or eval allowances, or other sites', () => {
    expect(csp).not.toMatch(/unsafe-inline|unsafe-eval|\*|https?:/)
  })

  it('sends no referrer, and does not let the browser guess types', () => {
    expect(headersFile).toMatch(/Referrer-Policy:\s*no-referrer/)
    expect(headersFile).toMatch(/X-Content-Type-Options:\s*nosniff/)
  })

  it('is the same on Vercel as on Netlify and Cloudflare Pages', () => {
    const vercel = JSON.parse(read('vercel.json'))
    const rules: { key: string; value: string }[] = vercel.headers.find(
      (h: { source: string }) => h.source === '/(.*)',
    ).headers
    const value = (key: string) => rules.find((r) => r.key === key)?.value

    expect(value('Content-Security-Policy')).toBe(csp)
    for (const key of [
      'Referrer-Policy',
      'X-Content-Type-Options',
      'Permissions-Policy',
      'Cross-Origin-Opener-Policy',
    ]) {
      const fromFile = new RegExp(`${key}:\\s*(.+)`)
        .exec(headersFile)?.[1]
        .trim()
      expect(value(key), key).toBe(fromFile)
    }
  })

  it('shows the app for every address, so a refresh or a shared link works', () => {
    expect(read('public/_redirects')).toMatch(
      /^\/\*\s+\/index\.html\s+200\s*$/m,
    )
    const vercel = JSON.parse(read('vercel.json'))
    expect(vercel.rewrites).toContainEqual({
      source: '/(.*)',
      destination: '/index.html',
    })
  })

  it('caches the fingerprinted files for a year, and nothing else', () => {
    expect(headersFile).toMatch(
      /\/assets\/\*\s+Cache-Control:\s*public, max-age=31536000, immutable/,
    )
  })

  it('has the files it needs', () => {
    for (const file of [
      'public/_headers',
      'public/_redirects',
      'vercel.json',
    ]) {
      expect(existsSync(join(root, file)), file).toBe(true)
    }
  })
})
