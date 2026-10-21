import { describe, expect, it } from 'vitest'
import { makePattern } from '../test/mistakePatterns'
import { seededRng } from '../test/rng'
import type { PracticeConfig } from '../types/session'
import { isValidQuestion } from '../utils/validation'
import { saveMistakePatterns } from './mistakeService'
import {
  afterShowing,
  createPracticePlan,
  nextReviewQuestion,
  type ReviewState,
} from './reviewSession'
import { getProblemKey } from './similarQuestionGenerator'

const THRESHOLD = 3

const config = (overrides: Partial<PracticeConfig> = {}): PracticeConfig => ({
  operations: ['addition', 'subtraction', 'multiplication', 'division'],
  difficulty: 1,
  sessionLength: 10,
  reviewMode: 'mistake-review',
  ...overrides,
})

describe('nextReviewQuestion', () => {
  const state = (patterns = [makePattern()]): ReviewState => ({
    patterns,
    recentKeys: [],
    lastPatternId: null,
  })

  it('makes a review question from one of the mistakes', () => {
    const pattern = makePattern()
    const result = nextReviewQuestion(state([pattern]), THRESHOLD, seededRng(1))

    expect(result).not.toBeNull()
    expect(result!.patternId).toBe(pattern.id)
    expect(result!.question.source).toBe('mistake-review')
    expect(result!.question.mistakePatternId).toBe(pattern.id)
    expect(isValidQuestion(result!.question)).toBe(true)
  })

  it('records which pattern each question came from, across several patterns', () => {
    const patterns = [
      makePattern('multiplication', 8, 7),
      makePattern('addition', 14, 9, 2),
      makePattern('division', 56, 7, 2),
    ]
    const ids = new Set(patterns.map((p) => p.id))
    const rng = seededRng(2)
    const seen = new Set<string>()
    for (let i = 0; i < 40; i++) {
      const result = nextReviewQuestion(state(patterns), THRESHOLD, rng)!
      expect(ids.has(result.patternId)).toBe(true)
      expect(result.question.mistakePatternId).toBe(result.patternId)
      seen.add(result.patternId)
    }
    expect(seen.size).toBe(3)
  })

  it('returns null when every mistake has been mastered', () => {
    expect(
      nextReviewQuestion(
        state([makePattern('multiplication', 8, 7, 2, { mastered: true })]),
        THRESHOLD,
        seededRng(3),
      ),
    ).toBeNull()
  })

  it('returns null when there are no mistakes', () => {
    expect(nextReviewQuestion(state([]), THRESHOLD, seededRng(4))).toBeNull()
  })

  it('does not use mastered patterns', () => {
    const active = makePattern('addition', 14, 9, 2)
    const patterns = [
      makePattern('multiplication', 8, 7, 2, { mastered: true }),
      active,
    ]
    const rng = seededRng(5)
    for (let i = 0; i < 40; i++) {
      expect(
        nextReviewQuestion(state(patterns), THRESHOLD, rng)!.patternId,
      ).toBe(active.id)
    }
  })

  it('avoids the problems shown recently', () => {
    const pattern = makePattern('multiplication', 8, 7)
    const recent = ['multiplication:7:8', 'division:56:7', 'division:56:8']
    const rng = seededRng(6)
    for (let i = 0; i < 80; i++) {
      const { question } = nextReviewQuestion(
        { patterns: [pattern], recentKeys: recent, lastPatternId: null },
        THRESHOLD,
        rng,
      )!
      expect(recent).not.toContain(getProblemKey(question))
    }
  })

  it('does not repeat the last pattern when there is another', () => {
    const a = makePattern('multiplication', 8, 7)
    const b = makePattern('addition', 14, 9, 2)
    const rng = seededRng(7)
    for (let i = 0; i < 40; i++) {
      expect(
        nextReviewQuestion(
          { patterns: [a, b], recentKeys: [], lastPatternId: a.id },
          THRESHOLD,
          rng,
        )!.patternId,
      ).toBe(b.id)
    }
  })
})

describe('afterShowing', () => {
  const shown = (pattern = makePattern()) =>
    nextReviewQuestion(
      { patterns: [pattern], recentKeys: [], lastPatternId: null },
      THRESHOLD,
      seededRng(8),
    )!

  it('remembers the question and which pattern it came from', () => {
    const first = shown()
    const next = afterShowing(
      { patterns: [], recentKeys: [], lastPatternId: null },
      first,
    )
    expect(next.recentKeys).toEqual([getProblemKey(first.question)])
    expect(next.lastPatternId).toBe(first.patternId)
  })

  it('only remembers the most recent few problems', () => {
    let state: ReviewState = {
      patterns: [],
      recentKeys: [],
      lastPatternId: null,
    }
    const keys: string[] = []
    for (let i = 0; i < 12; i++) {
      const item = shown(makePattern('multiplication', 8, 7, 2))
      keys.push(getProblemKey(item.question))
      state = afterShowing(state, item)
    }
    expect(state.recentKeys).toHaveLength(6)
    expect(state.recentKeys).toEqual(keys.slice(-6))
  })

  it('does not change the state it was given', () => {
    const before: ReviewState = {
      patterns: [],
      recentKeys: ['a'],
      lastPatternId: null,
    }
    afterShowing(before, shown())
    expect(before.recentKeys).toEqual(['a'])
  })
})

