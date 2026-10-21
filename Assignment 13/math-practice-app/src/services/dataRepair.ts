import { parseActiveSession } from './activeSessionService'
import { loadAttempts } from './practiceHistory'
import { DEFAULT_SETTINGS, sanitizeSettings } from './settingsService'
import {
  parseStoredAttempt,
  parseStoredMistakePattern,
  parseStoredSession,
} from './storageSchemas'
import {
  readItem,
  removeItem,
  STORAGE_KEYS,
  writeItem,
  type StorageKey,
} from './storageService'
import type { SchemaStatus } from './storageMigrations'
import {
  parseStoredStatistics,
  saveStatistics,
  statisticsFromAttempts,
} from './statisticsService'

/**
 * Looks over everything saved in the browser when the app starts, and puts
 * right whatever is damaged, one kind of data at a time. Saved text can be cut
 * short, edited by hand or written by something else, and a problem in one kind
 * (say, the saved answers) must never cost the student another (their
 * settings).
 *
 *  - A whole kind that cannot be read at all is reset.
 *  - A list with a few unusable records keeps the good ones.
 *  - Settings keep every field that is fine; only damaged fields go back to the
 *    starting choice.
 *
 * What it changed is returned, so the student can be told. Totals that are
 * rebuilt and the in-progress session bookmark are fixed quietly: nothing the
 * student cares about is lost with them.
 */

export type DataCategory =
  'settings' | 'sessions' | 'attempts' | 'mistakePatterns'

export interface DataProblem {
  category: DataCategory
  /** "reset": all of it was unusable and was cleared. "repaired": some was kept. */
  action: 'reset' | 'repaired'
  /** How many records (or settings) were thrown away when repaired. */
  dropped: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function repairList(
  key: StorageKey,
  category: DataCategory,
  parseItem: (item: unknown) => unknown,
): DataProblem | null {
  const saved = readItem(key, (value) => (Array.isArray(value) ? value : null))
  if (saved.status === 'empty' || saved.status === 'unavailable') return null

  if (saved.status === 'invalid') {
    removeItem(key)
    return { category, action: 'reset', dropped: 0 }
  }

  const kept = saved.value.map(parseItem).filter((item) => item !== null)
  const dropped = saved.value.length - kept.length
  if (dropped === 0) return null

  writeItem(key, kept)
  return { category, action: 'repaired', dropped }
}

function repairSettings(): DataProblem | null {
  const saved = readItem(STORAGE_KEYS.settings, (value) =>
    isRecord(value) ? value : null,
  )
  if (saved.status === 'empty' || saved.status === 'unavailable') return null

  if (saved.status === 'invalid') {
    removeItem(STORAGE_KEYS.settings)
    return { category: 'settings', action: 'reset', dropped: 0 }
  }

  const clean = sanitizeSettings(saved.value)
  // A setting that is simply not there (saved by an older version) is not
  // damage. One that is there but unusable is.
  const damaged = (Object.keys(DEFAULT_SETTINGS) as (keyof typeof clean)[])
    .filter((name) => saved.value[name] !== undefined)
    .filter(
      (name) =>
        JSON.stringify(saved.value[name]) !== JSON.stringify(clean[name]),
    )
  if (damaged.length === 0) return null

  writeItem(STORAGE_KEYS.settings, clean)
  return { category: 'settings', action: 'repaired', dropped: damaged.length }
}

/** The totals are only a summary of the answers, so they can always be rebuilt. */
function repairStatistics(): void {
  const saved = readItem(STORAGE_KEYS.statistics, parseStoredStatistics)
  if (saved.status !== 'invalid') return
  saveStatistics(statisticsFromAttempts(loadAttempts()))
}

function repairActiveSession(): void {
  const saved = readItem(STORAGE_KEYS.activeSession, parseActiveSession)
  if (saved.status === 'invalid') removeItem(STORAGE_KEYS.activeSession)
}

/**
 * Checks and repairs the saved data. Data written by a newer version of the app,
 * or that could not be brought up to date, is left strictly alone: it may be
 * fine, and clearing it would lose it.
 */
export function repairStoredData(schema: SchemaStatus): DataProblem[] {
  if (schema === 'newer' || schema === 'failed' || schema === 'unavailable') {
    return []
  }

  // The answers first, because the totals are rebuilt from them.
  const problems = [
    repairList(STORAGE_KEYS.attempts, 'attempts', parseStoredAttempt),
    repairList(STORAGE_KEYS.sessions, 'sessions', parseStoredSession),
    repairList(
      STORAGE_KEYS.mistakePatterns,
      'mistakePatterns',
      parseStoredMistakePattern,
    ),
    repairSettings(),
  ].filter((problem): problem is DataProblem => problem !== null)

  repairStatistics()
  repairActiveSession()
  return problems
}
