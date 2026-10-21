import { describe, expect, it, vi } from 'vitest'
import { makeAttempt } from '../test/sessionResult'
import type { MistakePattern } from '../types/mistake'
import {
  loadMistakePatterns,
  MAX_STORED_MISTAKE_PATTERNS,
  recordMistake,
  saveMistakePatterns,
} from './mistakeService'
import { STORAGE_KEYS } from './storageService'

const miss = (extra = {}) =>
  makeAttempt({
    operation: 'multiplication',
    firstOperand: 8,
    secondOperand: 7,
    correctAnswer: 56,
    selectedAnswer: 54,
    selfReportedCorrect: false,
    difficulty: 2,
    attemptedAt: '2026-03-01T10:00:00.000Z',
    ...extra,
  })

function pattern(
  n: number,
  extra: Partial<MistakePattern> = {},
): MistakePattern {
  return {
    id: `addition:${n}:1:L1`,
    operation: 'addition',
    firstOperand: n,
    secondOperand: 1,
    correctAnswer: n + 1,
    difficulty: 1,
    incorrectCount: 1,
    similarCorrectCount: 0,
    lastIncorrectAt: new Date(Date.UTC(2026, 0, 1) + n * 60_000).toISOString(),
    mastered: false,
    ...extra,
  }
}

describe('loading mistake patterns', () => {
  it('starts empty', () => {
    expect(loadMistakePatterns()).toEqual([])
  })

  it('loads what was saved, after a "restart"', () => {
    saveMistakePatterns([pattern(1), pattern(2)])
    expect(loadMistakePatterns().map((p) => p.id)).toEqual([
      'addition:1:1:L1',
      'addition:2:1:L1',
    ])
  })

  it('is empty, not an error, if the saved value is not a list', () => {
    window.localStorage.setItem(STORAGE_KEYS.mistakePatterns, '{"a":1}')
    expect(loadMistakePatterns()).toEqual([])
    window.localStorage.setItem(STORAGE_KEYS.mistakePatterns, 'not json')
    expect(loadMistakePatterns()).toEqual([])
  })

  it('skips damaged records but keeps the good ones', () => {
    saveMistakePatterns([pattern(1)])
    const list = JSON.parse(
      window.localStorage.getItem(STORAGE_KEYS.mistakePatterns) ?? '[]',
    )
    list.push({ nonsense: true }, 'junk', { ...list[0], correctAnswer: 99 })
    window.localStorage.setItem(
      STORAGE_KEYS.mistakePatterns,
      JSON.stringify(list),
    )

    expect(loadMistakePatterns().map((p) => p.id)).toEqual(['addition:1:1:L1'])
  })

  it('merges records for the same mistake', () => {
    const list = [
      pattern(1, { incorrectCount: 2 }),
      pattern(1, { incorrectCount: 3 }),
    ]
    window.localStorage.setItem(
      STORAGE_KEYS.mistakePatterns,
      JSON.stringify(list),
    )

    const loaded = loadMistakePatterns()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].incorrectCount).toBe(5)
  })

  it('is empty when the browser will not let it read', () => {
    saveMistakePatterns([pattern(1)])
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    expect(loadMistakePatterns()).toEqual([])
  })
})

