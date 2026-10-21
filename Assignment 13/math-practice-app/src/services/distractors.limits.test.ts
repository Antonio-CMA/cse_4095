import { describe, expect, it } from 'vitest'
import { seededRng } from '../test/rng'
import type { QuestionDraft } from '../types/question'
import { generateDistractors } from './distractors'

const ZERO: QuestionDraft = {
  id: 'q',
  operation: 'addition',
  firstOperand: 0,
  secondOperand: 0,
  displayText: '0 + 0 = ?',
  correctAnswer: 0,
  difficulty: 1,
  source: 'regular',
}

describe('generateDistractors at the edges', () => {
  it('finds three wrong answers even for an answer of 0 (nothing below it)', () => {
    for (let seed = 0; seed < 50; seed++) {
      const wrong = generateDistractors(ZERO, seededRng(seed))
      expect(wrong).toHaveLength(3)
      expect(new Set(wrong).size).toBe(3)
      expect(wrong.every((n) => Number.isInteger(n) && n > 0)).toBe(true)
    }
  })

  it('can give more than three when asked, by searching outwards', () => {
    const wrong = generateDistractors(ZERO, seededRng(1), 20)
    expect(wrong).toHaveLength(20)
    expect(new Set(wrong).size).toBe(20)
    expect(wrong).not.toContain(0)
  })

  it('gives up with a clear error, rather than looping, when there cannot be enough', () => {
    // Only 0 and the numbers above it exist, and the search is bounded.
    expect(() => generateDistractors(ZERO, seededRng(1), 500)).toThrow(
      /Could not find 500 wrong answers for 0 \+ 0 = \?/,
    )
  })
})
