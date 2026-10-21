import type { MistakePattern } from '../types/mistake'
import type { PracticeAttempt } from '../types/session'
import {
  mergeDuplicatePatterns,
  recordMistakeInPatterns,
} from '../utils/mistakes'
import { loadList, saveList } from './practiceHistory'
import { parseStoredMistakePattern } from './storageSchemas'
import { STORAGE_KEYS, type WriteResult } from './storageService'

/**
 * Mistake patterns kept in the browser. The cap keeps storage small; when it
 * is exceeded the patterns already mastered, then the least recent, go first.
 */
export const MAX_STORED_MISTAKE_PATTERNS = 1000

/**
 * All saved mistake patterns. Damaged records are skipped, and records that
 * describe the same mistake are merged into one.
 */
export function loadMistakePatterns(): MistakePattern[] {
  return mergeDuplicatePatterns(
    loadList(STORAGE_KEYS.mistakePatterns, parseStoredMistakePattern),
  )
}

/** The patterns that are worth keeping, if there are too many. */
function keepMostUseful(patterns: MistakePattern[]): MistakePattern[] {
  if (patterns.length <= MAX_STORED_MISTAKE_PATTERNS) return patterns
  return [...patterns]
    .sort((a, b) => {
      if (a.mastered !== b.mastered) return a.mastered ? 1 : -1
      return Date.parse(b.lastIncorrectAt) - Date.parse(a.lastIncorrectAt)
    })
    .slice(0, MAX_STORED_MISTAKE_PATTERNS)
}

export function saveMistakePatterns(patterns: MistakePattern[]): WriteResult {
  return saveList(STORAGE_KEYS.mistakePatterns, keepMostUseful(patterns))
}

/**
 * Remembers a wrong answer: starts a mistake pattern for a question missed for
 * the first time, or updates the existing one. Answers given correctly are
 * ignored.
 *
 * This counts the answer it is given, so callers must pass each answer once
 * (see `recordPracticeAttempt`).
 */
export function recordMistake(attempt: PracticeAttempt): WriteResult {
  if (attempt.selfReportedCorrect) return { ok: true }
  return saveMistakePatterns(
    recordMistakeInPatterns(loadMistakePatterns(), attempt),
  )
}
