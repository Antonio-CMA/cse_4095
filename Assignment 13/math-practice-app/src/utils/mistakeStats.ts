import type { MistakePattern } from '../types/mistake'
import type { MathOperation } from '../types/question'
import type { AppStatistics } from '../types/statistics'
import { isPatternMastered } from './mistakeReview'
import { ALL_OPERATIONS } from './operations'

/** The patterns still being practised, and the ones already mastered. */
export function splitByMastery(
  patterns: readonly MistakePattern[],
  threshold: number,
): { active: MistakePattern[]; mastered: MistakePattern[] } {
  const active: MistakePattern[] = []
  const mastered: MistakePattern[] = []
  for (const pattern of patterns) {
    ;(isPatternMastered(pattern, threshold) ? mastered : active).push(pattern)
  }
  return { active, mastered }
}

/**
 * The patterns with the most misses first. Patterns with the same number of
 * misses are ordered by how recently they were missed (latest first), and then
 * by id, so the order is always the same for the same data.
 */
export function sortPatternsByMisses(
  patterns: readonly MistakePattern[],
): MistakePattern[] {
  return [...patterns].sort(
    (a, b) =>
      b.incorrectCount - a.incorrectCount ||
      Date.parse(b.lastIncorrectAt) - Date.parse(a.lastIncorrectAt) ||
      a.id.localeCompare(b.id),
  )
}

/** The number facts missed most often (all of them, mastered or not). */
export function getMostMissedFacts(
  patterns: readonly MistakePattern[],
  limit = 5,
): MistakePattern[] {
  return sortPatternsByMisses(patterns).slice(0, limit)
}

export interface MostMissedOperations {
  /** Every operation sharing the highest number of misses (usually one). */
  operations: MathOperation[]
  misses: number
}

/**
 * The operation(s) with the most wrong answers, or null if nothing has been
 * missed. A tie returns every tied operation rather than picking one unfairly.
 */
export function getMostMissedOperations(
  statistics: Pick<AppStatistics, 'byOperation'>,
): MostMissedOperations | null {
  const misses = Math.max(
    ...ALL_OPERATIONS.map((op) => statistics.byOperation[op].incorrect),
  )
  if (misses <= 0) return null
  return {
    operations: ALL_OPERATIONS.filter(
      (op) => statistics.byOperation[op].incorrect === misses,
    ),
    misses,
  }
}

/** How far a pattern is towards mastery: `done` right answers of `needed`. */
export function getMasteryProgress(
  pattern: MistakePattern,
  threshold: number,
): { done: number; needed: number } {
  const needed = Math.max(1, threshold)
  return {
    done: isPatternMastered(pattern, threshold)
      ? needed
      : Math.min(pattern.similarCorrectCount, needed),
    needed,
  }
}
