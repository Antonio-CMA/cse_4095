import { describe, expect, it } from 'vitest'
import { parseStoredMistakePattern } from './storageSchemas'

const good = {
  id: 'multiplication:8:7:L2',
  operation: 'multiplication',
  firstOperand: 8,
  secondOperand: 7,
  correctAnswer: 56,
  difficulty: 2,
  incorrectCount: 3,
  similarCorrectCount: 1,
  lastIncorrectAt: '2026-03-01T10:00:00.000Z',
  mastered: false,
}

describe('parseStoredMistakePattern', () => {
  it('accepts a real pattern unchanged', () => {
    expect(parseStoredMistakePattern(good)).toEqual(good)
  })

  it('accepts a mastered pattern', () => {
    expect(
      parseStoredMistakePattern({
        ...good,
        mastered: true,
        similarCorrectCount: 3,
      }),
    ).toMatchObject({ mastered: true })
  })

  it('works for every operation', () => {
    const cases = [
      {
        operation: 'addition',
        firstOperand: 4,
        secondOperand: 5,
        correctAnswer: 9,
      },
      {
        operation: 'subtraction',
        firstOperand: 9,
        secondOperand: 4,
        correctAnswer: 5,
      },
      {
        operation: 'division',
        firstOperand: 56,
        secondOperand: 7,
        correctAnswer: 8,
      },
    ]
    for (const c of cases) {
      expect(parseStoredMistakePattern({ ...good, ...c })).not.toBeNull()
    }
  })

  it('rebuilds the id from the question so a damaged id cannot cause duplicates', () => {
    expect(parseStoredMistakePattern({ ...good, id: 'whatever' })?.id).toBe(
      'multiplication:8:7:L2',
    )
    expect(parseStoredMistakePattern({ ...good, id: undefined })?.id).toBe(
      'multiplication:8:7:L2',
    )
  })

  it('drops fields it does not know about', () => {
    expect(parseStoredMistakePattern({ ...good, extra: 'x' })).toEqual(good)
  })

  it.each([
    ['not an object', 'x'],
    ['null', null],
    ['an array', []],
    ['an unknown operation', { ...good, operation: 'modulo' }],
    ['a bad level', { ...good, difficulty: 9 }],
    ['a fractional operand', { ...good, firstOperand: 8.5 }],
    ['a missing operand', { ...good, secondOperand: undefined }],
    ['a wrong answer for the question', { ...good, correctAnswer: 57 }],
    [
      'division by zero',
      { ...good, operation: 'division', secondOperand: 0, correctAnswer: 0 },
    ],
    ['no misses', { ...good, incorrectCount: 0 }],
    ['a negative miss count', { ...good, incorrectCount: -2 }],
    ['a fractional miss count', { ...good, incorrectCount: 1.5 }],
    ['a negative similar-correct count', { ...good, similarCorrectCount: -1 }],
    ['a bad timestamp', { ...good, lastIncorrectAt: 'yesterday' }],
    ['a non-boolean mastered flag', { ...good, mastered: 'yes' }],
  ])('rejects a pattern with %s', (_label, value) => {
    expect(parseStoredMistakePattern(value)).toBeNull()
  })
})
