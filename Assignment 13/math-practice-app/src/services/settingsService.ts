import type { AppSettings } from '../types/settings'
import {
  DEFAULT_DIFFICULTY,
  DEFAULT_OPERATIONS,
  DEFAULT_SESSION_LENGTH,
} from '../utils/practiceOptions'
import { isDifficulty, isOperation, isSessionLength } from './storageSchemas'
import {
  readItem,
  STORAGE_KEYS,
  writeItem,
  type ReadResult,
  type WriteResult,
} from './storageService'

/** How many correct similar questions it takes to master a mistake. */
export const DEFAULT_MASTERY_THRESHOLD = 3
export const MAX_MASTERY_THRESHOLD = 20

export const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  cardAnimationEnabled: true,
  showExplanations: true,
  feedbackEnabled: true,
  defaultSessionLength: DEFAULT_SESSION_LENGTH,
  defaultDifficulty: DEFAULT_DIFFICULTY,
  defaultOperations: [...DEFAULT_OPERATIONS],
  masteryThreshold: DEFAULT_MASTERY_THRESHOLD,
}

/** A new copy of the defaults that is safe to change. */
export function createDefaultSettings(): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
    defaultOperations: [...DEFAULT_SETTINGS.defaultOperations],
  }
}

/**
 * Builds a complete, valid set of settings from whatever was saved. Each field
 * that is missing or not valid falls back to its default on its own, so one
 * bad value never throws away the others.
 */
export function sanitizeSettings(value: unknown): AppSettings {
  const saved =
    typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)
      : {}
  const d = DEFAULT_SETTINGS

  const flag = (v: unknown, fallback: boolean) =>
    typeof v === 'boolean' ? v : fallback

  const operations = Array.isArray(saved.defaultOperations)
    ? [...new Set(saved.defaultOperations.filter(isOperation))]
    : [...d.defaultOperations]

  const threshold = saved.masteryThreshold
  const masteryThreshold =
    Number.isInteger(threshold) &&
    (threshold as number) >= 1 &&
    (threshold as number) <= MAX_MASTERY_THRESHOLD
      ? (threshold as number)
      : d.masteryThreshold

  return {
    soundEnabled: flag(saved.soundEnabled, d.soundEnabled),
    cardAnimationEnabled: flag(
      saved.cardAnimationEnabled,
      d.cardAnimationEnabled,
    ),
    showExplanations: flag(saved.showExplanations, d.showExplanations),
    feedbackEnabled: flag(saved.feedbackEnabled, d.feedbackEnabled),
    defaultSessionLength: isSessionLength(saved.defaultSessionLength)
      ? saved.defaultSessionLength
      : d.defaultSessionLength,
    defaultDifficulty: isDifficulty(saved.defaultDifficulty)
      ? saved.defaultDifficulty
      : d.defaultDifficulty,
    defaultOperations: operations,
    masteryThreshold,
  }
}

export interface LoadedSettings {
  settings: AppSettings
  /** What was found in storage; anything but "ok" means defaults were used. */
  status: ReadResult<AppSettings>['status']
}

/**
 * Loads the saved settings. With nothing saved, or saved data that is unusable,
 * the defaults are used instead.
 */
export function loadSettings(): LoadedSettings {
  const result = readItem(STORAGE_KEYS.settings, (value) =>
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? sanitizeSettings(value)
      : null,
  )
  if (result.status === 'ok') {
    return { settings: result.value, status: 'ok' }
  }
  return { settings: createDefaultSettings(), status: result.status }
}

export function saveSettings(settings: AppSettings): WriteResult {
  return writeItem(STORAGE_KEYS.settings, sanitizeSettings(settings))
}
