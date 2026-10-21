import { describe, expect, it } from 'vitest'
import { makeResult } from '../test/sessionResult'
import { parseSessionResult } from './validation'

describe('parseSessionResult', () => {
  it('accepts a real finished session', () => {
    const result = makeResult([true, false, true])
    expect(parseSessionResult(result)).toEqual(result)
  })

  it('accepts a session ended before any answers', () => {
    expect(parseSessionResult(makeResult([]))).not.toBeNull()
  })

  it('accepts continuous sessions', () => {
    expect(
      parseSessionResult(makeResult([true], { sessionLength: 'continuous' })),
    ).not.toBeNull()
  })

  it('rejects missing or non-object state', () => {
    expect(parseSessionResult(undefined)).toBeNull()
    expect(parseSessionResult(null)).toBeNull()
    expect(parseSessionResult('done')).toBeNull()
    expect(parseSessionResult({})).toBeNull()
    expect(parseSessionResult({ session: {}, attempts: [] })).toBeNull()
  })

  it('rejects a session with unusable setup details', () => {
    const base = makeResult([true])
    for (const bad of [
      { operations: [] },
      { operations: ['modulo'] },
      { difficulty: 7 },
      { sessionLength: 0 },
    ]) {
      expect(
        parseSessionResult({ ...base, session: { ...base.session, ...bad } }),
      ).toBeNull()
    }
  })

  it('rejects totals that do not add up', () => {
    const base = makeResult([true, false])
    expect(
      parseSessionResult({
        ...base,
        session: { ...base.session, correct: 2 },
      }),
    ).toBeNull()
    expect(
      parseSessionResult({
        ...base,
        session: { ...base.session, attempted: -2, correct: -1, incorrect: -1 },
      }),
    ).toBeNull()
  })

  it('rejects an attempts list that does not match the total', () => {
    const base = makeResult([true, false])
    expect(
      parseSessionResult({ ...base, attempts: base.attempts.slice(0, 1) }),
    ).toBeNull()
  })

  it('rejects malformed attempts', () => {
    const base = makeResult([true])
    expect(parseSessionResult({ ...base, attempts: ['x'] })).toBeNull()
    expect(
      parseSessionResult({
        ...base,
        attempts: [{ ...base.attempts[0], source: 'other' }],
      }),
    ).toBeNull()
    expect(
      parseSessionResult({
        ...base,
        attempts: [{ ...base.attempts[0], selfReportedCorrect: 'yes' }],
      }),
    ).toBeNull()
  })

  it('rejects a session without an id or start time', () => {
    const base = makeResult([true])
    expect(
      parseSessionResult({ ...base, session: { ...base.session, id: 7 } }),
    ).toBeNull()
    expect(
      parseSessionResult({
        ...base,
        session: { ...base.session, startedAt: undefined },
      }),
    ).toBeNull()
  })
})
