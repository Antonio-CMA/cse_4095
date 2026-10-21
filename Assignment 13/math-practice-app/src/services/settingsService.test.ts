import { describe, expect, it, vi } from 'vitest'
import {
  createDefaultSettings,
  DEFAULT_SETTINGS,
  loadSettings,
  sanitizeSettings,
  saveSettings,
} from './settingsService'
import { STORAGE_KEYS } from './storageService'

const custom = {
  soundEnabled: false,
  cardAnimationEnabled: false,
  showExplanations: false,
  feedbackEnabled: false,
  defaultSessionLength: 20,
  defaultDifficulty: 3,
  defaultOperations: ['multiplication', 'division'],
  masteryThreshold: 5,
} as const

describe('DEFAULT_SETTINGS', () => {
  it('matches the starting values used by the setup page', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      soundEnabled: true,
      cardAnimationEnabled: true,
      showExplanations: true,
      feedbackEnabled: true,
      defaultSessionLength: 10,
      defaultDifficulty: 1,
      defaultOperations: [],
      masteryThreshold: 3,
    })
  })
})

describe('createDefaultSettings', () => {
  it('equals the defaults but can be changed without affecting them', () => {
    const copy = createDefaultSettings()
    expect(copy).toEqual(DEFAULT_SETTINGS)

    copy.defaultOperations.push('addition')
    copy.soundEnabled = false
    expect(DEFAULT_SETTINGS.defaultOperations).toEqual([])
    expect(DEFAULT_SETTINGS.soundEnabled).toBe(true)
    expect(createDefaultSettings().defaultOperations).toEqual([])
  })
})

describe('sanitizeSettings', () => {
  it('keeps valid settings as they are', () => {
    expect(sanitizeSettings(custom)).toEqual(custom)
  })

  it('uses defaults for anything that is not an object', () => {
    for (const bad of [undefined, null, 'x', 5, []]) {
      expect(sanitizeSettings(bad)).toEqual(DEFAULT_SETTINGS)
    }
  })

  it('fills in missing settings with defaults', () => {
    expect(sanitizeSettings({ soundEnabled: false })).toEqual({
      ...DEFAULT_SETTINGS,
      soundEnabled: false,
    })
  })

  it('replaces only the invalid fields, keeping the rest', () => {
    const result = sanitizeSettings({
      ...custom,
      soundEnabled: 'loud',
      defaultDifficulty: 99,
      defaultSessionLength: -3,
      masteryThreshold: 0,
    })
    expect(result).toEqual({
      ...custom,
      soundEnabled: DEFAULT_SETTINGS.soundEnabled,
      defaultDifficulty: DEFAULT_SETTINGS.defaultDifficulty,
      defaultSessionLength: DEFAULT_SETTINGS.defaultSessionLength,
      masteryThreshold: DEFAULT_SETTINGS.masteryThreshold,
    })
  })

  it('keeps only the valid default operations, once each', () => {
    expect(
      sanitizeSettings({
        defaultOperations: ['addition', 'bogus', 'addition', 7, 'division'],
      }).defaultOperations,
    ).toEqual(['addition', 'division'])
  })

  it('falls back when the default operations are not a list', () => {
    expect(
      sanitizeSettings({ defaultOperations: 'addition' }).defaultOperations,
    ).toEqual(DEFAULT_SETTINGS.defaultOperations)
  })

  it('allows continuous as the default session length', () => {
    expect(
      sanitizeSettings({ defaultSessionLength: 'continuous' })
        .defaultSessionLength,
    ).toBe('continuous')
  })

  it('does not share the default operations array', () => {
    sanitizeSettings({}).defaultOperations.push('addition')
    expect(DEFAULT_SETTINGS.defaultOperations).toEqual([])
  })
})

describe('loadSettings', () => {
  it('uses the defaults when nothing is saved', () => {
    expect(loadSettings()).toEqual({
      settings: DEFAULT_SETTINGS,
      status: 'empty',
    })
  })

  it('loads what was saved', () => {
    saveSettings({
      ...custom,
      defaultOperations: [...custom.defaultOperations],
    })
    expect(loadSettings()).toEqual({ settings: custom, status: 'ok' })
  })

  it('survives a restart: the saved settings are still there', () => {
    saveSettings({ ...DEFAULT_SETTINGS, soundEnabled: false })
    // A "restart" is just a later read of the same browser storage.
    expect(loadSettings().settings.soundEnabled).toBe(false)
  })

  it('recovers from text that is not JSON', () => {
    window.localStorage.setItem(STORAGE_KEYS.settings, '{{{')
    expect(loadSettings()).toEqual({
      settings: DEFAULT_SETTINGS,
      status: 'invalid',
    })
  })

  it('recovers from the wrong kind of value', () => {
    window.localStorage.setItem(STORAGE_KEYS.settings, '[1,2,3]')
    expect(loadSettings()).toEqual({
      settings: DEFAULT_SETTINGS,
      status: 'invalid',
    })
  })

  it('keeps the good fields when only some saved values are damaged', () => {
    window.localStorage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify({ ...custom, defaultDifficulty: 'hard' }),
    )
    const { settings, status } = loadSettings()
    expect(status).toBe('ok')
    expect(settings.soundEnabled).toBe(false)
    expect(settings.defaultDifficulty).toBe(DEFAULT_SETTINGS.defaultDifficulty)
  })

  it('falls back to defaults when storage cannot be read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    expect(loadSettings()).toEqual({
      settings: DEFAULT_SETTINGS,
      status: 'unavailable',
    })
  })

  it('returns a fresh copy of the defaults each time', () => {
    loadSettings().settings.defaultOperations.push('addition')
    expect(loadSettings().settings.defaultOperations).toEqual([])
  })
})

describe('saveSettings', () => {
  it('saves the settings as JSON', () => {
    expect(saveSettings(DEFAULT_SETTINGS)).toEqual({ ok: true })
    expect(
      JSON.parse(window.localStorage.getItem(STORAGE_KEYS.settings) ?? ''),
    ).toEqual(DEFAULT_SETTINGS)
  })

  it('never saves invalid values', () => {
    saveSettings({
      ...DEFAULT_SETTINGS,
      defaultDifficulty: 42 as never,
    })
    expect(loadSettings().settings.defaultDifficulty).toBe(1)
  })

  it('reports when the browser will not save', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    expect(saveSettings(DEFAULT_SETTINGS)).toEqual({
      ok: false,
      reason: 'unavailable',
    })
  })
})
