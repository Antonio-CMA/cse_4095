import type { PracticeAttempt, PracticeSession } from '../types/session'
import { reportStorageFailure } from './storageFailures'
import {
  parseStoredAttempt,
  parseStoredList,
  parseStoredSession,
} from './storageSchemas'
import {
  readItem,
  removeItem,
  STORAGE_KEYS,
  writeItem,
  type StorageKey,
  type WriteResult,
} from './storageService'

/**
 * Practice history kept in the browser: finished and in-progress sessions, and
 * every answer given. Detailed records are capped so storage stays small; the
 * oldest ones are dropped first (aggregate totals are kept separately, in the
 * statistics, so they are not lost when old detail is trimmed).
 */
export const MAX_STORED_SESSIONS = 200
/**
 * How many individual answers are kept in detail. Nothing shows them: the
 * statistics are running totals, and what is dropped is folded into an archive
 * total (see statisticsService), so only the newest are worth keeping. Fewer
 * makes each answer cheaper to save, because the whole list is read and
 * rewritten every time. Measured in a desktop browser: about 3 ms per answer
 * with 1,000 kept, against about 44 ms with 5,000 (the old limit), where each
 * answer also read the list three times. Phones are several times slower.
 */
export const MAX_STORED_ATTEMPTS = 1000

/** When the browser is full, this share of the oldest records is dropped. */
const QUOTA_TRIM_SHARE = 0.25

/** Reads a saved list, skipping damaged records. Empty if nothing usable. */
export function loadList<T>(
  key: StorageKey,
  parseItem: (item: unknown) => T | null,
): T[] {
  const result = readItem(key, (value) => parseStoredList(value, parseItem))
  return result.status === 'ok' ? result.value : []
}

/**
 * Saves a list, and if the browser says it is full, drops some of the oldest
 * records and tries once more so the newest data still gets saved.
 */
export function saveList<T>(key: StorageKey, records: T[]): WriteResult {
  // Not reported yet: a full browser is often fixed by the trimmed retry below.
  const first = writeItem(key, records, { quiet: true })
  if (first.ok) return first
  if (first.reason !== 'quota') {
    reportStorageFailure(first.reason)
    return first
  }

  const keep = records.slice(Math.ceil(records.length * QUOTA_TRIM_SHARE))
  return writeItem(key, keep.length > 0 ? keep : records.slice(-1))
}

// ---- Sessions ----

/** All saved sessions, oldest first. Damaged records are skipped. */
export function loadSessions(): PracticeSession[] {
  return loadList(STORAGE_KEYS.sessions, parseStoredSession)
}

/** The most recent sessions, newest first. */
export function loadRecentSessions(limit = 10): PracticeSession[] {
  return [...loadSessions()]
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
    .slice(0, limit)
}

/**
 * Saves a session, replacing the saved copy if this session is already there
 * (so progress and completion details update the same record).
 */
export function saveSession(session: PracticeSession): WriteResult {
  const sessions = loadSessions()
  const index = sessions.findIndex((s) => s.id === session.id)
  if (index >= 0) sessions[index] = session
  else sessions.push(session)

  const newest = [...sessions]
    .sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt))
    .slice(-MAX_STORED_SESSIONS)
  return saveList(STORAGE_KEYS.sessions, newest)
}

// ---- Attempts ----

/** All saved attempts, oldest first. Damaged records are skipped. */
export function loadAttempts(): PracticeAttempt[] {
  return loadList(STORAGE_KEYS.attempts, parseStoredAttempt)
}

export interface AddedAttempts {
  /** How many of the answers were new (the rest were already saved). */
  added: number
  /**
   * Older answers pushed out to keep the list within its limit, and now gone
   * from storage. Empty if nothing was dropped or the save failed.
   */
  trimmed: PracticeAttempt[]
  result: WriteResult
}

/**
 * Saves answers; any that are already saved are not added a second time. Only
 * the newest MAX_STORED_ATTEMPTS are kept. The saved list is read once, which
 * is what makes this the cost of each answer, so it is kept to a single pass.
 */
export function addAttempts(attempts: PracticeAttempt[]): AddedAttempts {
  const saved = loadAttempts()
  const known = new Set(saved.map((a) => a.id))
  const fresh = attempts.filter((a) => !known.has(a.id))
  if (fresh.length === 0) return { added: 0, trimmed: [], result: { ok: true } }

  const all = [...saved, ...fresh]
  const kept = all.slice(-MAX_STORED_ATTEMPTS)
  const result = saveList(STORAGE_KEYS.attempts, kept)
  return {
    added: fresh.length,
    trimmed: result.ok ? all.slice(0, all.length - kept.length) : [],
    result,
  }
}

/**
 * Saves answers, dropping the oldest beyond the limit. This does not remember
 * what was dropped: `recordAttempt` (statisticsService) does, so use that for
 * real answers.
 */
export function saveAttempts(attempts: PracticeAttempt[]): WriteResult {
  return addAttempts(attempts).result
}

export function saveAttempt(attempt: PracticeAttempt): WriteResult {
  return saveAttempts([attempt])
}

// ---- Reset ----

/** Everything that makes up the student's practice history. */
const HISTORY_KEYS = [
  STORAGE_KEYS.sessions,
  STORAGE_KEYS.attempts,
  STORAGE_KEYS.statistics,
  STORAGE_KEYS.mistakePatterns,
  STORAGE_KEYS.attemptArchive,
  // A session still in progress would otherwise bring erased answers back.
  STORAGE_KEYS.activeSession,
] as const

/**
 * Erases all practice history and statistics. Settings are left as they are.
 * Returns false if the browser refused to remove any of it.
 */
export function resetPracticeHistory(): boolean {
  // Try every key even if one fails, rather than stopping at the first.
  return HISTORY_KEYS.map((key) => removeItem(key)).every(Boolean)
}