describe('createPracticePlan', () => {
  it('makes an ordinary question for regular practice', () => {
    const plan = createPracticePlan(
      config({
        reviewMode: 'regular',
        operations: ['addition'],
        difficulty: 2,
      }),
      THRESHOLD,
      seededRng(9),
    )
    expect(plan.review).toBeNull()
    expect(plan.firstQuestion.source).toBe('regular')
    expect(plan.firstQuestion.operation).toBe('addition')
    expect(plan.firstQuestion.difficulty).toBe(2)
    expect(plan.config.reviewMode).toBe('regular')
  })

  it('makes a review question from the saved mistakes', () => {
    saveMistakePatterns([makePattern('multiplication', 8, 7, 3)])
    const plan = createPracticePlan(config(), THRESHOLD, seededRng(10))

    expect(plan.review).not.toBeNull()
    expect(plan.firstQuestion.source).toBe('mistake-review')
    expect(plan.firstQuestion.difficulty).toBe(3)
    expect(plan.config.reviewMode).toBe('mistake-review')
  })

  it('describes the session by the mistakes, not by the setup that was passed in', () => {
    saveMistakePatterns([
      makePattern('multiplication', 8, 7, 3),
      makePattern('division', 56, 7, 3),
      makePattern('addition', 4, 5, 1),
    ])
    const plan = createPracticePlan(
      config({ operations: ['subtraction'], difficulty: 4 }),
      THRESHOLD,
      seededRng(11),
    )

    expect(plan.config.operations).toEqual([
      'addition',
      'multiplication',
      'division',
    ])
    expect(plan.config.difficulty).toBe(3)
  })

  it('keeps the session length from the setup', () => {
    saveMistakePatterns([makePattern()])
    expect(
      createPracticePlan(config({ sessionLength: 20 }), THRESHOLD).config
        .sessionLength,
    ).toBe(20)
    expect(
      createPracticePlan(config({ sessionLength: 'continuous' }), THRESHOLD)
        .config.sessionLength,
    ).toBe('continuous')
  })

  it('starts the review state with the first question and pattern remembered', () => {
    saveMistakePatterns([makePattern()])
    const plan = createPracticePlan(config(), THRESHOLD, seededRng(12))
    expect(plan.review!.lastPatternId).toBe(plan.firstQuestion.mistakePatternId)
    expect(plan.review!.recentKeys).toEqual([getProblemKey(plan.firstQuestion)])
    expect(plan.review!.patterns).toHaveLength(1)
  })

  it('leaves out mastered mistakes', () => {
    saveMistakePatterns([
      makePattern('multiplication', 8, 7, 2, { mastered: true }),
      makePattern('addition', 14, 9, 2),
    ])
    const plan = createPracticePlan(config(), THRESHOLD, seededRng(13))
    expect(plan.config.operations).toEqual(['addition'])
    expect(plan.firstQuestion.mistakePatternId).toBe(
      makePattern('addition', 14, 9, 2).id,
    )
  })

  it('quietly becomes regular practice if there is nothing to review', () => {
    const plan = createPracticePlan(
      config({ operations: ['division'], difficulty: 2 }),
      THRESHOLD,
      seededRng(14),
    )
    expect(plan.review).toBeNull()
    expect(plan.config.reviewMode).toBe('regular')
    expect(plan.firstQuestion.source).toBe('regular')
    expect(plan.firstQuestion.operation).toBe('division')
  })

  it('becomes regular practice if every mistake is mastered', () => {
    saveMistakePatterns([
      makePattern('multiplication', 8, 7, 2, { mastered: true }),
    ])
    const plan = createPracticePlan(config(), THRESHOLD, seededRng(15))
    expect(plan.review).toBeNull()
    expect(plan.config.reviewMode).toBe('regular')
  })

  it('uses the mastery threshold to decide what is still active', () => {
    saveMistakePatterns([
      makePattern('multiplication', 8, 7, 2, { similarCorrectCount: 2 }),
    ])
    expect(createPracticePlan(config(), 3, seededRng(16)).review).not.toBeNull()
    expect(createPracticePlan(config(), 2, seededRng(16)).review).toBeNull()
  })
})
