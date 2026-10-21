import { describe, expect, it } from 'vitest'
import { seededRng } from '../test/rng'
import { makePattern } from '../test/mistakePatterns'
import type { MistakePattern } from '../types/mistake'
import {
  applyAnswerToPatterns,
  describeReviewSession,
  getActivePatterns,
  getPatternPriority,
  isPatternMastered,
  pickPatternForReview,
} from './mistakeReview'

const NOW = new Date('2026-03-10T12:00:00.000Z')
const HOURS = (h: number) =>
  new Date(NOW.getTime() - h * 3_600_000).toISOString()
const THRESHOLD = 3

const p = (
  first: number,
  extra: Partial<MistakePattern> = {},
  op: 'multiplication' | 'addition' = 'multiplication',
) => makePattern(op, first, 7, 2, { lastIncorrectAt: HOURS(1), ...extra })

describe('mastery', () => {
  it('a pattern is mastered when flagged, or when it has enough correct answers', () => {
    expect(isPatternMastered(p(1), THRESHOLD)).toBe(false)
    expect(isPatternMastered(p(1, { mastered: true }), THRESHOLD)).toBe(true)
    expect(isPatternMastered(p(1, { similarCorrectCount: 2 }), THRESHOLD)).toBe(
      false,
    )
    expect(isPatternMastered(p(1, { similarCorrectCount: 3 }), THRESHOLD)).toBe(
      true,
    )
    expect(isPatternMastered(p(1, { similarCorrectCount: 9 }), THRESHOLD)).toBe(
      true,
    )
  })

  it('follows the threshold setting, so lowering it takes effect straight away', () => {
    const pattern = p(1, { similarCorrectCount: 2 })
    expect(isPatternMastered(pattern, 3)).toBe(false)
    expect(isPatternMastered(pattern, 2)).toBe(true)
    expect(isPatternMastered(pattern, 1)).toBe(true)
  })

  it('getActivePatterns leaves out mastered patterns', () => {
    const active = p(1)
    const flagged = p(2, { mastered: true })
    const counted = p(3, { similarCorrectCount: 3 })
    expect(getActivePatterns([active, flagged, counted], THRESHOLD)).toEqual([
      active,
    ])
  })

  it('getActivePatterns is empty when everything is mastered or there is nothing', () => {
    expect(getActivePatterns([], THRESHOLD)).toEqual([])
    expect(getActivePatterns([p(1, { mastered: true })], THRESHOLD)).toEqual([])
  })
})

describe('getPatternPriority', () => {
  const priority = (pattern: MistakePattern) =>
    getPatternPriority(pattern, THRESHOLD, NOW)

  it('is higher for questions missed more often', () => {
    expect(priority(p(1, { incorrectCount: 4 }))).toBeGreaterThan(
      priority(p(1, { incorrectCount: 1 })),
    )
  })

  it('is higher for questions missed more recently', () => {
    const recent = p(1, { lastIncorrectAt: HOURS(1) })
    const older = p(1, { lastIncorrectAt: HOURS(24 * 5) })
    const ancient = p(1, { lastIncorrectAt: HOURS(24 * 60) })
    expect(priority(recent)).toBeGreaterThan(priority(older))
    expect(priority(older)).toBeGreaterThan(priority(ancient))
  })

  it('is higher when there has been little success in review', () => {
    const none = p(1, { similarCorrectCount: 0 })
    const some = p(1, { similarCorrectCount: 1 })
    const nearly = p(1, { similarCorrectCount: 2 })
    expect(priority(none)).toBeGreaterThan(priority(some))
    expect(priority(some)).toBeGreaterThan(priority(nearly))
  })

  it('is always at least 1, so every active pattern has a chance', () => {
    expect(
      priority(
        p(1, { similarCorrectCount: 2, lastIncorrectAt: HOURS(24 * 3650) }),
      ),
    ).toBeGreaterThanOrEqual(1)
  })

  it('does not let one old trouble spot take over completely', () => {
    expect(priority(p(1, { incorrectCount: 1000 }))).toBe(
      priority(p(1, { incorrectCount: 10 })),
    )
  })

  it('treats a future or missing-time pattern as just missed', () => {
    const future = p(1, {
      lastIncorrectAt: new Date(NOW.getTime() + 86_400_000).toISOString(),
    })
    expect(Number.isFinite(priority(future))).toBe(true)
    expect(priority(future)).toBeCloseTo(
      priority(p(1, { lastIncorrectAt: NOW.toISOString() })),
    )
  })

  it('copes with a threshold of 1 (full progress after one answer)', () => {
    expect(
      getPatternPriority(p(1, { similarCorrectCount: 0 }), 1, NOW),
    ).toBeGreaterThan(
      getPatternPriority(p(1, { similarCorrectCount: 1 }), 1, NOW),
    )
  })
})

