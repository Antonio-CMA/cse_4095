import type { DifficultyLevel } from '../types/question'
import type { Range } from '../utils/math'

/** Number ranges for each operation at each difficulty level (spec §7). */

export interface AdditionRule {
  operand: Range
  maxResult: number
}

export interface SubtractionRule {
  operand: Range
}

export interface FactorRule {
  first: Range
  second: Range
}

export interface DivisionRule {
  divisor: Range
  quotient: Range
  maxDividend: number
}

export const ADDITION_RULES: Record<DifficultyLevel, AdditionRule> = {
  1: { operand: { min: 0, max: 10 }, maxResult: 20 },
  2: { operand: { min: 0, max: 50 }, maxResult: 100 },
  3: { operand: { min: 0, max: 100 }, maxResult: 200 },
  4: { operand: { min: 10, max: 1000 }, maxResult: 2000 },
}

export const SUBTRACTION_RULES: Record<DifficultyLevel, SubtractionRule> = {
  1: { operand: { min: 0, max: 10 } },
  2: { operand: { min: 0, max: 50 } },
  3: { operand: { min: 0, max: 100 } },
  4: { operand: { min: 10, max: 1000 } },
}

/** Each level lists one or more shapes; one is picked at random per question. */
export const MULTIPLICATION_RULES: Record<DifficultyLevel, FactorRule[]> = {
  1: [{ first: { min: 0, max: 5 }, second: { min: 0, max: 5 } }],
  2: [{ first: { min: 0, max: 10 }, second: { min: 0, max: 10 } }],
  3: [
    // one digit × one digit
    { first: { min: 2, max: 9 }, second: { min: 2, max: 9 } },
    // one digit × two digits
    { first: { min: 2, max: 9 }, second: { min: 10, max: 99 } },
  ],
  4: [
    // two digits × one digit
    { first: { min: 10, max: 99 }, second: { min: 2, max: 9 } },
    // two digits × two digits
    { first: { min: 10, max: 99 }, second: { min: 10, max: 99 } },
  ],
}

export const DIVISION_RULES: Record<DifficultyLevel, DivisionRule> = {
  1: {
    divisor: { min: 1, max: 5 },
    quotient: { min: 1, max: 5 },
    maxDividend: 25,
  },
  2: {
    divisor: { min: 1, max: 10 },
    quotient: { min: 1, max: 10 },
    maxDividend: 100,
  },
  3: {
    divisor: { min: 1, max: 12 },
    quotient: { min: 1, max: 12 },
    maxDividend: 144,
  },
  4: {
    divisor: { min: 2, max: 99 },
    quotient: { min: 2, max: 50 },
    maxDividend: 1000,
  },
}
