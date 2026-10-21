import type { PracticeAttempt } from '../types/session'
import type { AppStatistics, OperationStatistics } from '../types/statistics'
import { calculateAccuracy } from '../utils/math'
import { ALL_DIFFICULTIES, ALL_OPERATIONS } from '../utils/operations'
import { loadAttempts, saveAttempt } from './practiceHistory'
import {
  readItem,
  STORAGE_KEYS,
  writeItem,
  type WriteResult,
} from './storageService'

/**
 * Running totals for the statistics page. They are kept up to date one answer
 * at a time (rather than recounted from the saved answers) so they stay right
 * even after old detailed records have been trimmed to save space.
 */

function emptyBucket(): OperationStatistics {
  return { attempted: 0, correct: 0, incorrect: 0 }
}

export function createEmptyStatistics(): AppStatistics {
  return {
    attempted: 0,
    correct: 0,
    incorrect: 0,
    byOperation: {
      addition: emptyBucket(),
      subtraction: emptyBucket(),
      multiplication: emptyBucket(),
      division: emptyBucket(),
    },
    byDifficulty: {
      1: emptyBucket(),
      2: emptyBucket(),
      3: emptyBucket(),
      4: emptyBucket(),
    },
    review: emptyBucket(),
  }
}

function addToBucket(
  bucket: OperationStatistics,
  correct: boolean,
): OperationStatistics {
  return {
    attempted: bucket.attempted + 1,
    correct: bucket.correct + (correct ? 1 : 0),
    incorrect: bucket.incorrect + (correct ? 0 : 1),
  }
}

/** The totals with one more answer counted. The original is not changed. */
export function addAttemptToStatistics(
  stats: AppStatistics,
  attempt: Pick<
    PracticeAttempt,
    'operation' | 'difficulty' | 'selfReportedCorrect' | 'source'
  >,
): AppStatistics {
  const correct = attempt.selfReportedCorrect
  return {
    ...addToBucket(stats, correct),
    review:
      attempt.source === 'mistake-review'
        ? addToBucket(stats.review, correct)
        : stats.review,
    byOperation: {
      ...stats.byOperation,
      [attempt.operation]: addToBucket(
        stats.byOperation[attempt.operation],
        correct,
      ),
    },
    byDifficulty: {
      ...stats.byDifficulty,
      [attempt.difficulty]: addToBucket(
        stats.byDifficulty[attempt.difficulty],
        correct,
      ),
    },
  }
}

/** Counts a whole list of answers from scratch. */
export function statisticsFromAttempts(
  attempts: readonly PracticeAttempt[],
): AppStatistics {
  return attempts.reduce(addAttemptToStatistics, createEmptyStatistics())
}

/** Percent correct, or null when nothing has been attempted. */
export function getAccuracy(
  counts: Pick<OperationStatistics, 'attempted' | 'correct'>,
): number | null {
  return calculateAccuracy(counts.correct, counts.attempted)
}

// ---- Checking saved statistics ----

function parseBucket(value: unknown): OperationStatistics | null {
  if (typeof value !== 'object' || value === null) return null
  const { attempted, correct, incorrect } = value as Record<string, unknown>
  const counts = [attempted, correct, incorrect]
  if (!counts.every((n) => Number.isInteger(n) && (n as number) >= 0)) {
    return null
  }
  if ((correct as number) + (incorrect as number) !== attempted) return null
  return {
    attempted: attempted as number,
    correct: correct as number,
    incorrect: incorrect as number,
  }
}

/** Saved statistics are only trusted if every number adds up. */
export function parseStoredStatistics(value: unknown): AppStatistics | null {
  if (typeof value !== 'object' || value === null) return null
  const saved = value as Record<string, unknown>

  const total = parseBucket(saved)
  if (!total) return null

  const byOperationSaved = saved.byOperation as Record<string, unknown>
  const byDifficultySaved = saved.byDifficulty as Record<string, unknown>
  if (typeof byOperationSaved !== 'object' || byOperationSaved === null) {
    return null
  }
  if (typeof byDifficultySaved !== 'object' || byDifficultySaved === null) {
    return null
  }

  // Totals saved before review statistics existed have no "review" part, so
  // they are rejected and counted again from the saved answers.
  const review = parseBucket(saved.review)
  if (!review || review.attempted > total.attempted) return null

  const result = createEmptyStatistics()
  result.review = review
  result.attempted = total.attempted
  result.correct = total.correct
  result.incorrect = total.incorrect

  for (const operation of ALL_OPERATIONS) {
    const bucket = parseBucket(byOperationSaved[operation])
    if (!bucket) return null
    result.byOperation[operation] = bucket
  }
  for (const level of ALL_DIFFICULTIES) {
    const bucket = parseBucket(byDifficultySaved[level])
    if (!bucket) return null
    result.byDifficulty[level] = bucket
  }

  const sum = (buckets: OperationStatistics[]) =>
    buckets.reduce((n, b) => n + b.attempted, 0)
  if (sum(Object.values(result.byOperation)) !== result.attempted) return null
  if (sum(Object.values(result.byDifficulty)) !== result.attempted) return null

  return result
}

// ---- Saving and loading ----

export function saveStatistics(stats: AppStatistics): WriteResult {
  return writeItem(STORAGE_KEYS.statistics, stats)
}

/**
 * The saved totals. If none are saved (or they are damaged), they are counted
 * again from the saved answers, so the page is never wrong or empty by
 * mistake.
 */
export function loadStatistics(): AppStatistics {
  const saved = readItem(STORAGE_KEYS.statistics, parseStoredStatistics)
  if (saved.status === 'ok') return saved.value
  return statisticsFromAttempts(loadAttempts())
}

/**
 * Saves one answer and counts it in the statistics — exactly once, even if it
 * is passed in again (for example by a repeated update).
 */
export function recordAttempt(attempt: PracticeAttempt): WriteResult {
  const alreadySaved = loadAttempts().some((a) => a.id === attempt.id)
  const saved = saveAttempt(attempt)
  if (!saved.ok || alreadySaved) return saved

  const stored = readItem(STORAGE_KEYS.statistics, parseStoredStatistics)
  const next =
    stored.status === 'ok'
      ? addAttemptToStatistics(stored.value, attempt)
      : // Nothing usable saved: count everything again, including this answer.
        statisticsFromAttempts(loadAttempts())
  return saveStatistics(next)
}
