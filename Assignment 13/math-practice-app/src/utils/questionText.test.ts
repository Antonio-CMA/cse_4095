import { describe, expect, it } from 'vitest'
import { formatSolution } from './questionText'

describe('formatSolution', () => {
  it('fills the answer into the sum for each operation', () => {
    const base = { firstOperand: 7, secondOperand: 8 }
    expect(
      formatSolution({
        ...base,
        operation: 'multiplication',
        correctAnswer: 56,
      }),
    ).toBe('7 × 8 = 56')
    expect(
      formatSolution({ ...base, operation: 'addition', correctAnswer: 15 }),
    ).toBe('7 + 8 = 15')
    expect(
      formatSolution({ ...base, operation: 'subtraction', correctAnswer: -1 }),
    ).toBe('7 − 8 = -1')
    expect(
      formatSolution({
        firstOperand: 56,
        secondOperand: 7,
        operation: 'division',
        correctAnswer: 8,
      }),
    ).toBe('56 ÷ 7 = 8')
  })
})
