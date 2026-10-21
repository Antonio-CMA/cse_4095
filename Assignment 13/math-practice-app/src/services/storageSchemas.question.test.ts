import { describe, expect, it } from 'vitest'
import type { Question } from '../types/question'
import { parseStoredQuestion } from './storageSchemas'

const good = (): Question => ({
  id: 'q1',
  operation: 'multiplication',
  firstOperand: 7,
  secondOperand: 8,
  displayText: '7 × 8 = ?',
  correctAnswer: 56,
  choices: [48, 54, 56, 64],
  difficulty: 2,
  source: 'regular',
})

describe('parseStoredQuestion', () => {
  it('accepts a real question unchanged', () => {
    expect(parseStoredQuestion(good())).toEqual(good())
  })

  it('keeps the mistake pattern of a review question', () => {
    const review = {
      ...good(),
      source: 'mistake-review',
      mistakePatternId: 'multiplication:7:8:L2',
    }
    expect(parseStoredQuestion(review)).toEqual(review)
  })

  it('does not share the saved choices array', () => {
    const saved = good()
    const parsed = parseStoredQuestion(saved)
    parsed?.choices.push(99)
    expect(saved.choices).toEqual([48, 54, 56, 64])
  })

  it.each([
    ['nothing', undefined],
    ['not an object', 'q1'],
    ['a list', []],
    ['no id', { ...good(), id: '' }],
    ['an unknown operation', { ...good(), operation: 'modulo' }],
    ['an unknown level', { ...good(), difficulty: 9 }],
    ['no text', { ...good(), displayText: '' }],
    ['an unknown source', { ...good(), source: 'guess' }],
    ['a fractional operand', { ...good(), firstOperand: 7.5 }],
    ['an answer that is not the answer', { ...good(), correctAnswer: 57 }],
    [
      'a division by zero',
      {
        ...good(),
        operation: 'division',
        secondOperand: 0,
        correctAnswer: 0,
        choices: [0, 1, 2, 3],
      },
    ],
    ['choices that are not a list', { ...good(), choices: '48,54,56,64' }],
    ['only three choices', { ...good(), choices: [48, 56, 64] }],
    ['repeated choices', { ...good(), choices: [56, 56, 54, 48] }],
    ['no right choice', { ...good(), choices: [48, 54, 55, 64] }],
    ['a negative choice', { ...good(), choices: [-1, 54, 56, 64] }],
  ])('rejects %s', (_label, value) => {
    expect(parseStoredQuestion(value)).toBeNull()
  })
})