describe('recordMistake', () => {
  it('stores a new mistake pattern from a wrong answer', () => {
    expect(recordMistake(miss())).toEqual({ ok: true })

    expect(loadMistakePatterns()).toEqual([
      {
        id: 'multiplication:8:7:L2',
        operation: 'multiplication',
        firstOperand: 8,
        secondOperand: 7,
        correctAnswer: 56,
        difficulty: 2,
        incorrectCount: 1,
        similarCorrectCount: 0,
        lastIncorrectAt: '2026-03-01T10:00:00.000Z',
        mastered: false,
      },
    ])
  })

  it('updates the existing pattern instead of adding another', () => {
    recordMistake(miss())
    recordMistake(miss({ attemptedAt: '2026-03-05T08:00:00.000Z' }))

    const patterns = loadMistakePatterns()
    expect(patterns).toHaveLength(1)
    expect(patterns[0]).toMatchObject({
      incorrectCount: 2,
      lastIncorrectAt: '2026-03-05T08:00:00.000Z',
    })
  })

  it('keeps different mistakes as separate patterns', () => {
    recordMistake(miss())
    recordMistake(miss({ firstOperand: 7, secondOperand: 8 }))
    recordMistake(
      miss({
        operation: 'division',
        firstOperand: 56,
        secondOperand: 7,
        correctAnswer: 8,
      }),
    )
    expect(loadMistakePatterns()).toHaveLength(3)
  })

  it('resets mastery progress when a mastered mistake is missed again', () => {
    saveMistakePatterns([
      pattern(8, {
        id: 'multiplication:8:7:L2',
        operation: 'multiplication',
        firstOperand: 8,
        secondOperand: 7,
        correctAnswer: 56,
        difficulty: 2,
        mastered: true,
        similarCorrectCount: 3,
      }),
    ])
    recordMistake(miss())

    expect(loadMistakePatterns()[0]).toMatchObject({
      mastered: false,
      similarCorrectCount: 0,
      incorrectCount: 2,
    })
  })

  it('ignores answers that were right', () => {
    expect(recordMistake(miss({ selfReportedCorrect: true }))).toEqual({
      ok: true,
    })
    expect(loadMistakePatterns()).toEqual([])
    expect(window.localStorage.getItem(STORAGE_KEYS.mistakePatterns)).toBeNull()
  })

  it('reports it, without throwing, if the browser will not save', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    expect(recordMistake(miss())).toEqual({ ok: false, reason: 'unavailable' })
  })

  it('recovers from damaged saved patterns by starting clean', () => {
    window.localStorage.setItem(STORAGE_KEYS.mistakePatterns, '{{{')
    recordMistake(miss())
    expect(loadMistakePatterns()).toHaveLength(1)
  })
})

describe('saving many mistake patterns', () => {
  it('keeps everything up to the limit', () => {
    saveMistakePatterns([pattern(1), pattern(2), pattern(3)])
    expect(loadMistakePatterns()).toHaveLength(3)
  })

  it('drops mastered patterns first, then the least recent, past the limit', () => {
    const active = Array.from({ length: MAX_STORED_MISTAKE_PATTERNS }, (_, i) =>
      pattern(i + 1),
    )
    const mastered = pattern(5000, {
      mastered: true,
      lastIncorrectAt: '2030-01-01T00:00:00.000Z',
    })
    saveMistakePatterns([...active, mastered])

    const saved = loadMistakePatterns()
    expect(saved).toHaveLength(MAX_STORED_MISTAKE_PATTERNS)
    expect(saved.some((p) => p.id === mastered.id)).toBe(false)

    // Now one over the limit with no mastered ones: the oldest goes.
    saveMistakePatterns([...active, pattern(6000)])
    const ids = loadMistakePatterns().map((p) => p.id)
    expect(ids).toHaveLength(MAX_STORED_MISTAKE_PATTERNS)
    expect(ids).toContain('addition:6000:1:L1')
    expect(ids).not.toContain('addition:1:1:L1')
  })

  it('drops the oldest patterns and still saves when the browser is full', () => {
    saveMistakePatterns(Array.from({ length: 8 }, (_, i) => pattern(i + 1)))
    const original = Storage.prototype.setItem
    let failed = false
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (!failed) {
        failed = true
        throw new DOMException('full', 'QuotaExceededError')
      }
      original.call(this, key, value)
    })

    const result = recordMistake(miss())
    expect(result).toEqual({ ok: true })
    const saved = loadMistakePatterns()
    expect(saved.at(-1)?.id).toBe('multiplication:8:7:L2')
    expect(saved.length).toBeLessThan(9)
  })
})
