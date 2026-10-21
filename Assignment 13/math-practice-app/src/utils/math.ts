import type { MathOperation } from '../types/question'

/** A source of random numbers in [0, 1). Inject one to make tests repeatable. */
export type Rng = () => number

export interface Range {
  min: number
  max: number
}

/** A random whole number from min to max, both included. */
export function randomInt(min: number, max: number, rng: Rng = Math.random) {
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    throw new RangeError(`randomInt needs whole numbers, got ${min} and ${max}`)
  }
  if (min > max) {
    throw new RangeError(`randomInt min (${min}) is greater than max (${max})`)
  }
  return Math.floor(rng() * (max - min + 1)) + min
}

export function randomInRange(range: Range, rng: Rng = Math.random) {
  return randomInt(range.min, range.max, rng)
}

/**
 * Percent correct as a whole number (0–100), or null when nothing has been
 * attempted yet so there is nothing to measure (and nothing to divide by).
 */
export function calculateAccuracy(
  correct: number,
  attempted: number,
): number | null {
  if (attempted <= 0) return null
  return Math.round((correct / attempted) * 100)
}

export const OPERATION_SYMBOLS: Record<MathOperation, string> = {
  addition: '+',
  subtraction: '−',
  multiplication: '×',
  division: '÷',
}

/** The result of `first <operation> second`. Division is exact, not rounded. */
export function calculateAnswer(
  operation: MathOperation,
  first: number,
  second: number,
): number {
  switch (operation) {
    case 'addition':
      return first + second
    case 'subtraction':
      return first - second
    case 'multiplication':
      return first * second
    case 'division':
      return first / second
  }
}