describe('pickPatternForReview', () => {
  const options = { threshold: THRESHOLD, now: NOW }

  it('returns null when there is nothing to review', () => {
    expect(pickPatternForReview([], seededRng(1), options)).toBeNull()
    expect(
      pickPatternForReview([p(1, { mastered: true })], seededRng(1), options),
    ).toBeNull()
  })

  it('never picks a mastered pattern', () => {
    const active = p(1)
    const patterns = [
      active,
      p(2, { mastered: true }),
      p(3, { similarCorrectCount: 3 }),
    ]
    const rng = seededRng(2)
    for (let i = 0; i < 100; i++) {
      expect(pickPatternForReview(patterns, rng, options)).toBe(active)
    }
  })

  it('picks the only active pattern even twice in a row', () => {
    const only = p(1)
    expect(
      pickPatternForReview([only], seededRng(3), {
        ...options,
        lastPatternId: only.id,
      }),
    ).toBe(only)
  })

  it('does not repeat the pattern just practised when there is a choice', () => {
    const patterns = [p(1), p(2), p(3)]
    const rng = seededRng(4)
    for (let i = 0; i < 200; i++) {
      const picked = pickPatternForReview(patterns, rng, {
        ...options,
        lastPatternId: patterns[1].id,
      })
      expect(picked?.id).not.toBe(patterns[1].id)
    }
  })

  it('picks high-priority patterns more often', () => {
    const urgent = p(1, { incorrectCount: 8, lastIncorrectAt: HOURS(1) })
    const mild = p(2, {
      incorrectCount: 1,
      lastIncorrectAt: HOURS(24 * 30),
      similarCorrectCount: 2,
    })
    const rng = seededRng(5)
    const counts = new Map<string, number>()
    for (let i = 0; i < 2000; i++) {
      const picked = pickPatternForReview([urgent, mild], rng, options)
      counts.set(picked!.id, (counts.get(picked!.id) ?? 0) + 1)
    }
    expect(counts.get(urgent.id)!).toBeGreaterThan(counts.get(mild.id)! * 2)
    // ...but the mild one still gets turns.
    expect(counts.get(mild.id)!).toBeGreaterThan(50)
  })

  it('shares turns about equally between patterns of the same priority', () => {
    const patterns = [p(1), p(2), p(3), p(4)]
    const rng = seededRng(6)
    const counts = new Map<string, number>()
    for (let i = 0; i < 4000; i++) {
      const picked = pickPatternForReview(patterns, rng, options)
      counts.set(picked!.id, (counts.get(picked!.id) ?? 0) + 1)
    }
    for (const pattern of patterns) {
      expect(counts.get(pattern.id)!).toBeGreaterThan(800)
      expect(counts.get(pattern.id)!).toBeLessThan(1200)
    }
  })

  it('mixes several patterns over a session', () => {
    const patterns = [p(1), p(2), p(3)]
    const rng = seededRng(7)
    const seen = new Set<string>()
    let last: string | null = null
    for (let i = 0; i < 30; i++) {
      const picked: MistakePattern = pickPatternForReview(patterns, rng, {
        ...options,
        lastPatternId: last,
      })!
      seen.add(picked.id)
      last = picked.id
    }
    expect(seen.size).toBe(3)
  })

  it('is repeatable with the same seed', () => {
    const patterns = [p(1), p(2), p(3)]
    expect(pickPatternForReview(patterns, seededRng(9), options)).toBe(
      pickPatternForReview(patterns, seededRng(9), options),
    )
  })

  it('always returns a pattern even at the very top of the random range', () => {
    const patterns = [p(1), p(2)]
    expect(
      pickPatternForReview(patterns, () => 0.999999999, options),
    ).not.toBeNull()
  })
})

