import { describe, expect, it, vi } from 'vitest'
import { makeAttempt } from '../test/sessionResult'
import {
  loadAttempts,
  MAX_STORED_ATTEMPTS,
  saveAttempts,
} from './practiceHistory'
import {
  addAttemptToStatistics,
  createEmptyStatistics,
  getAccuracy,
  loadStatistics,
  parseStoredStatistics,
  recordAttempt,
  saveStatistics,
  statisticsFromAttempts,
} from './statisticsService'
import { STORAGE_KEYS } from './storageService'

const right = (extra = {}) =>
  makeAttempt({ selfReportedCorrect: true, ...extra })
const wrong = (extra = {}) =>
  makeAttempt({ selfReportedCorrect: false, ...extra })

describe('createEmptyStatistics', () => {
  it('has zero everywhere, for every operation and level', () => {
    const stats = createEmptyStatistics()
    const zero = { attempted: 0, correct: 0, incorrect: 0 }

    expect(stats).toMatchObject(zero)
    expect(stats.byOperation).toEqual({
      addition: zero,
      subtraction: zero,
      multiplication: zero,
      division: zero,
    })
    expect(stats.byDifficulty).toEqual({ 1: zero, 2: zero, 3: zero, 4: zero })
  })

  it('returns a new object each time', () => {
    const a = createEmptyStatistics()
    a.byOperation.addition.attempted = 5
    expect(createEmptyStatistics().byOperation.addition.attempted).toBe(0)
  })
})

describe('addAttemptToStatistics', () => {
  it('counts a correct answer in the total, its operation and its level', () => {
    const stats = addAttemptToStatistics(
      createEmptyStatistics(),
      right({ operation: 'multiplication', difficulty: 3 }),
    )

    expect(stats).toMatchObject({ attempted: 1, correct: 1, incorrect: 0 })
    expect(stats.byOperation.multiplication).toEqual({
      attempted: 1,
      correct: 1,
      incorrect: 0,
    })
    expect(stats.byDifficulty[3]).toEqual({
      attempted: 1,
      correct: 1,
      incorrect: 0,
    })
  })

  it('counts an incorrect answer', () => {
    const stats = addAttemptToStatistics(
      createEmptyStatistics(),
      wrong({ operation: 'division', difficulty: 1 }),
    )
    expect(stats).toMatchObject({ attempted: 1, correct: 0, incorrect: 1 })
    expect(stats.byOperation.division.incorrect).toBe(1)
    expect(stats.byDifficulty[1].incorrect).toBe(1)
  })

  it('leaves every other operation and level alone', () => {
    const stats = addAttemptToStatistics(
      createEmptyStatistics(),
      right({ operation: 'addition', difficulty: 2 }),
    )
    for (const op of ['subtraction', 'multiplication', 'division'] as const) {
      expect(stats.byOperation[op].attempted).toBe(0)
    }
    for (const level of [1, 3, 4] as const) {
      expect(stats.byDifficulty[level].attempted).toBe(0)
    }
  })

  it('does not change the statistics it was given', () => {
    const before = createEmptyStatistics()
    addAttemptToStatistics(before, right())
    expect(before).toEqual(createEmptyStatistics())
  })
})

