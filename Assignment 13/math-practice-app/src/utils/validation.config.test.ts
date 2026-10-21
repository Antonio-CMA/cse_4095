import { describe, expect, it } from 'vitest'
import { MAX_SESSION_LENGTH, parsePracticeConfig } from './validation'

const GOOD = {
  operations: ['addition', 'division'],
  difficulty: 2,
  sessionLength: 10,
  reviewMode: 'regular',
}

describe('parsePracticeConfig', () => {
  it('accepts a valid setup', () => {
    expect(parsePracticeConfig(GOOD)).toEqual(GOOD)
  })

  it('accepts continuous practice and every level', () => {
    for (const difficulty of [1, 2, 3, 4]) {
      expect(parsePracticeConfig({ ...GOOD, difficulty })).not.toBeNull()
    }
    expect(
      parsePracticeConfig({ ...GOOD, sessionLength: 'continuous' }),
    ).toMatchObject({ sessionLength: 'continuous' })
  })

  it('rejects missing or non-object state', () => {
    expect(parsePracticeConfig(undefined)).toBeNull()
    expect(parsePracticeConfig(null)).toBeNull()
    expect(parsePracticeConfig('addition')).toBeNull()
    expect(parsePracticeConfig(42)).toBeNull()
  })

  it('rejects empty or unknown operations', () => {
    expect(parsePracticeConfig({ ...GOOD, operations: [] })).toBeNull()
    expect(parsePracticeConfig({ ...GOOD, operations: 'addition' })).toBeNull()
    expect(parsePracticeConfig({ ...GOOD, operations: ['modulo'] })).toBeNull()
    expect(
      parsePracticeConfig({ ...GOOD, operations: ['addition', 7] }),
    ).toBeNull()
  })

  it('removes repeated operations', () => {
    expect(
      parsePracticeConfig({
        ...GOOD,
        operations: ['addition', 'addition', 'division'],
      })?.operations,
    ).toEqual(['addition', 'division'])
  })

  it('rejects a difficulty outside 1 to 4', () => {
    for (const difficulty of [0, 5, 1.5, '2', null, undefined]) {
      expect(parsePracticeConfig({ ...GOOD, difficulty })).toBeNull()
    }
  })

  it('rejects an unusable session length', () => {
    for (const sessionLength of [
      0,
      -5,
      2.5,
      '10',
      null,
      MAX_SESSION_LENGTH + 1,
    ]) {
      expect(parsePracticeConfig({ ...GOOD, sessionLength })).toBeNull()
    }
    expect(
      parsePracticeConfig({ ...GOOD, sessionLength: MAX_SESSION_LENGTH }),
    ).not.toBeNull()
  })

  it('falls back to regular practice for a missing or unknown review mode', () => {
    expect(
      parsePracticeConfig({ ...GOOD, reviewMode: undefined })?.reviewMode,
    ).toBe('regular')
    expect(
      parsePracticeConfig({ ...GOOD, reviewMode: 'weird' })?.reviewMode,
    ).toBe('regular')
    expect(
      parsePracticeConfig({ ...GOOD, reviewMode: 'mistake-review' })
        ?.reviewMode,
    ).toBe('mistake-review')
  })
})