describe('describeReviewSession', () => {
  it('lists every operation involved, in the usual order', () => {
    const patterns = [
      makePattern('division', 56, 7),
      makePattern('addition', 4, 5),
      makePattern('division', 12, 3),
    ]
    expect(describeReviewSession(patterns).operations).toEqual([
      'addition',
      'division',
    ])
  })

  it('uses the level most of the mistakes are at', () => {
    const patterns = [
      makePattern('addition', 1, 2, 1),
      makePattern('addition', 3, 4, 3),
      makePattern('addition', 5, 6, 3),
    ]
    expect(describeReviewSession(patterns).difficulty).toBe(3)
  })

  it('uses the lower level when there is a tie', () => {
    const patterns = [
      makePattern('addition', 1, 2, 4),
      makePattern('addition', 3, 4, 2),
    ]
    expect(describeReviewSession(patterns).difficulty).toBe(2)
  })

  it('has a sensible answer for no patterns at all', () => {
    expect(describeReviewSession([])).toEqual({
      operations: ['addition', 'subtraction', 'multiplication', 'division'],
      difficulty: 1,
    })
  })
})

describe('applyAnswerToPatterns', () => {
  const review = (pattern: MistakePattern, correct: boolean, extra = {}) => ({
    source: 'mistake-review' as const,
    mistakePatternId: pattern.id,
    selfReportedCorrect: correct,
    operation: 'multiplication' as const,
    firstOperand: 8,
    secondOperand: 6,
    correctAnswer: 48,
    difficulty: 2 as const,
    attemptedAt: NOW.toISOString(),
    ...extra,
  })

  describe('ordinary questions', () => {
    const regular = (correct: boolean) => ({
      source: 'regular' as const,
      mistakePatternId: undefined,
      selfReportedCorrect: correct,
      operation: 'multiplication' as const,
      firstOperand: 8,
      secondOperand: 7,
      correctAnswer: 56,
      difficulty: 2 as const,
      attemptedAt: NOW.toISOString(),
    })

    it('remembers a wrong answer as a new pattern', () => {
      const result = applyAnswerToPatterns([], regular(false), THRESHOLD)
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 'multiplication:8:7:L2',
        incorrectCount: 1,
      })
    })

    it('adds a miss to an existing pattern', () => {
      const existing = makePattern('multiplication', 8, 7, 2, {
        incorrectCount: 2,
      })
      const result = applyAnswerToPatterns(
        [existing],
        regular(false),
        THRESHOLD,
      )
      expect(result).toHaveLength(1)
      expect(result[0].incorrectCount).toBe(3)
    })

    it('changes nothing for a right answer, and returns the same list', () => {
      const list = [makePattern()]
      expect(applyAnswerToPatterns(list, regular(true), THRESHOLD)).toBe(list)
    })
  })

  describe('a right answer to a review question', () => {
    it('counts towards mastering the pattern it came from', () => {
      const pattern = makePattern()
      const result = applyAnswerToPatterns(
        [pattern],
        review(pattern, true),
        THRESHOLD,
      )
      expect(result[0]).toMatchObject({
        similarCorrectCount: 1,
        mastered: false,
      })
    })

    it('becomes mastered exactly when the threshold is reached', () => {
      let list = [makePattern()]
      const id = list[0].id
      const steps: Array<[number, boolean]> = []
      for (let i = 0; i < THRESHOLD; i++) {
        list = applyAnswerToPatterns(list, review(list[0], true), THRESHOLD)
        steps.push([list[0].similarCorrectCount, list[0].mastered])
      }
      expect(list[0].id).toBe(id)
      expect(steps).toEqual([
        [1, false],
        [2, false],
        [3, true],
      ])
    })

    it('masters a pattern after fewer answers with a lower threshold', () => {
      let list = [makePattern()]
      list = applyAnswerToPatterns(list, review(list[0], true), 1)
      expect(list[0]).toMatchObject({ similarCorrectCount: 1, mastered: true })
    })

    it('masters a pattern after more answers with a higher threshold', () => {
      let list = [makePattern()]
      for (let i = 0; i < 4; i++)
        list = applyAnswerToPatterns(list, review(list[0], true), 5)
      expect(list[0].mastered).toBe(false)
      list = applyAnswerToPatterns(list, review(list[0], true), 5)
      expect(list[0].mastered).toBe(true)
    })

    it('only changes the pattern the question came from', () => {
      const a = makePattern('multiplication', 8, 7)
      const b = makePattern('addition', 4, 5, 1)
      const result = applyAnswerToPatterns([a, b], review(a, true), THRESHOLD)
      expect(result[1]).toEqual(b)
    })

    it('does nothing for a pattern that is already mastered', () => {
      const mastered = makePattern('multiplication', 8, 7, 2, {
        mastered: true,
        similarCorrectCount: 3,
      })
      const list = [mastered]
      expect(
        applyAnswerToPatterns(list, review(mastered, true), THRESHOLD),
      ).toBe(list)
    })
  })

  describe('a wrong answer to a review question', () => {
    it('counts as another miss on the same pattern', () => {
      const pattern = makePattern('multiplication', 8, 7, 2, {
        incorrectCount: 2,
        lastIncorrectAt: HOURS(100),
      })
      const result = applyAnswerToPatterns(
        [pattern],
        review(pattern, false),
        THRESHOLD,
      )

      expect(result).toHaveLength(1) // no new pattern for the similar question
      expect(result[0]).toMatchObject({
        incorrectCount: 3,
        lastIncorrectAt: NOW.toISOString(),
      })
    })

    it('starts progress towards mastery over', () => {
      const pattern = makePattern('multiplication', 8, 7, 2, {
        similarCorrectCount: 2,
      })
      const result = applyAnswerToPatterns(
        [pattern],
        review(pattern, false),
        THRESHOLD,
      )
      expect(result[0]).toMatchObject({
        similarCorrectCount: 0,
        mastered: false,
      })
    })

    it('brings a mastered pattern back', () => {
      const pattern = makePattern('multiplication', 8, 7, 2, {
        mastered: true,
        similarCorrectCount: 3,
      })
      const result = applyAnswerToPatterns(
        [pattern],
        review(pattern, false),
        THRESHOLD,
      )
      expect(result[0]).toMatchObject({
        mastered: false,
        similarCorrectCount: 0,
      })
    })
  })

  describe('edge cases', () => {
    it('ignores a review answer whose pattern no longer exists', () => {
      const gone = makePattern()
      const list: MistakePattern[] = []
      expect(applyAnswerToPatterns(list, review(gone, true), THRESHOLD)).toBe(
        list,
      )
      expect(applyAnswerToPatterns(list, review(gone, false), THRESHOLD)).toBe(
        list,
      )
    })

    it('treats a review answer with no pattern id like an ordinary answer', () => {
      const result = applyAnswerToPatterns(
        [],
        { ...review(makePattern(), false), mistakePatternId: undefined },
        THRESHOLD,
      )
      expect(result).toHaveLength(1)
    })

    it('does not change the list it was given', () => {
      const pattern = makePattern()
      const list = [pattern]
      applyAnswerToPatterns(list, review(pattern, true), THRESHOLD)
      applyAnswerToPatterns(list, review(pattern, false), THRESHOLD)
      expect(list).toEqual([pattern])
      expect(pattern.similarCorrectCount).toBe(0)
    })

    it('a full lifecycle: miss, review three times, mastered, miss again, active again', () => {
      const regular = {
        source: 'regular' as const,
        mistakePatternId: undefined,
        selfReportedCorrect: false,
        operation: 'multiplication' as const,
        firstOperand: 8,
        secondOperand: 7,
        correctAnswer: 56,
        difficulty: 2 as const,
        attemptedAt: NOW.toISOString(),
      }
      let list = applyAnswerToPatterns([], regular, THRESHOLD)
      expect(isPatternMastered(list[0], THRESHOLD)).toBe(false)

      for (let i = 0; i < THRESHOLD; i++) {
        list = applyAnswerToPatterns(list, review(list[0], true), THRESHOLD)
      }
      expect(isPatternMastered(list[0], THRESHOLD)).toBe(true)
      expect(getActivePatterns(list, THRESHOLD)).toEqual([])

      list = applyAnswerToPatterns(list, regular, THRESHOLD)
      expect(isPatternMastered(list[0], THRESHOLD)).toBe(false)
      expect(list[0]).toMatchObject({
        incorrectCount: 2,
        similarCorrectCount: 0,
      })
      expect(getActivePatterns(list, THRESHOLD)).toHaveLength(1)
    })
  })
})
