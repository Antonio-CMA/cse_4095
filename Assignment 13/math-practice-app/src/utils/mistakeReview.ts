import type { MistakePattern } from '../types/mistake'
import type { DifficultyLevel, MathOperation } from '../types/question'
import type { PracticeAttempt } from '../types/session'
import type { Rng } from './math'
import { recordMistakeInPatterns } from './mistakes'
import { ALL_OPERATIONS } from './operations'

/**
 * The rules for reviewing mistakes: which patterns still need practice, which
 * to practise next, and how answers move a pattern towards "mastered".
 */

// ---- Mastery ----

/**
 * A pattern is mastered once its flag says so, or once the student has
 * answered enough similar questions correctly. (Checking the count as well as
 * the flag means lowering the mastery setting takes effect straight away.)
 */
export function isPatternMastered(
  pattern: MistakePattern,
  threshold: number,
): boolean {
  return pattern.mastered || pattern.similarCorrectCount >= threshold
}

/** The patterns that still need practice. Mastered ones are left out. */
export function getActivePatterns(
  patterns: readonly MistakePattern[],
  threshold: number,
): MistakePattern[] {
  return patterns.filter((pattern) => !isPatternMastered(pattern, threshold))
}

// ---- Priority ----

const DAY_MS = 24 * 60 * 60 * 1000

/** How many misses count towards priority, so one old trouble spot cannot take over. */
const MAX_MISSES_COUNTED = 10

/**
 * How much a pattern needs practice. Higher means sooner. Three things raise it:
 *  - missing it more often,
 *  - missing it more recently (1 for today, falling to half after a day, and so on),
 *  - having little success in review so far.
 * It is always at least 1, so every active pattern has some chance.
 */
export function getPatternPriority(
  pattern: MistakePattern,
  threshold: number,
  now: Date = new Date(),
): number {
  const misses = Math.min(pattern.incorrectCount, MAX_MISSES_COUNTED)
  const daysAgo = Math.max(
    0,
    (now.getTime() - Date.parse(pattern.lastIncorrectAt)) / DAY_MS,
  )
  const recency = 1 / (1 + daysAgo)
  const progress = Math.min(
    1,
    pattern.similarCorrectCount / Math.max(1, threshold),
  )
  return misses + 3 * recency + 2 * (1 - progress)
}

export interface PickOptions {
  threshold: number
  now?: Date
  /** The pattern just practised, skipped when another one is available. */
  lastPatternId?: string | null
}

/**
 * Picks the next pattern to practise, or null if none needs practice. Patterns
 * are chosen at random, weighted by priority: the ones that need it most come
 * up most often, while patterns of similar priority share turns about equally.
 * The same pattern is not picked twice in a row when there is a choice.
 */
export function pickPatternForReview(
  patterns: readonly MistakePattern[],
  rng: Rng,
  { threshold, now = new Date(), lastPatternId = null }: PickOptions,
): MistakePattern | null {
  const active = getActivePatterns(patterns, threshold)
  if (active.length === 0) return null

  const others = active.filter((pattern) => pattern.id !== lastPatternId)
  const pool = others.length > 0 ? others : active

  const weights = pool.map((pattern) =>
    getPatternPriority(pattern, threshold, now),
  )
  const total = weights.reduce((sum, weight) => sum + weight, 0)

  let target = rng() * total
  for (let i = 0; i < pool.length; i++) {
    target -= weights[i]
    if (target < 0) return pool[i]
  }
  return pool[pool.length - 1] // only reached through rounding
}

// ---- Describing a review session ----

/**
 * The operations and level to show for a review session made from these
 * patterns: every operation involved, and the level most of them are at (the
 * lower one if there is a tie).
 */
export function describeReviewSession(patterns: readonly MistakePattern[]): {
  operations: MathOperation[]
  difficulty: DifficultyLevel
} {
  const operations = ALL_OPERATIONS.filter((op) =>
    patterns.some((pattern) => pattern.operation === op),
  )

  const counts = new Map<DifficultyLevel, number>()
  for (const pattern of patterns) {
    counts.set(pattern.difficulty, (counts.get(pattern.difficulty) ?? 0) + 1)
  }
  const levels = [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0] - b[0],
  )

  return {
    operations: operations.length > 0 ? operations : [...ALL_OPERATIONS],
    difficulty: levels[0]?.[0] ?? 1,
  }
}

// ---- Answers ----

type Answer = Pick<
  PracticeAttempt,
  | 'source'
  | 'mistakePatternId'
  | 'selfReportedCorrect'
  | 'operation'
  | 'firstOperand'
  | 'secondOperand'
  | 'correctAnswer'
  | 'difficulty'
  | 'attemptedAt'
>

/**
 * The mistake patterns after one answer.
 *
 * - A wrong answer to an ordinary question remembers the mistake (a new pattern,
 *   or one more miss on an existing one).
 * - A right answer to an ordinary question changes nothing.
 * - A right answer to a review question counts towards mastering the pattern it
 *   came from, and masters it once there are `threshold` of them.
 * - A wrong answer to a review question counts as another miss on that same
 *   pattern (progress starts over; it does not start a new pattern).
 *
 * If nothing changes, the very same list is returned.
 */
export function applyAnswerToPatterns(
  patterns: readonly MistakePattern[],
  answer: Answer,
  threshold: number,
): MistakePattern[] {
  const list = patterns as MistakePattern[]

  if (answer.source === 'mistake-review' && answer.mistakePatternId) {
    const target = list.find((p) => p.id === answer.mistakePatternId)
    // The pattern was erased in the meantime: there is nothing to credit.
    if (!target) return list

    if (answer.selfReportedCorrect) {
      // Mastered patterns are not reviewed; a stray answer changes nothing.
      if (isPatternMastered(target, threshold)) return list
      const count = target.similarCorrectCount + 1
      return list.map((p) =>
        p.id === target.id
          ? { ...p, similarCorrectCount: count, mastered: count >= threshold }
          : p,
      )
    }

    return list.map((p) =>
      p.id === target.id
        ? {
            ...p,
            incorrectCount: p.incorrectCount + 1,
            lastIncorrectAt: answer.attemptedAt,
            similarCorrectCount: 0,
            mastered: false,
          }
        : p,
    )
  }

  if (answer.selfReportedCorrect) return list
  return recordMistakeInPatterns(list, answer)
}
