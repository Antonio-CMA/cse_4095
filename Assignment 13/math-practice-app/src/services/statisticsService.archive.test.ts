import { describe, expect, it, vi } from 'vitest'
import { makeAttempt } from '../test/sessionResult'
import type { PracticeAttempt } from '../types/session'
import { recordPracticeAttempt } from './attemptRecorder'
import { repairStoredData } from './dataRepair'
import {
  addAttempts,
  loadAttempts,
  MAX_STORED_ATTEMPTS,
  saveAttempts,
} from './practiceHistory'
import {
  addStatistics,
  createEmptyStatistics,
  loadArchivedStatistics,
  loadStatistics,
  recordAttempt,
  recordAttemptOnce,
  statisticsFromAttempts,
} from './statisticsService'
import { STORAGE_KEYS, writeItem } from './storageService'

const raw = (key: string) => window.localStorage.getItem(key)

/** A varied answer: operation, level and right/wrong all depend on `i`. */
function attempt(i: number, overrides: Partial<PracticeAttempt> = {}) {
  return makeAttempt({
    operation: (
      ['addition', 'subtraction', 'multiplication', 'division'] as const
    )[i % 4],
    difficulty: ((i % 4) + 1) as 1 | 2 | 3 | 4,
    selfReportedCorrect: i % 3 !== 0,
    source: i % 5 === 0 ? 'mistake-review' : 'regular',
    ...overrides,
  })
}

const many = (count: number) =>
  Array.from({ length: count }, (_, i) => attempt(i))

/** More answers, different from `many` and from earlier calls. */
const newer = (count: number, start = 5000) =>
  Array.from({ length: count }, (_, i) => attempt(start + i))

/**
 * A history already at the limit, as it is after a long time of practice: the
 * detailed list full, and the running totals saved to match. (Building it with
 * a thousand separate recordings would be slow, which is rather the point.)
 */
function historyAtLimit() {
  const seed = many(MAX_STORED_ATTEMPTS)
  writeItem(STORAGE_KEYS.attempts, seed)
  writeItem(STORAGE_KEYS.statistics, statisticsFromAttempts(seed))
  return seed
}

describe('addStatistics', () => {
  it('adds every part of two sets of totals', () => {
    const a = statisticsFromAttempts(many(10))
    const b = statisticsFromAttempts(many(7))
    const sum = addStatistics(a, b)

    expect(sum.attempted).toBe(17)
    expect(sum.correct).toBe(a.correct + b.correct)
    expect(sum.review.attempted).toBe(a.review.attempted + b.review.attempted)
    expect(sum.byOperation.division.attempted).toBe(
      a.byOperation.division.attempted + b.byOperation.division.attempted,
    )
    expect(sum.byDifficulty[3].incorrect).toBe(
      a.byDifficulty[3].incorrect + b.byDifficulty[3].incorrect,
    )
  })

  it('is the same as counting both lists together', () => {
    const first = many(30)
    const second = many(41)
    expect(
      addStatistics(
        statisticsFromAttempts(first),
        statisticsFromAttempts(second),
      ),
    ).toEqual(statisticsFromAttempts([...first, ...second]))
  })

  it('leaves both inputs alone, and adding nothing changes nothing', () => {
    const a = statisticsFromAttempts(many(5))
    const copy = structuredClone(a)
    expect(addStatistics(a, createEmptyStatistics())).toEqual(a)
    expect(a).toEqual(copy)
  })
})

describe('addAttempts', () => {
  it('says how many were new, and drops nothing while there is room', () => {
    const first = attempt(1)
    expect(addAttempts([first, attempt(2)])).toMatchObject({
      added: 2,
      trimmed: [],
      result: { ok: true },
    })
    expect(addAttempts([first])).toMatchObject({ added: 0, trimmed: [] })
  })

  it('returns the oldest answers it had to drop, oldest first', () => {
    const all = many(MAX_STORED_ATTEMPTS)
    saveAttempts(all)
    const newcomers = [attempt(901), attempt(902)]

    const { trimmed } = addAttempts(newcomers)
    expect(trimmed.map((a) => a.id)).toEqual([all[0].id, all[1].id])
    expect(loadAttempts()).toHaveLength(MAX_STORED_ATTEMPTS)
    expect(loadAttempts().at(-1)?.id).toBe(newcomers[1].id)
  })

  it('does not say anything was dropped if the save failed', () => {
    saveAttempts(many(MAX_STORED_ATTEMPTS))
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('no', 'SecurityError')
    })
    const outcome = addAttempts([attempt(1)])
    expect(outcome.result.ok).toBe(false)
    expect(outcome.trimmed).toEqual([])
  })
})

