import { describe, expect, it, vi } from 'vitest'
import { saveSettings, DEFAULT_SETTINGS } from './settingsService'
import { ensureSchema } from './storageMigrations'
import {
  clearAppData,
  hasAppData,
  STORAGE_KEYS,
  writeItem,
} from './storageService'

function refuseSaving(error: unknown) {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw error
  })
}

describe('recognising a full browser', () => {
  it.each([
    ['the standard name', new DOMException('full', 'QuotaExceededError')],
    ["Firefox's name", new DOMException('full', 'NS_ERROR_DOM_QUOTA_REACHED')],
  ])('by %s', (_label, error) => {
    refuseSaving(error)
    expect(writeItem(STORAGE_KEYS.settings, {})).toEqual({
      ok: false,
      reason: 'quota',
    })
  })

  it.each([22, 1014])('by the legacy error code %i', (code) => {
    // Some browsers name it something else but still use the old code.
    const error = new DOMException('full', 'SomethingElse')
    Object.defineProperty(error, 'code', { value: code })
    refuseSaving(error)
    expect(writeItem(STORAGE_KEYS.settings, {})).toMatchObject({
      reason: 'quota',
    })
  })

  it('does not take any other failure for a full browser', () => {
    refuseSaving(new DOMException('no', 'SecurityError'))
    expect(writeItem(STORAGE_KEYS.settings, {})).toMatchObject({
      reason: 'unavailable',
    })
    refuseSaving(new Error('not even a DOMException'))
    expect(writeItem(STORAGE_KEYS.settings, {})).toMatchObject({
      reason: 'unavailable',
    })
  })
})

describe('when the browser will not even list what is saved', () => {
  it('says there is no data, rather than crashing', () => {
    saveSettings(DEFAULT_SETTINGS)
    vi.spyOn(Storage.prototype, 'key').mockImplementation(() => {
      throw new DOMException('no', 'SecurityError')
    })
    expect(hasAppData()).toBe(false)
  })

  it('says it could not clear anything', () => {
    saveSettings(DEFAULT_SETTINGS)
    vi.spyOn(Storage.prototype, 'key').mockImplementation(() => {
      throw new DOMException('no', 'SecurityError')
    })
    expect(clearAppData()).toBe(false)
  })
})

describe('bringing old data up to date when the browser will not save', () => {
  it('reports a failed upgrade rather than pretending it worked', () => {
    // Data from before versions existed, so an upgrade is needed...
    window.localStorage.setItem(STORAGE_KEYS.attempts, '[]')
    // ...but the new version number cannot be written down.
    refuseSaving(new DOMException('full', 'QuotaExceededError'))
    expect(ensureSchema()).toBe('failed')
  })

  it('reports an unusable browser when there is nothing yet and no way to save', () => {
    refuseSaving(new DOMException('no', 'SecurityError'))
    expect(ensureSchema()).toBe('unavailable')
  })
})