describe('statisticsFromAttempts', () => {
  it('is all zeros for no attempts', () => {
    expect(statisticsFromAttempts([])).toEqual(createEmptyStatistics())
  })

  it('totals a mix of answers by operation and level', () => {
    const stats = statisticsFromAttempts([
      right({ operation: 'addition', difficulty: 1 }),
      right({ operation: 'addition', difficulty: 1 }),
      wrong({ operation: 'addition', difficulty: 2 }),
      right({ operation: 'division', difficulty: 2 }),
      wrong({ operation: 'division', difficulty: 4 }),
    ])

    expect(stats).toMatchObject({ attempted: 5, correct: 3, incorrect: 2 })
    expect(stats.byOperation.addition).toEqual({
      attempted: 3,
      correct: 2,
      incorrect: 1,
    })
    expect(stats.byOperation.division).toEqual({
      attempted: 2,
      correct: 1,
      incorrect: 1,
    })
    expect(stats.byOperation.subtraction.attempted).toBe(0)
    expect(stats.byDifficulty[1]).toEqual({
      attempted: 2,
      correct: 2,
      incorrect: 0,
    })
    expect(stats.byDifficulty[2]).toEqual({
      attempted: 2,
      correct: 1,
      incorrect: 1,
    })
    expect(stats.byDifficulty[3].attempted).toBe(0)
    expect(stats.byDifficulty[4]).toEqual({
      attempted: 1,
      correct: 0,
      incorrect: 1,
    })
  })

  it('always adds up: totals equal the sum of the operation and level groups', () => {
    const attempts = Array.from({ length: 60 }, (_, i) =>
      makeAttempt({
        operation: (
          ['addition', 'subtraction', 'multiplication', 'division'] as const
        )[i % 4],
        difficulty: ((i % 4) + 1) as 1 | 2 | 3 | 4,
        selfReportedCorrect: i % 3 !== 0,
      }),
    )
    const stats = statisticsFromAttempts(attempts)
    const sum = (rows: { attempted: number }[]) =>
      rows.reduce((n, r) => n + r.attempted, 0)

    expect(sum(Object.values(stats.byOperation))).toBe(stats.attempted)
    expect(sum(Object.values(stats.byDifficulty))).toBe(stats.attempted)
    expect(stats.correct + stats.incorrect).toBe(stats.attempted)
  })
})

describe('getAccuracy', () => {
  it('is the percentage correct', () => {
    expect(getAccuracy({ attempted: 4, correct: 3 })).toBe(75)
    expect(getAccuracy({ attempted: 3, correct: 1 })).toBe(33)
    expect(getAccuracy({ attempted: 5, correct: 5 })).toBe(100)
    expect(getAccuracy({ attempted: 5, correct: 0 })).toBe(0)
  })

  it('is null, never NaN or a division error, with zero attempts', () => {
    expect(getAccuracy({ attempted: 0, correct: 0 })).toBeNull()
    expect(getAccuracy(createEmptyStatistics())).toBeNull()
  })
})

describe('parseStoredStatistics', () => {
  const good = () =>
    statisticsFromAttempts([
      right(),
      wrong({ operation: 'division', difficulty: 3 }),
    ])

  it('accepts statistics that add up', () => {
    expect(parseStoredStatistics(good())).toEqual(good())
    expect(parseStoredStatistics(createEmptyStatistics())).toEqual(
      createEmptyStatistics(),
    )
  })

  it('survives being saved as JSON and read back', () => {
    const roundTripped = JSON.parse(JSON.stringify(good()))
    expect(parseStoredStatistics(roundTripped)).toEqual(good())
  })

  it.each([
    ['not an object', 'x'],
    ['null', null],
    ['an array of nothing useful', []],
  ])('rejects %s', (_label, value) => {
    expect(parseStoredStatistics(value)).toBeNull()
  })

  it('rejects statistics with a missing operation or level', () => {
    const noOp = good() as unknown as Record<string, Record<string, unknown>>
    delete noOp.byOperation.division
    expect(parseStoredStatistics(noOp)).toBeNull()

    const noLevel = good() as unknown as Record<string, Record<string, unknown>>
    delete noLevel.byDifficulty['2']
    expect(parseStoredStatistics(noLevel)).toBeNull()
  })

  it('rejects groups missing entirely', () => {
    const { byOperation, ...rest } = good()
    expect(byOperation).toBeDefined()
    expect(parseStoredStatistics(rest)).toBeNull()
    const { byDifficulty, ...rest2 } = good()
    expect(byDifficulty).toBeDefined()
    expect(parseStoredStatistics(rest2)).toBeNull()
  })

  it('rejects a group whose numbers do not add up', () => {
    const bad = good()
    bad.byOperation.addition.correct = 9
    expect(parseStoredStatistics(bad)).toBeNull()
  })

  it('rejects negative or fractional counts', () => {
    const negative = good()
    negative.correct = -1
    expect(parseStoredStatistics(negative)).toBeNull()

    const fractional = good()
    fractional.byDifficulty[1].attempted = 1.5
    expect(parseStoredStatistics(fractional)).toBeNull()
  })

  it('rejects groups that do not add up to the total', () => {
    const total = good()
    total.attempted = 5
    total.correct = 3
    total.incorrect = 2
    expect(parseStoredStatistics(total)).toBeNull()

    const byLevel = good()
    byLevel.byDifficulty[4] = { attempted: 2, correct: 1, incorrect: 1 }
    expect(parseStoredStatistics(byLevel)).toBeNull()
  })
})

