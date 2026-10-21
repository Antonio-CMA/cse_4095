import { describe, expect, it } from 'vitest'
import { makeAttempt } from '../test/sessionResult'
import {
  loadAttempts,
  MAX_STORED_ATTEMPTS,
  saveAttempts,
} from './practiceHistory'
import {
  addAttemptToStatistics,
  createEmptyStatistics,
  loadStatistics,
  parseStoredStatistics,
  recordAttempt,
  saveStatistics,
  statisticsFromAttempts,
} from './statisticsService'
import { STORAGE_KEYS } from './storageService'

const review = (correct: boolean, extra = {}) =>
  makeAttempt({
    source: 'mistake-review',
    mistakePatternId: 'multiplication:8:7:L2',
    selfReportedCorrect: correct,
    ...extra,
  })
const regular = (correct: boolean) =>
  makeAttempt({ source: 'regular', selfReportedCorrect: correct })

describe('review statistics', () => {
  it('start at zero', () => {
    expect(createEmptyStatistics().review).toEqual({
      attempted: 0,
      correct: 0,
      incorrect: 0,
    })
  })

  it('count review answers separately, and still count them in the totals', () => {
    let stats = createEmptyStatistics()
    stats = addAttemptToStatistics(stats, review(true))
    stats = addAttemptToStatistics(stats, review(false))
    stats = addAttemptToStatistics(stats, regular(true))

    expect(stats.review).toEqual({ attempted: 2, correct: 1, incorrect: 1 })
    expect(stats).toMatchObject({ attempted: 3, correct: 2, incorrect: 1 })
  })

  it('ignore ordinary answers', () => {
    const stats = addAttemptToStatistics(
      createEmptyStatistics(),
      regular(false),
    )
    expect(stats.review).toEqual({ attempted: 0, correct: 0, incorrect: 0 })
  })

  it('are included when counting a list of answers from scratch', () => {
    const stats = statisticsFromAttempts([
      review(true),
      review(true),
      regular(false),
    ])
    expect(stats.review).toEqual({ attempted: 2, correct: 2, incorrect: 0 })
  })

  it('do not change the statistics they were added to', () => {
    const before = createEmptyStatistics()
    addAttemptToStatistics(before, review(true))
    expect(before.review.attempted).toBe(0)
  })
})

describe('saved statistics with review totals', () => {
  const good = () =>
    statisticsFromAttempts([review(true), review(false), regular(true)])

  it('survive being saved and loaded', () => {
    saveStatistics(good())
    expect(loadStatistics().review).toEqual({
      attempted: 2,
      correct: 1,
      incorrect: 1,
    })
  })

  it('are required: totals without them are rebuilt from the saved answers', () => {
    saveAttempts([review(true), review(true), regular(true)])
    const { review: _dropped, ...withoutReview } = good()
    expect(_dropped).toBeDefined()
    window.localStorage.setItem(
      STORAGE_KEYS.statistics,
      JSON.stringify(withoutReview),
    )

    expect(parseStoredStatistics(withoutReview)).toBeNull()
    expect(loadStatistics().review).toEqual({
      attempted: 2,
      correct: 2,
      incorrect: 0,
    })
  })

  it.each([
    ['not adding up', { attempted: 2, correct: 5, incorrect: 0 }],
    ['negative', { attempted: -1, correct: 0, incorrect: -1 }],
    ['more than all the answers', { attempted: 9, correct: 9, incorrect: 0 }],
    ['not a bucket', 'many'],
  ])('are rejected when %s', (_label, bad) => {
    expect(parseStoredStatistics({ ...good(), review: bad })).toBeNull()
  })
})

describe('recordAttempt and review answers', () => {
  it('counts a review answer in the review totals', () => {
    recordAttempt(review(true))
    recordAttempt(review(false))
    recordAttempt(regular(true))

    expect(loadStatistics().review).toEqual({
      attempted: 2,
      correct: 1,
      incorrect: 1,
    })
  })

  it('counts a review answer only once', () => {
    const answer = review(true)
    recordAttempt(answer)
    recordAttempt(answer)
    expect(loadStatistics().review.attempted).toBe(1)
  })

  it('keeps counting after old detailed answers have been trimmed away', () => {
    const many = Array.from({ length: MAX_STORED_ATTEMPTS }, (_, i) =>
      i % 2 === 0 ? review(true) : regular(true),
    )
    saveAttempts(many)
    saveStatistics(statisticsFromAttempts(many))
    const reviewBefore = loadStatistics().review.attempted

    recordAttempt(review(true))

    expect(loadAttempts()).toHaveLength(MAX_STORED_ATTEMPTS)
    expect(loadStatistics().review.attempted).toBe(reviewBefore + 1)
  })
})
