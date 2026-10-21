import { describe, expect, it } from 'vitest'
import type { DifficultyLevel, MathOperation } from '../types/question'
import { calculateAnswer } from '../utils/math'
import { validateQuestion, validateQuestionChoices } from '../utils/validation'
import {
  createFallbackQuestion,
  createFallbackReviewQuestion,
  fallbackChoices,
  FALLBACK_PROBLEMS,
} from './fallbackQuestions'

const OPERATIONS: MathOperation[] = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
]
const LEVELS: DifficultyLevel[] = [1, 2, 3, 4]
const EVERY = OPERATIONS.flatMap((op) =>
  LEVELS.map((level) => [op, level] as const),
)

describe('the ready-made questions', () => {
  it.each(EVERY)(
    'a %s question at level %i passes every check a real one does',
    (operation, level) => {
      const question = createFallbackQuestion(operation, level)
      expect(validateQuestion(question)).toEqual([])
      expect(question.operation).toBe(operation)
      expect(question.difficulty).toBe(level)
      expect(question.source).toBe('regular')
    },
  )

  it.each(EVERY)(
    'the answer to %s at level %i really is right',
    (op, level) => {
      const { first, second, answer } = FALLBACK_PROBLEMS[op][level]
      expect(calculateAnswer(op, first, second)).toBe(answer)
    },
  )

  it('shows the question in the usual format', () => {
    expect(createFallbackQuestion('multiplication', 3).displayText).toBe(
      '7 × 8 = ?',
    )
    expect(createFallbackQuestion('division', 1).displayText).toBe('12 ÷ 3 = ?')
  })

  it('gives each question its own id', () => {
    expect(createFallbackQuestion('addition', 1).id).not.toBe(
      createFallbackQuestion('addition', 1).id,
    )
  })
})

describe('fallbackChoices', () => {
  it('always gives four different whole numbers including the answer', () => {
    for (let answer = 0; answer <= 500; answer++) {
      const choices = fallbackChoices(answer)
      expect(
        validateQuestionChoices({ choices, correctAnswer: answer }),
      ).toEqual([])
    }
  })

  it('does not always put the right answer in the same place', () => {
    const places = new Set(
      [0, 1, 2, 3].map((answer) => fallbackChoices(answer).indexOf(answer)),
    )
    expect(places.size).toBe(4)
  })
})

describe('createFallbackReviewQuestion', () => {
  const pattern = {
    id: 'multiplication:8:7:L2',
    operation: 'multiplication' as const,
    firstOperand: 8,
    secondOperand: 7,
    correctAnswer: 56,
    difficulty: 2 as const,
  }

  it('asks the mistake again, credited to its pattern', () => {
    const question = createFallbackReviewQuestion(pattern)
    expect(question).toMatchObject({
      displayText: '8 × 7 = ?',
      correctAnswer: 56,
      source: 'mistake-review',
      mistakePatternId: 'multiplication:8:7:L2',
      difficulty: 2,
    })
    expect(validateQuestionChoices(question)).toEqual([])
  })
})
