import { describe, expect, it, vi } from 'vitest'
import {
  clearAppData,
  hasAppData,
  isStorageAvailable,
  readItem,
  removeItem,
  STORAGE_KEYS,
  writeItem,
} from './storageService'

const asNumberList = (value: unknown) =>
  Array.isArray(value) && value.every((n) => typeof n === 'number')
    ? (value as number[])
    : null

function quotaError() {
  return new DOMException('The quota has been exceeded.', 'QuotaExceededError')
}

describe('STORAGE_KEYS', () => {
  it('uses the names from the specification, plus the session bookmark and the archive', () => {
    expect(STORAGE_KEYS).toEqual({
      settings: 'mathPractice.settings',
      sessions: 'mathPractice.sessions',
      attempts: 'mathPractice.attempts',
      mistakePatterns: 'mathPractice.mistakePatterns',
      statistics: 'mathPractice.statistics',
      attemptArchive: 'mathPractice.attemptArchive',
      activeSession: 'mathPractice.activeSession',
      version: 'mathPractice.version',
    })
  })
})

describe('writeItem and readItem', () => {
  it('saves a value and reads it back', () => {
    expect(writeItem(STORAGE_KEYS.attempts, [1, 2, 3])).toEqual({ ok: true })
    expect(readItem(STORAGE_KEYS.attempts, asNumberList)).toEqual({
      status: 'ok',
      value: [1, 2, 3],
    })
  })

  it('stores plain JSON under the exact key', () => {
    writeItem(STORAGE_KEYS.settings, { a: 1 })
    expect(window.localStorage.getItem('mathPractice.settings')).toBe('{"a":1}')
  })

  it('reports "empty" when nothing is saved', () => {
    expect(readItem(STORAGE_KEYS.attempts, asNumberList)).toEqual({
      status: 'empty',
    })
  })

  it('reports "invalid" for text that is not JSON', () => {
    window.localStorage.setItem(STORAGE_KEYS.attempts, '{not json')
    expect(readItem(STORAGE_KEYS.attempts, asNumberList)).toEqual({
      status: 'invalid',
    })
  })

  it('reports "invalid" when the data fails the checks', () => {
    window.localStorage.setItem(STORAGE_KEYS.attempts, '["a","b"]')
    expect(readItem(STORAGE_KEYS.attempts, asNumberList)).toEqual({
      status: 'invalid',
    })
  })

  it('reports "invalid" instead of throwing if the checker throws', () => {
    writeItem(STORAGE_KEYS.attempts, [1])
    const result = readItem(STORAGE_KEYS.attempts, () => {
      throw new Error('boom')
    })
    expect(result).toEqual({ status: 'invalid' })
  })

  it('keeps each key separate', () => {
    writeItem(STORAGE_KEYS.attempts, [1])
    writeItem(STORAGE_KEYS.sessions, [2])
    expect(readItem(STORAGE_KEYS.attempts, asNumberList)).toMatchObject({
      value: [1],
    })
    expect(readItem(STORAGE_KEYS.sessions, asNumberList)).toMatchObject({
      value: [2],
    })
  })
})

describe('when storage cannot be used', () => {
  it('reports "unavailable" for reads instead of throwing', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    expect(readItem(STORAGE_KEYS.attempts, asNumberList)).toEqual({
      status: 'unavailable',
    })
  })

  it('reports "unavailable" for writes when the browser refuses', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    expect(writeItem(STORAGE_KEYS.attempts, [1])).toEqual({
      ok: false,
      reason: 'unavailable',
    })
  })

  it('reports "quota" when storage is full', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw quotaError()
    })
    expect(writeItem(STORAGE_KEYS.attempts, [1])).toEqual({
      ok: false,
      reason: 'quota',
    })
  })

  it('recognises the legacy quota error code (22)', () => {
    const error = new DOMException('full', 'SomethingElse')
    Object.defineProperty(error, 'code', { value: 22 })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw error
    })
    expect(writeItem(STORAGE_KEYS.attempts, [1])).toMatchObject({
      reason: 'quota',
    })
  })

  it('reports "error" for values that cannot be turned into JSON', () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular
    expect(writeItem(STORAGE_KEYS.attempts, circular)).toEqual({
      ok: false,
      reason: 'error',
    })
  })

  it('does not throw when removing or clearing fails', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    expect(removeItem(STORAGE_KEYS.attempts)).toBe(false)
    expect(clearAppData()).toBe(true) // nothing to remove, so nothing fails
    writeItem(STORAGE_KEYS.attempts, [1])
    expect(clearAppData()).toBe(false)
  })
})

describe('isStorageAvailable', () => {
  it('is true when the browser allows saving', () => {
    expect(isStorageAvailable()).toBe(true)
  })

  it('is false when saving is refused', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    expect(isStorageAvailable()).toBe(false)
  })

  it('leaves nothing behind', () => {
    isStorageAvailable()
    expect(window.localStorage.length).toBe(0)
  })
})

describe('removeItem, hasAppData and clearAppData', () => {
  it('removes one item', () => {
    writeItem(STORAGE_KEYS.attempts, [1])
    expect(removeItem(STORAGE_KEYS.attempts)).toBe(true)
    expect(readItem(STORAGE_KEYS.attempts, asNumberList).status).toBe('empty')
  })

  it('knows whether any app data is saved, ignoring the version', () => {
    expect(hasAppData()).toBe(false)
    writeItem(STORAGE_KEYS.version, { version: 1 })
    expect(hasAppData()).toBe(false)
    writeItem(STORAGE_KEYS.settings, {})
    expect(hasAppData()).toBe(true)
  })

  it('clears only this app’s data and leaves unrelated keys alone', () => {
    writeItem(STORAGE_KEYS.settings, {})
    writeItem(STORAGE_KEYS.attempts, [1])
    writeItem(STORAGE_KEYS.version, { version: 1 })
    window.localStorage.setItem('someOtherApp.data', 'keep me')
    window.localStorage.setItem('theme', 'dark')

    expect(clearAppData()).toBe(true)

    expect(window.localStorage.getItem('someOtherApp.data')).toBe('keep me')
    expect(window.localStorage.getItem('theme')).toBe('dark')
    expect(window.localStorage.length).toBe(2)
    expect(hasAppData()).toBe(false)
  })
})
