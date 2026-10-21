import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vitest/config'

/**
 * The security headers the site is hosted with, as written in `public/_headers`
 * (the file Netlify and Cloudflare Pages read; `vercel.json` repeats them).
 * Serving them from `npm run preview` too means the production build can be
 * tried locally under exactly the rules it will run under.
 */
function securityHeaders(): Record<string, string> {
  const text = readFileSync('public/_headers', 'utf8')
  const everything = text.split(/\n\s*\n/)[0] // the block for "/*"
  const headers: Record<string, string> = {}
  for (const line of everything.split('\n').slice(1)) {
    const colon = line.indexOf(':')
    if (colon > 0)
      headers[line.slice(0, colon).trim()] = line.slice(colon + 1).trim()
  }
  return headers
}

/**
 * For a host that cannot send headers (GitHub Pages): build with
 * VITE_META_CSP=1 and the same Content-Security-Policy and no-referrer rule are
 * written into the page itself. A page cannot set `frame-ancestors` this way
 * (browsers ignore it there and complain), so that one directive is left out.
 */
function metaSecurity(): Plugin {
  const headers = securityHeaders()
  const policy = headers['Content-Security-Policy']
    .split(';')
    .map((directive) => directive.trim())
    .filter(
      (directive) => directive && !directive.startsWith('frame-ancestors'),
    )
    .join('; ')
  return {
    name: 'meta-security',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: policy },
        injectTo: 'head-prepend',
      },
      {
        tag: 'meta',
        attrs: { name: 'referrer', content: 'no-referrer' },
        injectTo: 'head-prepend',
      },
    ],
  }
}

const useMetaSecurity = process.env.VITE_META_CSP === '1'

// https://vite.dev/config/
export default defineConfig({
  // Where the site lives. "/" for a site of its own; set VITE_BASE=/folder/ to
  // host it below one (for example on GitHub Pages).
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), ...(useMetaSecurity ? [metaSecurity()] : [])],
  // Without headers when trying the page-embedded version, so that is what is
  // really being tested.
  preview: { headers: useMetaSecurity ? {} : securityHeaders() },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // Some page tests click through many questions, which is slow when the
    // whole suite runs in parallel.
    testTimeout: 20000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        // Test helpers, type-only files and the program entry point.
        'src/test/**',
        'src/types/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
      reporter: ['text-summary', 'text', 'html'],
    },
  },
})
