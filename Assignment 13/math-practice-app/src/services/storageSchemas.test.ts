import { describe, expect, it } from 'vitest'
import { makeAttempt, makeResult } from '../test/sessionResult'
import {
  isDifficulty,
  isOperation,
  isSessionLength,
  parseStoredAttempt,
  parseStoredList,
  parseStoredSession,
} from './storageSchemas'

describe('small checks', () => {
  it('isOperation and isDifficulty accept only known values', () => {
    expect(isOperation('addition')).toBe(true)
    expect(isOperation('modulo')).toBe(false)
    expect(isOperation(undefined)).toBe(false)
    for (const level of [1, 2, 3, 4]) expect(isDifficulty(level)).toBe(true)
    for (const bad of [0, 5, '2', 1.5, null])
      expect(isDifficulty(bad)).toBe(false)
  })

  it('isSessionLength accepts continuous or 1 to 100', () => {
    for (const ok of ['continuous', 1, 10, 100]) {
      expect(isSessionLength(ok)).toBe(true)
    }
    for (const bad of [0, -1, 101, 2.5, '10', null, undefined]) {
      expect(isSessionLength(bad)).toBe(false)
    }
  })
})

describe('parseStoredSession', () => {
  const good = () => makeResult([true, false, true]).session

  it('accepts a real session unchanged', () => {
    expect(parseStoredSession(good())).toEqual(good())
  })

  it('accepts a session that has not been completed', () => {
    const { completedAt, ...open } = good()
    expect(completedAt).toBeDefined()
    expect(parseStoredSession(open)).toEqual(open)
  })

  it('drops fields it does not know about', () => {
    expect(parseStoredSession({ ...good(), extra: 'x' })).toEqual(good())
  })

  it.each([
    ['not an object', 'text'],
    ['an array', []],
    ['null', null],
    ['an empty id', { ...makeResult([true]).session, id: '' }],
    ['a bad start time', { ...makeResult([true]).session, startedAt: 'never' }],
    [
      'a bad completion time',
      { ...makeResult([true]).session, completedAt: 'x' },
    ],
    ['no operations', { ...makeResult([true]).session, operations: [] }],
    [
      'an unknown operation',
      { ...makeResult([true]).session, operations: ['x'] },
    ],
    ['a bad level', { ...makeResult([true]).session, difficulty: 9 }],
    ['a bad length', { ...makeResult([true]).session, sessionLength: 0 }],
    ['a negative count', { ...makeResult([true]).session, attempted: -1 }],
    [
      'totals that do not add up',
      { ...makeResult([true]).session, correct: 5 },
    ],
  ])('rejects a session with %s', (_label, value) => {
    expect(parseStoredSession(value)).toBeNull()
  })
})

describe('parseStoredAttempt', () => {
  it('accepts a real attempt unchanged', () => {
    const attempt = makeAttempt()
    expect(parseStoredAttempt(attempt)).toEqual(attempt)
  })

  it('keeps every field the specification asks for', () => {
    expect(Object.keys(parseStoredAttempt(makeAttempt()) ?? {}).sort()).toEqual(
      [
        'attemptedAt',
        'correctAnswer',
        'difficulty',
        'firstOperand',
        'id',
        'operation',
        'questionId',
        'secondOperand',
        'selectedAnswer',
        'selfReportedCorrect',
        'sessionId',
        'source',
      ],
    )
  })

  it.each([
    ['not an object', 7],
    ['an empty id', { ...makeAttempt(), id: '' }],
    ['no question id', { ...makeAttempt(), questionId: undefined }],
    ['no session id', { ...makeAttempt(), sessionId: 5 }],
    ['an unknown operation', { ...makeAttempt(), operation: 'x' }],
    ['a bad level', { ...makeAttempt(), difficulty: 0 }],
    ['a fractional operand', { ...makeAttempt(), firstOperand: 1.5 }],
    ['a missing answer', { ...makeAttempt(), selectedAnswer: undefined }],
    ['a non-boolean verdict', { ...makeAttempt(), selfReportedCorrect: 'yes' }],
    ['an unknown source', { ...makeAttempt(), source: 'other' }],
    ['a bad timestamp', { ...makeAttempt(), attemptedAt: 'soon' }],
  ])('rejects an attempt with %s', (_label, value) => {
    expect(parseStoredAttempt(value)).toBeNull()
  })

  it('accepts mistake-review attempts', () => {
    expect(
      parseStoredAttempt(makeAttempt({ source: 'mistake-review' })),
    ).not.toBeNull()
  })
})

describe('parseStoredList', () => {
  it('keeps the good records and drops the damaged ones', () => {
    const good = makeAttempt()
    const result = parseStoredList(
      [good, { nonsense: true }, 'x', null, makeAttempt()],
      parseStoredAttempt,
    )
    expect(result).toHaveLength(2)
    expect(result?.[0]).toEqual(good)
  })

  it('is null when the saved value is not a list', () => {
    expect(parseStoredList({}, parseStoredAttempt)).toBeNull()
    expect(parseStoredList('x', parseStoredAttempt)).toBeNull()
  })

  it('accepts an empty list', () => {
    expect(parseStoredList([], parseStoredAttempt)).toEqual([])
  })
})
