import type { PracticeAttempt, PracticeSession } from '../types/session'
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
export const MAX_STORED_ATTEMPTS = 5000

/** When the browser is full, this share of the oldest records is dropped. */
const QUOTA_TRIM_SHARE = 0.25

function loadList<T>(
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
function saveList<T>(key: StorageKey, records: T[]): WriteResult {
  const first = writeItem(key, records)
  if (first.ok || first.reason !== 'quota') return first

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

/** Saves answers; any that are already saved are not added a second time. */
export function saveAttempts(attempts: PracticeAttempt[]): WriteResult {
  const saved = loadAttempts()
  const known = new Set(saved.map((a) => a.id))
  const added = attempts.filter((a) => !known.has(a.id))
  if (added.length === 0) return { ok: true }

  return saveList(
    STORAGE_KEYS.attempts,
    [...saved, ...added].slice(-MAX_STORED_ATTEMPTS),
  )
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
  // Not used until mistake tracking exists; listed so a reset clears it too.
  STORAGE_KEYS.mistakePatterns,
] as const

/**
 * Erases all practice history and statistics. Settings are left as they are.
 * Returns false if the browser refused to remove any of it.
 */
export function resetPracticeHistory(): boolean {
  // Try every key even if one fails, rather than stopping at the first.
  return HISTORY_KEYS.map((key) => removeItem(key)).every(Boolean)
}
