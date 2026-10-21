import { describe, expect, it, vi } from 'vitest'
import { saveList } from './practiceHistory'
import {
  dismissStorageFailure,
  getStorageFailure,
  reportStorageFailure,
  resetStorageFailure,
  subscribeToStorageFailure,
} from './storageFailures'
import { STORAGE_KEYS, writeItem } from './storageService'

function refuseSaving(error: unknown) {
  return vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw error
  })
}

const quota = () =>
  new DOMException('The quota has been exceeded.', 'QuotaExceededError')

describe('the record of saving trouble', () => {
  it('starts with nothing to report', () => {
    expect(getStorageFailure()).toBeNull()
  })

  it('remembers a failure, not yet closed', () => {
    reportStorageFailure('quota')
    expect(getStorageFailure()).toEqual({ reason: 'quota', dismissed: false })
  })

  it('tells listeners when something changes, until they stop listening', () => {
    const listener = vi.fn()
    const stop = subscribeToStorageFailure(listener)

    reportStorageFailure('error')
    dismissStorageFailure()
    expect(listener).toHaveBeenCalledTimes(2)

    stop()
    resetStorageFailure()
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('does not bring a closed warning back for the same kind of failure', () => {
    reportStorageFailure('quota')
    dismissStorageFailure()
    reportStorageFailure('quota')
    expect(getStorageFailure()).toEqual({ reason: 'quota', dismissed: true })
  })

  it('shows a different kind of failure even after one was closed', () => {
    reportStorageFailure('quota')
    dismissStorageFailure()
    reportStorageFailure('unavailable')
    expect(getStorageFailure()).toEqual({
      reason: 'unavailable',
      dismissed: false,
    })
  })

  it('does not notify again for a repeat of the same failure', () => {
    reportStorageFailure('error')
    const listener = vi.fn()
    subscribeToStorageFailure(listener)
    reportStorageFailure('error')
    dismissStorageFailure()
    dismissStorageFailure()
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('can be wiped', () => {
    reportStorageFailure('error')
    resetStorageFailure()
    expect(getStorageFailure()).toBeNull()
  })
})

describe('saving reports its failures', () => {
  it('reports a browser that blocks saving', () => {
    refuseSaving(new DOMException('denied', 'SecurityError'))
    expect(writeItem(STORAGE_KEYS.settings, {})).toEqual({
      ok: false,
      reason: 'unavailable',
    })
    expect(getStorageFailure()?.reason).toBe('unavailable')
  })

  it('reports a full browser', () => {
    refuseSaving(quota())
    writeItem(STORAGE_KEYS.settings, {})
    expect(getStorageFailure()?.reason).toBe('quota')
  })

  it('reports something that cannot be saved at all', () => {
    const loop: Record<string, unknown> = {}
    loop.self = loop
    expect(writeItem(STORAGE_KEYS.settings, loop)).toEqual({
      ok: false,
      reason: 'error',
    })
    expect(getStorageFailure()?.reason).toBe('error')
  })

  it('says nothing when saving works', () => {
    writeItem(STORAGE_KEYS.settings, { fine: true })
    expect(getStorageFailure()).toBeNull()
  })

  it('stays quiet on request, for a caller that will try again', () => {
    refuseSaving(quota())
    writeItem(STORAGE_KEYS.settings, {}, { quiet: true })
    expect(getStorageFailure()).toBeNull()
  })
})

describe('saving a list that does not fit', () => {
  it('says nothing if making room by dropping the oldest records worked', () => {
    const real = Storage.prototype.setItem
    let calls = 0
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (++calls === 1) throw quota()
      real.call(this, key, value)
    })

    expect(saveList(STORAGE_KEYS.attempts, [1, 2, 3, 4]).ok).toBe(true)
    expect(getStorageFailure()).toBeNull()
  })

  it('reports it if there is still no room', () => {
    refuseSaving(quota())
    expect(saveList(STORAGE_KEYS.attempts, [1, 2, 3, 4]).ok).toBe(false)
    expect(getStorageFailure()?.reason).toBe('quota')
  })

  it('reports a failure that making room cannot help with', () => {
    refuseSaving(new DOMException('denied', 'SecurityError'))
    expect(saveList(STORAGE_KEYS.attempts, [1])).toEqual({
      ok: false,
      reason: 'unavailable',
    })
    expect(getStorageFailure()?.reason).toBe('unavailable')
  })
})
