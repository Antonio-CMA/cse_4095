import { describe, expect, it, vi } from 'vitest'
import { makePattern } from '../test/mistakePatterns'
import { makeAttempt } from '../test/sessionResult'
import {
  loadMistakePatterns,
  recordAnswer,
  saveMistakePatterns,
} from './mistakeService'
import { STORAGE_KEYS } from './storageService'

const reviewAnswer = (correct: boolean, patternId: string, extra = {}) =>
  makeAttempt({
    source: 'mistake-review',
    mistakePatternId: patternId,
    selfReportedCorrect: correct,
    operation: 'multiplication',
    firstOperand: 8,
    secondOperand: 6,
    correctAnswer: 48,
    difficulty: 2,
    attemptedAt: '2026-03-05T09:00:00.000Z',
    ...extra,
  })

describe('recordAnswer for review questions', () => {
  it('counts a right answer towards mastering the pattern it came from', () => {
    const pattern = makePattern()
    saveMistakePatterns([pattern])

    expect(recordAnswer(reviewAnswer(true, pattern.id))).toEqual({ ok: true })

    expect(loadMistakePatterns()[0]).toMatchObject({
      id: pattern.id,
      similarCorrectCount: 1,
      mastered: false,
    })
  })

  it('masters the pattern after the default three right answers', () => {
    const pattern = makePattern()
    saveMistakePatterns([pattern])

    for (let i = 0; i < 3; i++) recordAnswer(reviewAnswer(true, pattern.id))

    expect(loadMistakePatterns()[0]).toMatchObject({
      similarCorrectCount: 3,
      mastered: true,
    })
  })

  it('uses the mastery threshold it is given', () => {
    const pattern = makePattern()
    saveMistakePatterns([pattern])

    recordAnswer(reviewAnswer(true, pattern.id), 1)
    expect(loadMistakePatterns()[0].mastered).toBe(true)

    saveMistakePatterns([pattern])
    recordAnswer(reviewAnswer(true, pattern.id), 5)
    recordAnswer(reviewAnswer(true, pattern.id), 5)
    expect(loadMistakePatterns()[0].mastered).toBe(false)
  })

  it('counts a wrong review answer as another miss on the same pattern', () => {
    const pattern = makePattern('multiplication', 8, 7, 2, {
      incorrectCount: 1,
      similarCorrectCount: 2,
    })
    saveMistakePatterns([pattern])

    recordAnswer(reviewAnswer(false, pattern.id))

    const patterns = loadMistakePatterns()
    expect(patterns).toHaveLength(1) // the similar question does not start its own pattern
    expect(patterns[0]).toMatchObject({
      incorrectCount: 2,
      similarCorrectCount: 0,
      lastIncorrectAt: '2026-03-05T09:00:00.000Z',
    })
  })

  it('ignores a review answer if its pattern has been erased', () => {
    saveMistakePatterns([makePattern('addition', 1, 2, 1)])
    recordAnswer(reviewAnswer(true, 'multiplication:8:7:L2'))
    expect(loadMistakePatterns()).toHaveLength(1)
    expect(loadMistakePatterns()[0].id).toBe('addition:1:2:L1')
  })

  it('writes nothing when an answer changes nothing', () => {
    expect(recordAnswer(reviewAnswer(true, 'multiplication:8:7:L2'))).toEqual({
      ok: true,
    })
    expect(window.localStorage.getItem(STORAGE_KEYS.mistakePatterns)).toBeNull()
  })

  it('reports it, without throwing, if the browser will not save', () => {
    const pattern = makePattern()
    saveMistakePatterns([pattern])
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    expect(recordAnswer(reviewAnswer(true, pattern.id))).toEqual({
      ok: false,
      reason: 'unavailable',
    })
  })
})
