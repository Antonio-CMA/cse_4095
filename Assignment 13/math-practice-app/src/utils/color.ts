/** Colour maths for checking contrast against WCAG. */

/** Parses "#rgb" or "#rrggbb" into [r, g, b] (0–255), or null if it is not a hex colour. */
export function parseHexColor(hex: string): [number, number, number] | null {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!match) return null
  const digits =
    match[1].length === 3
      ? match[1]
          .split('')
          .map((c) => c + c)
          .join('')
      : match[1]
  return [
    parseInt(digits.slice(0, 2), 16),
    parseInt(digits.slice(2, 4), 16),
    parseInt(digits.slice(4, 6), 16),
  ]
}

function channel(value: number): number {
  const s = value / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

/** Relative luminance of a colour, 0 (black) to 1 (white). */
export function relativeLuminance([r, g, b]: [number, number, number]): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/**
 * The WCAG contrast ratio between two hex colours, from 1 (identical) to 21
 * (black on white). Throws if either is not a hex colour.
 */
export function contrastRatio(a: string, b: string): number {
  const first = parseHexColor(a)
  const second = parseHexColor(b)
  if (!first || !second) throw new Error(`Not a hex colour: ${a} / ${b}`)
  const [light, dark] = [
    relativeLuminance(first),
    relativeLuminance(second),
  ].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

/** WCAG AA: 4.5:1 for normal text, 3:1 for large text and UI components. */
export const AA_TEXT = 4.5
export const AA_LARGE_TEXT_OR_UI = 3
