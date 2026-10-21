/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { AA_LARGE_TEXT_OR_UI, AA_TEXT, contrastRatio } from './color'

/**
 * Keeps the site's colours accessible. It reads the real stylesheet, so if a
 * colour is changed to something that is hard to see, this fails.
 */
// Tests run from the project folder, so the stylesheet is at src/index.css.
const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')
const cssWithoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '')

function token(name: string): string {
  const match = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,6})`).exec(css)
  if (!match) throw new Error(`Colour token --${name} not found in index.css`)
  return match[1]
}

/** The declarations inside the first rule for a selector, e.g. ".answer-choice". */
function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`).exec(css)
  if (!match) throw new Error(`Rule ${selector} not found in index.css`)
  return match[1]
}

const text = token('color-text')
const bg = token('color-bg')
const surface = token('color-surface')
const primary = token('color-primary')
const primaryDark = token('color-primary-dark')
const soft = token('color-primary-soft')
const strongBorder = token('color-border-strong')
const focus = token('color-focus')
const backgrounds = { page: bg, panel: surface, 'soft panel': soft }

describe('text contrast (WCAG AA, 4.5:1)', () => {
  it.each(Object.entries(backgrounds))(
    'body text on the %s',
    (_name, background) => {
      expect(contrastRatio(text, background)).toBeGreaterThanOrEqual(AA_TEXT)
    },
  )

  it.each(Object.entries(backgrounds))(
    'links and accents on the %s',
    (_name, background) => {
      expect(contrastRatio(primaryDark, background)).toBeGreaterThanOrEqual(
        AA_TEXT,
      )
    },
  )

  it('white text on a primary button', () => {
    expect(contrastRatio('#ffffff', primary)).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it('text in a disabled choice tile', () => {
    // These two literals are used by .choice--disabled; check they are still there.
    expect(css).toContain('#4a5160')
    expect(css).toContain('#eef0f6')
    expect(contrastRatio('#4a5160', '#eef0f6')).toBeGreaterThanOrEqual(AA_TEXT)
  })
})

describe('non-text contrast (WCAG AA, 3:1)', () => {
  it.each(Object.entries(backgrounds))(
    'the edge of tiles, answers and fields on the %s',
    (_name, background) => {
      expect(contrastRatio(strongBorder, background)).toBeGreaterThanOrEqual(
        AA_LARGE_TEXT_OR_UI,
      )
    },
  )

  it.each(Object.entries(backgrounds))(
    'the focus ring on the %s',
    (_name, background) => {
      expect(contrastRatio(focus, background)).toBeGreaterThanOrEqual(
        AA_LARGE_TEXT_OR_UI,
      )
    },
  )

  it.each(Object.entries({ panel: surface, 'soft panel': soft }))(
    'the selected-state border on the %s',
    (_name, background) => {
      expect(contrastRatio(primary, background)).toBeGreaterThanOrEqual(
        AA_LARGE_TEXT_OR_UI,
      )
    },
  )
})

describe('the layout stays inside a small screen (WCAG reflow)', () => {
  it('caps every grid column minimum at the width available', () => {
    const minimums = [...css.matchAll(/minmax\((min\([^)]*\)|[^,]+),/g)].map(
      (m) => m[1].trim(),
    )
    expect(minimums.length).toBeGreaterThan(0)
    for (const minimum of minimums) {
      // e.g. "min(13rem, 100%)": a column never needs more than the page has.
      expect(minimum).toMatch(/^min\(.+,\s*100%\)$/)
    }
  })

  it('lets the children of page-level grids shrink', () => {
    for (const selector of [
      '.stats-sections > *',
      '.settings-sections > *',
      '.setup-form > *',
    ]) {
      expect(css).toContain(selector)
    }
    expect(css).toMatch(/\.recent-sessions > \*\s*\{\s*min-width:\s*0/)
  })

  it('lets a long word break instead of widening the page', () => {
    expect(rule('body')).toContain('overflow-wrap: anywhere')
  })

  it('stacks the answers in one column on narrow screens', () => {
    expect(css).toMatch(
      /@media \(max-width: 480px\)\s*\{[^@]*\.answer-grid\s*\{[^}]*grid-template-columns:\s*1fr/,
    )
  })
})

describe('the stylesheet uses those colours where they matter', () => {
  it('draws the focus ring in the accessible focus colour, everywhere', () => {
    expect(rule(':focus-visible')).toContain('var(--color-focus)')
    expect(rule('.choice__input:focus-visible + .choice__body')).toContain(
      'var(--color-focus)',
    )
    expect(css).not.toMatch(/outline:\s*\d+px solid #/)
  })

  it.each(['.answer-choice', '.choice__body', '.settings-select', '.progress'])(
    'gives %s the strong border, not the faint panel border',
    (selector) => {
      const declarations = rule(selector)
      expect(declarations).toContain('var(--color-border-strong)')
      expect(declarations).not.toMatch(/border:[^;]*var\(--color-border\)/)
    },
  )

  it('never removes the focus outline without replacing it', () => {
    const removals = [
      ...cssWithoutComments.matchAll(/([^{}]+)\{[^}]*outline:\s*none[^}]*\}/g),
    ].map((m) => m[1].trim())
    // Only containers the app focuses itself (never by tabbing) may hide it.
    expect(removals.sort()).toEqual(
      [
        '.flip-card__face:focus',
        '.page-container:focus',
        "h1[tabindex='-1']:focus",
      ].sort(),
    )
  })
})