describe('totals survive the detailed list being trimmed', () => {
  it('nothing is archived while every answer is still kept', () => {
    for (let i = 0; i < 20; i++) recordAttempt(attempt(i))
    expect(raw(STORAGE_KEYS.attemptArchive)).toBeNull()
    expect(loadArchivedStatistics()).toEqual(createEmptyStatistics())
  })

  it('folds the dropped answers into the archive, exactly', () => {
    const seed = historyAtLimit()
    const extra = newer(25)
    for (const a of extra) recordAttempt(a)

    expect(loadAttempts()).toHaveLength(MAX_STORED_ATTEMPTS)
    expect(loadArchivedStatistics()).toEqual(
      statisticsFromAttempts(seed.slice(0, 25)),
    )
    expect(loadStatistics()).toEqual(
      statisticsFromAttempts([...seed, ...extra]),
    )
  })

  it('counts everything again correctly if the totals are lost', () => {
    const seed = historyAtLimit()
    const extra = newer(40)
    for (const a of extra) recordAttempt(a)
    window.localStorage.removeItem(STORAGE_KEYS.statistics)

    // Without the archive this would give only the answers still in detail.
    expect(loadStatistics()).toEqual(
      statisticsFromAttempts([...seed, ...extra]),
    )
  })

  it('keeps counting correctly after the totals were rebuilt', () => {
    const seed = historyAtLimit()
    const extra = newer(10)
    for (const a of extra) recordAttempt(a)
    window.localStorage.setItem(STORAGE_KEYS.statistics, 'damaged')

    const next = attempt(7)
    recordAttempt(next)
    expect(loadStatistics()).toEqual(
      statisticsFromAttempts([...seed, ...extra, next]),
    )
  })

  it('handles an old list that is much longer than the limit', () => {
    // Saved by an earlier version, which kept 5,000 answers in detail.
    const old = many(5000)
    writeItem(STORAGE_KEYS.attempts, old)
    writeItem(STORAGE_KEYS.statistics, statisticsFromAttempts(old))

    const newest = attempt(3)
    recordAttempt(newest)

    expect(loadAttempts()).toHaveLength(MAX_STORED_ATTEMPTS)
    expect(loadStatistics()).toEqual(statisticsFromAttempts([...old, newest]))
    window.localStorage.removeItem(STORAGE_KEYS.statistics)
    expect(loadStatistics()).toEqual(statisticsFromAttempts([...old, newest]))
  })
})

describe('recordAttemptOnce', () => {
  it('says whether the answer was new', () => {
    const a = attempt(1)
    expect(recordAttemptOnce(a)).toMatchObject({
      isNew: true,
      result: { ok: true },
    })
    expect(recordAttemptOnce(a)).toMatchObject({
      isNew: false,
      result: { ok: true },
    })
    expect(loadStatistics().attempted).toBe(1)
  })

  it('counts an answer only once, even after others have come and gone', () => {
    const a = attempt(1)
    recordAttempt(a)
    for (let i = 2; i < 30; i++) recordAttempt(attempt(i))
    recordAttempt(a)
    expect(loadStatistics().attempted).toBe(29)
  })

  it('leaves the archive alone when the answer could not be saved', () => {
    historyAtLimit()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    expect(recordAttemptOnce(attempt(1)).result.ok).toBe(false)
    expect(raw(STORAGE_KEYS.attemptArchive)).toBeNull()
  })
})

describe('what each answer costs', () => {
  it('reads the saved answers only once per answer', () => {
    historyAtLimit()
    const read = vi.spyOn(Storage.prototype, 'getItem')

    recordPracticeAttempt(attempt(1))

    const readsOfAnswers = read.mock.calls.filter(
      ([key]) => key === STORAGE_KEYS.attempts,
    )
    expect(readsOfAnswers).toHaveLength(1)
  })

  it('reads them only once for an answer that was already recorded, too', () => {
    historyAtLimit()
    const a = attempt(1)
    recordPracticeAttempt(a)
    const read = vi.spyOn(Storage.prototype, 'getItem')

    recordPracticeAttempt(a)
    expect(
      read.mock.calls.filter(([key]) => key === STORAGE_KEYS.attempts),
    ).toHaveLength(1)
  })

  it('stays correct with several thousand answers behind it', () => {
    const history = many(4000)
    writeItem(STORAGE_KEYS.attempts, history.slice(-MAX_STORED_ATTEMPTS))
    writeItem(STORAGE_KEYS.statistics, statisticsFromAttempts(history))
    writeItem(
      STORAGE_KEYS.attemptArchive,
      statisticsFromAttempts(history.slice(0, -MAX_STORED_ATTEMPTS)),
    )

    for (let i = 0; i < 50; i++) recordPracticeAttempt(attempt(i + 100))

    expect(loadStatistics().attempted).toBe(4050)
    expect(loadAttempts()).toHaveLength(MAX_STORED_ATTEMPTS)
    expect(loadArchivedStatistics().attempted).toBe(4050 - MAX_STORED_ATTEMPTS)
  })
})

describe('repairing the totals at startup', () => {
  it('rebuilds damaged totals from the archive as well as the answers', () => {
    const seed = historyAtLimit()
    const extra = newer(15)
    for (const a of extra) recordAttempt(a)
    window.localStorage.setItem(STORAGE_KEYS.statistics, '{"attempted":"lots"}')

    expect(repairStoredData('current')).toEqual([])
    expect(JSON.parse(raw(STORAGE_KEYS.statistics)!)).toEqual(
      statisticsFromAttempts([...seed, ...extra]),
    )
  })

  it('removes a damaged archive quietly, and keeps healthy totals', () => {
    const answers = many(20)
    for (const a of answers) recordAttempt(a)
    window.localStorage.setItem(STORAGE_KEYS.attemptArchive, '[1,2,3]')

    expect(repairStoredData('current')).toEqual([])
    expect(raw(STORAGE_KEYS.attemptArchive)).toBeNull()
    expect(loadStatistics()).toEqual(statisticsFromAttempts(answers))
  })

  it('leaves a healthy archive alone', () => {
    historyAtLimit()
    for (const a of newer(5)) recordAttempt(a)
    const before = raw(STORAGE_KEYS.attemptArchive)
    expect(before).not.toBeNull()

    repairStoredData('current')
    expect(raw(STORAGE_KEYS.attemptArchive)).toBe(before)
  })
})
