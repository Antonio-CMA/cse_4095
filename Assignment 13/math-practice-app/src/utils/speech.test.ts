import { describe, expect, it } from 'vitest'
import { speakProblem, speakQuestion, speakSolution } from './speech'

const base = { firstOperand: 7, secondOperand: 8 }

describe('speakProblem', () => {
  it('spells out each operation in words', () => {
    expect(speakProblem({ ...base, operation: 'addition' })).toBe('7 plus 8')
    expect(speakProblem({ ...base, operation: 'subtraction' })).toBe(
      '7 minus 8',
    )
    expect(speakProblem({ ...base, operation: 'multiplication' })).toBe(
      '7 times 8',
    )
    expect(speakProblem({ ...base, operation: 'division' })).toBe(
      '7 divided by 8',
    )
  })

  it('never uses the maths symbols', () => {
    for (const operation of [
      'addition',
      'subtraction',
      'multiplication',
      'division',
    ] as const) {
      expect(speakProblem({ ...base, operation })).not.toMatch(/[+−×÷=?]/)
    }
  })
})

describe('speakQuestion', () => {
  it('asks what the problem equals', () => {
    expect(speakQuestion({ ...base, operation: 'multiplication' })).toBe(
      '7 times 8 equals what?',
    )
  })
})

describe('speakSolution', () => {
  it('states the answer', () => {
    expect(
      speakSolution({
        ...base,
        operation: 'multiplication',
        correctAnswer: 56,
      }),
    ).toBe('7 times 8 equals 56')
  })

  it('reads zero and larger numbers normally', () => {
    expect(
      speakSolution({
        operation: 'division',
        firstOperand: 0,
        secondOperand: 5,
        correctAnswer: 0,
      }),
    ).toBe('0 divided by 5 equals 0')
    expect(
      speakSolution({
        operation: 'addition',
        firstOperand: 450,
        secondOperand: 300,
        correctAnswer: 750,
      }),
    ).toBe('450 plus 300 equals 750')
  })
})
