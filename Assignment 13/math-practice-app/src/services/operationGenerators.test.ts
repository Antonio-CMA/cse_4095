import { describe, expect, it } from 'vitest'
import { seededRng, sequenceRng } from '../test/rng'
import type { DifficultyLevel } from '../types/question'
import {
  ADDITION_RULES,
  DIVISION_RULES,
  MULTIPLICATION_RULES,
  SUBTRACTION_RULES,
} from './difficultyRules'
import {
  generateAddition,
  generateDivision,
  generateMultiplication,
  generateSubtraction,
  OPERATION_GENERATORS,
} from './operationGenerators'

const LEVELS: DifficultyLevel[] = [1, 2, 3, 4]
const SAMPLES = 500

function between(n: number, min: number, max: number) {
  return n >= min && n <= max
}

describe.each(LEVELS)('addition at level %i', (level) => {
  const rule = ADDITION_RULES[level]
  const rng = seededRng(level)

  it('keeps operands in range and results under the limit', () => {
    let largestResult = 0
    for (let i = 0; i < SAMPLES; i++) {
      const q = generateAddition(level, rng)
      expect(between(q.firstOperand, rule.operand.min, rule.operand.max)).toBe(
        true,
      )
      expect(between(q.secondOperand, rule.operand.min, rule.operand.max)).toBe(
        true,
      )
      expect(q.correctAnswer).toBe(q.firstOperand + q.secondOperand)
      expect(q.correctAnswer).toBeLessThanOrEqual(rule.maxResult)
      largestResult = Math.max(largestResult, q.correctAnswer)
    }
    expect(largestResult).toBeGreaterThan(rule.maxResult / 2)
  })
})

describe('addition', () => {
  it('builds a complete question object', () => {
    const q = generateAddition(1, sequenceRng([0.5, 0.99]))
    expect(q).toMatchObject({
      operation: 'addition',
      firstOperand: 5,
      secondOperand: 10,
      correctAnswer: 15,
      displayText: '5 + 10 = ?',
      difficulty: 1,
      source: 'regular',
    })
    expect(q.id).toMatch(/\S+/)
  })

  it('reaches the minimum and maximum operand values', () => {
    expect(generateAddition(1, () => 0)).toMatchObject({
      firstOperand: 0,
      secondOperand: 0,
    })
    expect(generateAddition(1, () => 0.999999)).toMatchObject({
      firstOperand: 10,
      secondOperand: 10,
      correctAnswer: 20,
    })
  })

  it('stays within the spec limits for results', () => {
    expect(ADDITION_RULES[1].maxResult).toBe(20)
    expect(ADDITION_RULES[2].maxResult).toBe(100)
  })
})

describe.each(LEVELS)('subtraction at level %i', (level) => {
  const rule = SUBTRACTION_RULES[level]
  const rng = seededRng(level + 10)

  it('never goes negative and stays in range', () => {
    for (let i = 0; i < SAMPLES; i++) {
      const q = generateSubtraction(level, rng)
      expect(q.firstOperand).toBeGreaterThanOrEqual(q.secondOperand)
      expect(q.correctAnswer).toBe(q.firstOperand - q.secondOperand)
      expect(q.correctAnswer).toBeGreaterThanOrEqual(0)
      expect(between(q.firstOperand, rule.operand.min, rule.operand.max)).toBe(
        true,
      )
      expect(between(q.secondOperand, rule.operand.min, rule.operand.max)).toBe(
        true,
      )
    }
  })
})

describe('subtraction', () => {
  it('puts the larger number first and formats the question', () => {
    const q = generateSubtraction(1, sequenceRng([0.2, 0.9]))
    expect(q).toMatchObject({
      operation: 'subtraction',
      firstOperand: 9,
      secondOperand: 2,
      correctAnswer: 7,
      displayText: '9 − 2 = ?',
    })
  })

  it('can produce an answer of zero', () => {
    expect(generateSubtraction(1, () => 0).correctAnswer).toBe(0)
  })
})

