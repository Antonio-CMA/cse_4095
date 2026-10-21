import { describe, expect, it } from 'vitest'
import { explainSolution } from './explanations'

describe('explainSolution', () => {
  it('explains addition with a subtraction check', () => {
    const text = explainSolution({
      operation: 'addition',
      firstOperand: 27,
      secondOperand: 38,
      correctAnswer: 65,
    })
    expect(text).toContain('Adding 27 and 38 together makes 65')
    expect(text).toContain('65 − 38 = 27')
  })

  it('explains subtraction with an addition check', () => {
    const text = explainSolution({
      operation: 'subtraction',
      firstOperand: 9,
      secondOperand: 4,
      correctAnswer: 5,
    })
    expect(text).toContain('Taking 4 away from 9 leaves 5')
    expect(text).toContain('5 + 4 = 9')
  })

  it('explains multiplication as groups, with a division check', () => {
    const text = explainSolution({
      operation: 'multiplication',
      firstOperand: 7,
      secondOperand: 8,
      correctAnswer: 56,
    })
    expect(text).toContain('7 groups of 8 make 56')
    expect(text).toContain('56 ÷ 8 = 7')
  })

  it('explains multiplying by zero', () => {
    for (const [a, b] of [
      [0, 5],
      [5, 0],
      [0, 0],
    ]) {
      expect(
        explainSolution({
          operation: 'multiplication',
          firstOperand: a,
          secondOperand: b,
          correctAnswer: 0,
        }),
      ).toContain('multiplied by 0 is 0')
    }
  })

  it('explains division as sharing, with a multiplication check', () => {
    const text = explainSolution({
      operation: 'division',
      firstOperand: 56,
      secondOperand: 7,
      correctAnswer: 8,
    })
    expect(text).toContain('Sharing 56 into groups of 7 makes 8 groups')
    expect(text).toContain('7 × 8 = 56')
  })

  it('never mentions NaN or undefined', () => {
    for (const operation of [
      'addition',
      'subtraction',
      'multiplication',
      'division',
    ] as const) {
      const text = explainSolution({
        operation,
        firstOperand: 12,
        secondOperand: 3,
        correctAnswer: 4,
      })
      expect(text).not.toMatch(/NaN|undefined/)
    }
  })
})
