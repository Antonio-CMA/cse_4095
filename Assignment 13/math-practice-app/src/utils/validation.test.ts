import { describe, expect, it } from 'vitest'
import type { QuestionDraft } from '../types/question'
import { isValidQuestionDraft, validateQuestionDraft } from './validation'

function draft(overrides: Partial<QuestionDraft> = {}): QuestionDraft {
  return {
    id: 'q1',
    operation: 'addition',
    firstOperand: 3,
    secondOperand: 4,
    displayText: '3 + 4 = ?',
    correctAnswer: 7,
    difficulty: 1,
    source: 'regular',
    ...overrides,
  }
}

describe('validateQuestionDraft', () => {
  it('accepts a good question for every operation', () => {
    expect(isValidQuestionDraft(draft())).toBe(true)
    expect(
      isValidQuestionDraft(
        draft({
          operation: 'subtraction',
          firstOperand: 9,
          secondOperand: 4,
          correctAnswer: 5,
        }),
      ),
    ).toBe(true)
    expect(
      isValidQuestionDraft(
        draft({
          operation: 'multiplication',
          firstOperand: 4,
          secondOperand: 5,
          correctAnswer: 20,
        }),
      ),
    ).toBe(true)
    expect(
      isValidQuestionDraft(
        draft({
          operation: 'division',
          firstOperand: 20,
          secondOperand: 4,
          correctAnswer: 5,
        }),
      ),
    ).toBe(true)
  })

  it('rejects an unsupported operation or difficulty', () => {
    expect(
      validateQuestionDraft(
        draft({ operation: 'modulo' as unknown as QuestionDraft['operation'] }),
      ),
    ).toEqual(['Unsupported operation: modulo'])
    expect(
      validateQuestionDraft(
        draft({ difficulty: 9 as unknown as QuestionDraft['difficulty'] }),
      ),
    ).toEqual(['Unsupported difficulty: 9'])
  })

  it('rejects an answer that does not match the operands', () => {
    expect(validateQuestionDraft(draft({ correctAnswer: 8 }))).toContain(
      'Correct answer does not match the operands',
    )
  })

  it('rejects non-whole numbers', () => {
    expect(
      validateQuestionDraft(
        draft({ firstOperand: 1.5, secondOperand: 1.5, correctAnswer: 3 }),
      ),
    ).toEqual(['Operands and answer must be whole numbers'])
  })

  it('rejects negative answers', () => {
    expect(
      validateQuestionDraft(
        draft({
          operation: 'subtraction',
          firstOperand: 2,
          secondOperand: 5,
          correctAnswer: -3,
        }),
      ),
    ).toContain('Answer must not be negative')
  })

  it('rejects division by zero and fractional division', () => {
    expect(
      validateQuestionDraft(
        draft({
          operation: 'division',
          firstOperand: 5,
          secondOperand: 0,
          correctAnswer: 0,
        }),
      ),
    ).toEqual(['Division by zero'])

    expect(
      validateQuestionDraft(
        draft({
          operation: 'division',
          firstOperand: 7,
          secondOperand: 2,
          correctAnswer: 3.5,
        }),
      ),
    ).toEqual(['Operands and answer must be whole numbers'])

    expect(
      validateQuestionDraft(
        draft({
          operation: 'division',
          firstOperand: 7,
          secondOperand: 2,
          correctAnswer: 4,
        }),
      ),
    ).toContain('Correct answer does not match the operands')
  })

  it('rejects questions outside the difficulty level', () => {
    expect(
      validateQuestionDraft(
        draft({ firstOperand: 30, secondOperand: 30, correctAnswer: 60 }),
      ),
    ).toContain('Operands are outside the difficulty range')
    expect(
      validateQuestionDraft(
        draft({
          operation: 'multiplication',
          firstOperand: 9,
          secondOperand: 9,
          correctAnswer: 81,
        }),
      ),
    ).toContain('Factors are outside the difficulty range')
    expect(
      validateQuestionDraft(
        draft({
          operation: 'division',
          firstOperand: 60,
          secondOperand: 6,
          correctAnswer: 10,
        }),
      ),
    ).toEqual(
      expect.arrayContaining([
        'Divisor is outside the difficulty range',
        'Quotient is outside the difficulty range',
        'Dividend is above the difficulty limit',
      ]),
    )
  })

  it('accepts the same question at a higher level that allows it', () => {
    expect(
      isValidQuestionDraft(
        draft({
          operation: 'multiplication',
          firstOperand: 9,
          secondOperand: 9,
          correctAnswer: 81,
          difficulty: 3,
        }),
      ),
    ).toBe(true)
  })
})