describe.each(LEVELS)('multiplication at level %i', (level) => {
  const shapes = MULTIPLICATION_RULES[level]
  const rng = seededRng(level + 20)

  it('uses factors that match one of the level shapes', () => {
    for (let i = 0; i < SAMPLES; i++) {
      const q = generateMultiplication(level, rng)
      expect(q.correctAnswer).toBe(q.firstOperand * q.secondOperand)
      expect(
        shapes.some(
          (s) =>
            between(q.firstOperand, s.first.min, s.first.max) &&
            between(q.secondOperand, s.second.min, s.second.max),
        ),
      ).toBe(true)
    }
  })
})

describe('multiplication', () => {
  it('formats the question with the × sign', () => {
    // level 2 has a single shape: draw 1 picks it, then 7 and 8.
    const q = generateMultiplication(2, sequenceRng([0, 0.7, 0.75]))
    expect(q).toMatchObject({
      operation: 'multiplication',
      firstOperand: 7,
      secondOperand: 8,
      correctAnswer: 56,
      displayText: '7 × 8 = ?',
    })
  })

  it('level 1 only uses factors 0 to 5', () => {
    const rng = seededRng(99)
    for (let i = 0; i < SAMPLES; i++) {
      const q = generateMultiplication(1, rng)
      expect(q.firstOperand).toBeLessThanOrEqual(5)
      expect(q.secondOperand).toBeLessThanOrEqual(5)
    }
  })

  it('levels 3 and 4 produce both one-/two-digit shapes over time', () => {
    const rng = seededRng(5)
    const seen3 = new Set<string>()
    const seen4 = new Set<string>()
    for (let i = 0; i < SAMPLES; i++) {
      const a = generateMultiplication(3, rng)
      seen3.add(a.secondOperand >= 10 ? 'two-digit' : 'one-digit')
      const b = generateMultiplication(4, rng)
      seen4.add(b.secondOperand >= 10 ? 'two-digit' : 'one-digit')
    }
    expect(seen3.size).toBe(2)
    expect(seen4.size).toBe(2)
  })
})

describe.each(LEVELS)('division at level %i', (level) => {
  const rule = DIVISION_RULES[level]
  const rng = seededRng(level + 30)

  it('always has a non-zero divisor and a whole-number answer', () => {
    for (let i = 0; i < SAMPLES; i++) {
      const q = generateDivision(level, rng)
      expect(q.secondOperand).toBeGreaterThanOrEqual(1)
      expect(q.firstOperand % q.secondOperand).toBe(0)
      expect(Number.isInteger(q.correctAnswer)).toBe(true)
      expect(q.correctAnswer).toBe(q.firstOperand / q.secondOperand)
      expect(between(q.secondOperand, rule.divisor.min, rule.divisor.max)).toBe(
        true,
      )
      expect(
        between(q.correctAnswer, rule.quotient.min, rule.quotient.max),
      ).toBe(true)
      expect(q.firstOperand).toBeLessThanOrEqual(rule.maxDividend)
    }
  })
})

describe('division', () => {
  it('builds the dividend from the divisor and the answer', () => {
    const q = generateDivision(1, sequenceRng([0.5, 0.5]))
    expect(q).toMatchObject({
      operation: 'division',
      firstOperand: 9,
      secondOperand: 3,
      correctAnswer: 3,
      displayText: '9 ÷ 3 = ?',
    })
  })

  it('never divides by zero, even at the lowest random value', () => {
    for (const level of LEVELS) {
      expect(generateDivision(level, () => 0).secondOperand).toBeGreaterThan(0)
    }
  })

  it('keeps the dividend within the limit at the highest random value', () => {
    for (const level of LEVELS) {
      const q = generateDivision(level, () => 0.999999)
      expect(q.firstOperand).toBeLessThanOrEqual(
        DIVISION_RULES[level].maxDividend,
      )
    }
  })
})

describe('OPERATION_GENERATORS', () => {
  it('has a generator for each operation', () => {
    for (const operation of [
      'addition',
      'subtraction',
      'multiplication',
      'division',
    ] as const) {
      expect(OPERATION_GENERATORS[operation](1).operation).toBe(operation)
    }
  })

  it('gives every question its own id', () => {
    const ids = new Set(
      Array.from({ length: 100 }, () => generateAddition(1).id),
    )
    expect(ids.size).toBe(100)
  })
})