describe('loadStatistics and saveStatistics', () => {
  it('starts empty', () => {
    expect(loadStatistics()).toEqual(createEmptyStatistics())
  })

  it('loads what was saved', () => {
    const stats = statisticsFromAttempts([right(), wrong()])
    expect(saveStatistics(stats)).toEqual({ ok: true })
    expect(loadStatistics()).toEqual(stats)
  })

  it('counts the saved answers again if the totals are damaged', () => {
    saveAttempts([right(), right(), wrong()])
    window.localStorage.setItem(
      STORAGE_KEYS.statistics,
      '{"attempted": "lots"}',
    )

    expect(loadStatistics()).toMatchObject({
      attempted: 3,
      correct: 2,
      incorrect: 1,
    })
  })

  it('counts the saved answers if no totals were ever saved', () => {
    saveAttempts([right(), wrong()])
    expect(loadStatistics()).toMatchObject({ attempted: 2, correct: 1 })
  })

  it('is empty, not an error, when storage cannot be read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    expect(loadStatistics()).toEqual(createEmptyStatistics())
  })
})

describe('recordAttempt', () => {
  it('saves the answer and counts it', () => {
    const attempt = right({ operation: 'subtraction', difficulty: 2 })
    expect(recordAttempt(attempt)).toEqual({ ok: true })

    expect(loadAttempts()).toEqual([attempt])
    const stats = loadStatistics()
    expect(stats).toMatchObject({ attempted: 1, correct: 1, incorrect: 0 })
    expect(stats.byOperation.subtraction.attempted).toBe(1)
    expect(stats.byDifficulty[2].attempted).toBe(1)
  })

  it('keeps a running total over many answers', () => {
    recordAttempt(right({ operation: 'addition' }))
    recordAttempt(wrong({ operation: 'addition' }))
    recordAttempt(right({ operation: 'division', difficulty: 4 }))

    const stats = loadStatistics()
    expect(stats).toMatchObject({ attempted: 3, correct: 2, incorrect: 1 })
    expect(stats.byOperation.addition).toEqual({
      attempted: 2,
      correct: 1,
      incorrect: 1,
    })
    expect(stats.byDifficulty[4].attempted).toBe(1)
  })

  it('counts an answer once, even if it is recorded again', () => {
    const attempt = right()
    recordAttempt(attempt)
    recordAttempt(attempt)
    recordAttempt(attempt)

    expect(loadAttempts()).toHaveLength(1)
    expect(loadStatistics().attempted).toBe(1)
  })

  it('counts earlier answers saved before totals existed, plus the new one', () => {
    saveAttempts([right(), wrong()]) // saved by an earlier version of the app
    recordAttempt(right())

    expect(loadStatistics()).toMatchObject({
      attempted: 3,
      correct: 2,
      incorrect: 1,
    })
  })

  it('recovers if the saved totals are damaged', () => {
    recordAttempt(right())
    window.localStorage.setItem(STORAGE_KEYS.statistics, 'garbage')
    recordAttempt(wrong())

    expect(loadStatistics()).toMatchObject({
      attempted: 2,
      correct: 1,
      incorrect: 1,
    })
  })

  it('keeps counting after old detailed answers have been trimmed away', () => {
    const many = Array.from({ length: MAX_STORED_ATTEMPTS }, (_, i) =>
      makeAttempt({ selfReportedCorrect: i % 2 === 0 }),
    )
    saveAttempts(many)
    saveStatistics(statisticsFromAttempts(many))

    recordAttempt(right())

    // The oldest detail was dropped to stay within the limit...
    expect(loadAttempts()).toHaveLength(MAX_STORED_ATTEMPTS)
    // ...but the totals still include everything.
    expect(loadStatistics().attempted).toBe(MAX_STORED_ATTEMPTS + 1)
  })

  it('leaves the totals alone if the answer could not be saved', () => {
    recordAttempt(right())
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })

    expect(recordAttempt(right())).toMatchObject({ ok: false })
    vi.restoreAllMocks()
    expect(loadStatistics().attempted).toBe(1)
  })
})
