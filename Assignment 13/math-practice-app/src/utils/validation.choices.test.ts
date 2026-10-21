import { describe, expect, it } from 'vitest'
import type { Question } from '../types/question'
import {
  isValidQuestion,
  validateQuestion,
  validateQuestionChoices,
} from './validation'

function question(overrides: Partial<Question> = {}): Question {
  return {
    id: 'q1',
    operation: 'multiplication',
    firstOperand: 4,
    secondOperand: 5,
    displayText: '4 × 5 = ?',
    correctAnswer: 20,
    choices: [15, 20, 24, 25],
    difficulty: 1,
    source: 'regular',
    ...overrides,
  }
}

describe('validateQuestionChoices', () => {
  it('accepts four different choices that include the right answer', () => {
    expect(validateQuestionChoices(question())).toEqual([])
    expect(isValidQuestion(question())).toBe(true)
  })

  it('requires exactly four choices', () => {
    expect(
      validateQuestionChoices(question({ choices: [20, 21, 22] })),
    ).toContain('There must be exactly 4 answer choices')
    expect(
      validateQuestionChoices(question({ choices: [20, 21, 22, 23, 24] })),
    ).toContain('There must be exactly 4 answer choices')
  })

  it('requires every choice to be different', () => {
    expect(
      validateQuestionChoices(question({ choices: [20, 21, 21, 22] })),
    ).toContain('Answer choices must all be different')
  })

  it('requires the right answer to appear exactly once', () => {
    expect(
      validateQuestionChoices(question({ choices: [10, 11, 12, 13] })),
    ).toContain('Exactly one answer choice must be the correct answer')
    expect(
      validateQuestionChoices(question({ choices: [20, 20, 12, 13] })),
    ).toContain('Exactly one answer choice must be the correct answer')
  })

  it('rejects negative or fractional choices', () => {
    const message = 'Answer choices must be whole numbers that are not negative'
    expect(
      validateQuestionChoices(question({ choices: [20, -1, 22, 23] })),
    ).toContain(message)
    expect(
      validateQuestionChoices(question({ choices: [20, 21.5, 22, 23] })),
    ).toContain(message)
  })
})

describe('validateQuestion', () => {
  it('reports problems with the arithmetic and the choices together', () => {
    const problems = validateQuestion(
      question({ correctAnswer: 21, choices: [20, 20, 22, 23] }),
    )
    expect(problems).toContain('Correct answer does not match the operands')
    expect(problems).toContain('Answer choices must all be different')
  })
})
