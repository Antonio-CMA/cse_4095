import { describe, expect, it } from 'vitest'
import {
  AA_LARGE_TEXT_OR_UI,
  AA_TEXT,
  contrastRatio,
  parseHexColor,
  relativeLuminance,
} from './color'

describe('parseHexColor', () => {
  it('reads 6-digit and 3-digit hex colours, in any case', () => {
    expect(parseHexColor('#ffffff')).toEqual([255, 255, 255])
    expect(parseHexColor('#3B5BDB')).toEqual([59, 91, 219])
    expect(parseHexColor('#fff')).toEqual([255, 255, 255])
    expect(parseHexColor('#0a0')).toEqual([0, 170, 0])
  })

  it('returns null for anything else', () => {
    for (const bad of [
      'white',
      '#ffff',
      '#gggggg',
      'ffffff',
      '',
      'rgb(0,0,0)',
    ]) {
      expect(parseHexColor(bad)).toBeNull()
    }
  })
})

describe('relativeLuminance', () => {
  it('is 0 for black and 1 for white', () => {
    expect(relativeLuminance([0, 0, 0])).toBe(0)
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 5)
  })

  it('weights green most and blue least', () => {
    expect(relativeLuminance([0, 255, 0])).toBeGreaterThan(
      relativeLuminance([255, 0, 0]),
    )
    expect(relativeLuminance([255, 0, 0])).toBeGreaterThan(
      relativeLuminance([0, 0, 255]),
    )
  })
})

describe('contrastRatio', () => {
  it('is 21 for black on white, and the same either way round', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 5)
  })

  it('is 1 for identical colours', () => {
    expect(contrastRatio('#3b5bdb', '#3b5bdb')).toBeCloseTo(1, 5)
  })

  it('matches known values', () => {
    // Computed independently with the WCAG formula.
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 1)
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 1)
  })

  it('throws a clear error for a colour it cannot read', () => {
    expect(() => contrastRatio('blue', '#fff')).toThrow(/Not a hex colour/)
  })

  it('exposes the AA thresholds', () => {
    expect(AA_TEXT).toBe(4.5)
    expect(AA_LARGE_TEXT_OR_UI).toBe(3)
  })
})
