import type { PracticeAttempt } from '../types/session'
import type { AppStatistics, OperationStatistics } from '../types/statistics'
import { calculateAccuracy } from '../utils/math'
import { ALL_DIFFICULTIES, ALL_OPERATIONS } from '../utils/operations'
import { addAttempts, loadAttempts } from './practiceHistory'
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

// ---- Archived totals ----

function addBuckets(
  a: OperationStatistics,
  b: OperationStatistics,
): OperationStatistics {
  return {
    attempted: a.attempted + b.attempted,
    correct: a.correct + b.correct,
    incorrect: a.incorrect + b.incorrect,
  }
}

/** Two sets of totals added together. Neither is changed. */
export function addStatistics(
  a: AppStatistics,
  b: AppStatistics,
): AppStatistics {
  const result = createEmptyStatistics()
  Object.assign(result, addBuckets(a, b))
  result.review = addBuckets(a.review, b.review)
  for (const operation of ALL_OPERATIONS) {
    result.byOperation[operation] = addBuckets(
      a.byOperation[operation],
      b.byOperation[operation],
    )
  }
  for (const level of ALL_DIFFICULTIES) {
    result.byDifficulty[level] = addBuckets(
      a.byDifficulty[level],
      b.byDifficulty[level],
    )
  }
  return result
}

/**
 * The totals for answers that have been dropped from the detailed list (it only
 * keeps the newest few). With these, the totals can still be counted again
 * correctly if they are ever lost or damaged. Empty if there are none.
 */
export function loadArchivedStatistics(): AppStatistics {
  const saved = readItem(STORAGE_KEYS.attemptArchive, parseStoredStatistics)
  return saved.status === 'ok' ? saved.value : createEmptyStatistics()
}

/** Folds answers that are about to be forgotten into the archived totals. */
function archiveAttempts(trimmed: readonly PracticeAttempt[]): WriteResult {
  return writeItem(
    STORAGE_KEYS.attemptArchive,
    addStatistics(loadArchivedStatistics(), statisticsFromAttempts(trimmed)),
  )
}

/**
 * The totals counted again from scratch: everything archived, plus every answer
 * still saved in detail. Nothing is lost by the detailed list being trimmed.
 */
export function rebuildStatistics(): AppStatistics {
  return addStatistics(
    loadArchivedStatistics(),
    statisticsFromAttempts(loadAttempts()),
  )
}

/**
 * The saved totals. If none are saved (or they are damaged), they are counted
 * again from the archive and the saved answers, so the page is never wrong or
 * empty by mistake.
 */
export function loadStatistics(): AppStatistics {
  const saved = readItem(STORAGE_KEYS.statistics, parseStoredStatistics)
  if (saved.status === 'ok') return saved.value
  return rebuildStatistics()
}

export interface RecordedAttempt {
  /** False if this answer had already been recorded, so nothing changed. */
  isNew: boolean
  result: WriteResult
}

/**
 * Saves one answer and counts it in the statistics, exactly once even if it is
 * passed in again. Answers pushed out of the detailed list are first added to
 * the archived totals, so no total is ever lost to trimming.
 */
export function recordAttemptOnce(attempt: PracticeAttempt): RecordedAttempt {
  const { added, trimmed, result } = addAttempts([attempt])
  if (!result.ok || added === 0) return { isNew: added > 0, result }

  // Archived before anything is counted again, so a recount includes them.
  if (trimmed.length > 0) archiveAttempts(trimmed)

  const stored = readItem(STORAGE_KEYS.statistics, parseStoredStatistics)
  const next =
    stored.status === 'ok'
      ? addAttemptToStatistics(stored.value, attempt)
      : // Nothing usable saved: count everything again, including this answer.
        rebuildStatistics()
  return { isNew: true, result: saveStatistics(next) }
}

/** `recordAttemptOnce`, for callers that only need to know if it was saved. */
export function recordAttempt(attempt: PracticeAttempt): WriteResult {
  return recordAttemptOnce(attempt).result
}
