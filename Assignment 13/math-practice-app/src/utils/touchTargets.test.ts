/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Keeps things easy to tap on a phone or tablet. It reads the real stylesheet,
 * so shrinking a button below the recommended size (44 CSS pixels, WCAG 2.5.5)
 * makes this fail.
 */
const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')

const MIN_TARGET_PX = 44
// The page sets its base size to 1.125rem, so 1rem is 18px on a normal browser.
const REM_PX = 18

function escape(selector: string): string {
  return selector.replace(/[.*+?^${}()|[\]\\:'=-]/g, '\\$&')
}

/** The declarations of the first top-level rule for a selector. */
function rule(selector: string): string {
  const match = new RegExp(
    `(?:^|\\n)${escape(selector)}\\s*\\{([^}]*)\\}`,
  ).exec(css)
  if (!match) throw new Error(`Rule ${selector} not found in index.css`)
  return match[1]
}

/** Everything inside the first `@media` block that starts with `query`. */
function media(query: string): string {
  const start = css.indexOf(`@media ${query} {`)
  if (start < 0) throw new Error(`@media ${query} not found in index.css`)
  const end = css.indexOf('\n}\n', start)
  return css.slice(start, end)
}

function minHeightPx(declarations: string): number {
  const match = /min-height:\s*([\d.]+)(px|rem)/.exec(declarations)
  if (!match) throw new Error(`No min-height in: ${declarations}`)
  return Number(match[1]) * (match[2] === 'rem' ? REM_PX : 1)
}

describe('touch target sizes', () => {
  it.each([
    '.btn',
    '.main-nav__link',
    '.nav-toggle',
    '.app-header__title',
    '.app-footer a',
    '.answer-choice',
    '.settings-select',
    '.choice__body',
    '.mistake-mastered summary',
  ])('%s is at least 44px tall', (selector) => {
    expect(minHeightPx(rule(selector))).toBeGreaterThanOrEqual(MIN_TARGET_PX)
  })

  it('gives touch screens even more room for buttons and links', () => {
    const coarse = media('(pointer: coarse)')
    expect(coarse).toMatch(/\.btn\s*\{[^}]*min-height:\s*5[6-9]px/)
    expect(coarse).toMatch(/\.main-nav__link[^{]*\{[^}]*min-height:\s*48px/)
  })

  it('makes the answer tiles bigger again on tablets', () => {
    const tablet = media('(min-width: 700px)')
    const match = /\.answer-choice\s*\{[^}]*min-height:\s*(\d+)px/.exec(tablet)
    expect(Number(match?.[1])).toBeGreaterThan(
      minHeightPx(rule('.answer-choice')),
    )
  })
})

describe('the small-screen menu', () => {
  it('is hidden until the screen is narrow', () => {
    expect(rule('.nav-toggle')).toMatch(/display:\s*none/)
    expect(media('(max-width: 600px)')).toMatch(
      /\.nav-toggle\s*\{[^}]*display:\s*inline-flex/,
    )
  })

  it('folds the links away only on narrow screens, and shows them when open', () => {
    expect(rule('.main-nav__list')).not.toMatch(/display:\s*none/)
    const narrow = media('(max-width: 600px)')
    expect(narrow).toMatch(/\.main-nav\s*\{[^}]*display:\s*none/)
    expect(narrow).toMatch(/\.main-nav--open\s*\{[^}]*display:\s*block/)
  })
})

describe('the practice card on larger screens', () => {
  it('stays a comfortable reading width and centred', () => {
    const declarations = rule('.practice-session')
    expect(declarations).toMatch(/max-width:\s*\d+rem/)
    expect(declarations).toMatch(/margin:\s*0 auto/)
  })
})
