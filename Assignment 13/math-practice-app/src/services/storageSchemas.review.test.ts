import { describe, expect, it } from 'vitest'
import { makeAttempt, makeResult } from '../test/sessionResult'
import { parseStoredAttempt, parseStoredSession } from './storageSchemas'

describe('saved attempts with a mistake pattern', () => {
  it('keeps the pattern id a review answer belongs to', () => {
    const attempt = makeAttempt({
      source: 'mistake-review',
      mistakePatternId: 'multiplication:8:7:L2',
    })
    expect(parseStoredAttempt(attempt)).toEqual(attempt)
  })

  it('leaves it out for attempts without one', () => {
    const parsed = parseStoredAttempt(makeAttempt())
    expect(parsed && 'mistakePatternId' in parsed).toBe(false)
  })

  it.each([[42], [''], [null], [{}]])(
    'drops an unusable pattern id (%j)',
    (bad) => {
      const parsed = parseStoredAttempt({
        ...makeAttempt(),
        mistakePatternId: bad,
      })
      expect(parsed).not.toBeNull()
      expect(parsed && 'mistakePatternId' in parsed).toBe(false)
    },
  )
})

describe('saved sessions with a mode', () => {
  const session = () => makeResult([true, false]).session

  it('keeps the review mode', () => {
    expect(
      parseStoredSession({ ...session(), reviewMode: 'mistake-review' })
        ?.reviewMode,
    ).toBe('mistake-review')
    expect(
      parseStoredSession({ ...session(), reviewMode: 'regular' })?.reviewMode,
    ).toBe('regular')
  })

  it('accepts sessions saved before review existed (no mode)', () => {
    const parsed = parseStoredSession(session())
    expect(parsed).not.toBeNull()
    expect(parsed && 'reviewMode' in parsed).toBe(false)
  })

  it('drops an unknown mode but keeps the session', () => {
    const parsed = parseStoredSession({ ...session(), reviewMode: 'turbo' })
    expect(parsed).not.toBeNull()
    expect(parsed && 'reviewMode' in parsed).toBe(false)
  })
})
