/**
 * A small, careful wrapper around `localStorage`. Browsers can refuse storage
 * (private windows, blocked site data), run out of room, or hand back data that
 * has been damaged or edited, so nothing in here ever throws: every call says
 * what happened instead, and the app carries on either way.
 */

import { reportStorageFailure } from './storageFailures'

const KEY_PREFIX = 'mathPractice.'

export const STORAGE_KEYS = {
  settings: 'mathPractice.settings',
  sessions: 'mathPractice.sessions',
  attempts: 'mathPractice.attempts',
  mistakePatterns: 'mathPractice.mistakePatterns',
  statistics: 'mathPractice.statistics',
  /** The practice session in progress, kept so a refresh can pick it up. */
  activeSession: 'mathPractice.activeSession',
  version: 'mathPractice.version',
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]

export type ReadResult<T> =
  | { status: 'ok'; value: T }
  /** Nothing has been saved under this key yet. */
  | { status: 'empty' }
  /** Something is saved, but it is not valid JSON or fails the checks. */
  | { status: 'invalid' }
  /** The browser would not let us look. */
  | { status: 'unavailable' }

export type WriteFailure = 'unavailable' | 'quota' | 'error'

export type WriteResult = { ok: true } | { ok: false; reason: WriteFailure }

function getStore(): Storage | null {
  try {
    return window.localStorage ?? null
  } catch {
    return null
  }
}

function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      error.code === 22 ||
      error.code === 1014)
  )
}

/** True if the browser lets us save and remove data. */
export function isStorageAvailable(): boolean {
  const store = getStore()
  if (!store) return false
  const probe = `${KEY_PREFIX}__probe__`
  try {
    store.setItem(probe, '1')
    store.removeItem(probe)
    return true
  } catch {
    return false
  }
}

/**
 * Reads and checks one saved item. `parse` turns the decoded JSON into the
 * wanted type, or returns null if it is not acceptable.
 */
export function readItem<T>(
  key: StorageKey,
  parse: (value: unknown) => T | null,
): ReadResult<T> {
  let raw: string | null
  try {
    const store = getStore()
    if (!store) return { status: 'unavailable' }
    raw = store.getItem(key)
  } catch {
    return { status: 'unavailable' }
  }
  if (raw === null) return { status: 'empty' }

  let decoded: unknown
  try {
    decoded = JSON.parse(raw)
  } catch {
    return { status: 'invalid' }
  }

  let value: T | null
  try {
    value = parse(decoded)
  } catch {
    return { status: 'invalid' }
  }
  return value === null ? { status: 'invalid' } : { status: 'ok', value }
}

/**
 * Saves one item as JSON, reporting (not throwing) if it could not be saved. A
 * failure is also passed on so the student can be told, unless the caller means
 * to try again and will report it itself if that fails too (`quiet`).
 */
export function writeItem(
  key: StorageKey,
  value: unknown,
  { quiet = false }: { quiet?: boolean } = {},
): WriteResult {
  const fail = (reason: WriteFailure): WriteResult => {
    if (!quiet) reportStorageFailure(reason)
    return { ok: false, reason }
  }

  let json: string
  try {
    json = JSON.stringify(value)
  } catch {
    return fail('error')
  }

  const store = getStore()
  if (!store) return fail('unavailable')
  try {
    store.setItem(key, json)
    return { ok: true }
  } catch (error) {
    return fail(isQuotaError(error) ? 'quota' : 'unavailable')
  }
}

/** Removes one saved item. Returns false if the browser refused. */
export function removeItem(key: StorageKey): boolean {
  try {
    const store = getStore()
    if (!store) return false
    store.removeItem(key)
    return true
  } catch {
    return false
  }
}

function appKeys(store: Storage): string[] {
  const keys: string[] = []
  for (let i = 0; i < store.length; i++) {
    const key = store.key(i)
    if (key !== null && key.startsWith(KEY_PREFIX)) keys.push(key)
  }
  return keys
}

/** True if any of this app's own data (other than the version) is saved. */
export function hasAppData(): boolean {
  try {
    const store = getStore()
    if (!store) return false
    return appKeys(store).some((key) => key !== STORAGE_KEYS.version)
  } catch {
    return false
  }
}

/**
 * Removes everything this app has saved, and nothing else — other sites'
 * data and any unrelated keys on this origin are left alone.
 */
export function clearAppData(): boolean {
  try {
    const store = getStore()
    if (!store) return false
    for (const key of appKeys(store)) store.removeItem(key)
    return true
  } catch {
    return false
  }
}
