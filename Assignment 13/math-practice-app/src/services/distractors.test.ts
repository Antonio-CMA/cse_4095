import { describe, expect, it } from 'vitest'
import { seededRng } from '../test/rng'
import type {
  DifficultyLevel,
  MathOperation,
  QuestionDraft,
} from '../types/question'
import { DISTRACTOR_COUNT, generateDistractors } from './distractors'
import { generateQuestionDraft } from './questionGenerator'

const OPERATIONS: MathOperation[] = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
]
const LEVELS: DifficultyLevel[] = [1, 2, 3, 4]

function draft(
  operation: MathOperation,
  firstOperand: number,
  secondOperand: number,
  correctAnswer: number,
  difficulty: DifficultyLevel = 2,
): QuestionDraft {
  return {
    id: 'q',
    operation,
    firstOperand,
    secondOperand,
    displayText: `${firstOperand} ? ${secondOperand}`,
    correctAnswer,
    difficulty,
    source: 'regular',
  }
}

function expectGoodDistractors(question: QuestionDraft, wrong: number[]) {
  const c = question.correctAnswer
  expect(wrong).toHaveLength(DISTRACTOR_COUNT)
  expect(new Set(wrong).size).toBe(DISTRACTOR_COUNT)
  for (const n of wrong) {
    expect(Number.isInteger(n)).toBe(true) // whole numbers only
    expect(n).toBeGreaterThanOrEqual(0) // never negative
    expect(n).not.toBe(c) // never the right answer
    // close enough to be believable
    expect(Math.abs(n - c)).toBeLessThanOrEqual(Math.max(10, Math.ceil(c / 2)))
  }
}

describe.each(OPERATIONS)('generateDistractors for %s', (operation) => {
  it.each(LEVELS)('gives three valid wrong answers at level %i', (level) => {
    const rng = seededRng(level * 7)
    for (let i = 0; i < 300; i++) {
      const q = generateQuestionDraft(operation, level, rng)
      expectGoodDistractors(q, generateDistractors(q, rng))
    }
  })
})

describe('generateDistractors edge cases', () => {
  it('copes with an answer of zero (no negative choices)', () => {
    const q = draft('multiplication', 0, 5, 0)
    const rng = seededRng(1)
    for (let i = 0; i < 100; i++)
      expectGoodDistractors(q, generateDistractors(q, rng))
  })

  it('copes with the smallest division answer', () => {
    const q = draft('division', 5, 5, 1, 1)
    const rng = seededRng(2)
    for (let i = 0; i < 100; i++)
      expectGoodDistractors(q, generateDistractors(q, rng))
  })

  it('copes with very large answers', () => {
    const q = draft('multiplication', 99, 99, 9801, 4)
    const rng = seededRng(3)
    for (let i = 0; i < 100; i++)
      expectGoodDistractors(q, generateDistractors(q, rng))
  })

  it('always finishes quickly, even for awkward questions', () => {
    const q = draft('subtraction', 0, 0, 0, 1)
    expectGoodDistractors(q, generateDistractors(q, seededRng(4)))
  })

  it('is repeatable with the same seed', () => {
    const q = draft('multiplication', 8, 7, 56)
    expect(generateDistractors(q, seededRng(9))).toEqual(
      generateDistractors(q, seededRng(9)),
    )
  })
})

describe('operation-specific distractors', () => {
  function seen(q: QuestionDraft, samples = 400) {
    const rng = seededRng(77)
    const all = new Set<number>()
    for (let i = 0; i < samples; i++) {
      for (const n of generateDistractors(q, rng)) all.add(n)
    }
    return all
  }

  it('multiplication uses neighbouring times-table facts (8 × 7)', () => {
    const wrong = seen(draft('multiplication', 8, 7, 56))
    for (const expected of [48, 49, 63, 64])
      expect(wrong.has(expected)).toBe(true)
    expect(wrong.has(56)).toBe(false)
  })

  it('addition includes carrying slips (27 + 38)', () => {
    const wrong = seen(draft('addition', 27, 38, 65))
    expect(wrong.has(75)).toBe(true) // carried when they should not have
    expect(wrong.has(55)).toBe(true) // forgot to carry
  })

  it('subtraction includes adding by mistake (9 − 4)', () => {
    const wrong = seen(draft('subtraction', 9, 4, 5, 1))
    expect(wrong.has(13)).toBe(true)
  })

  it('division stays within the same fact family (56 ÷ 7)', () => {
    const wrong = seen(draft('division', 56, 7, 8))
    expect(wrong.has(7)).toBe(true) // the divisor
    expect(wrong.has(9)).toBe(true)
    expect(wrong.has(8)).toBe(false)
  })
})
