import { describe, expect, it, vi } from 'vitest'
import { measureStorageUsage, STORAGE_KEYS, writeItem } from './storageService'

describe('measureStorageUsage', () => {
  it('is nothing when nothing is saved', () => {
    expect(measureStorageUsage()).toEqual({ total: 0, byKey: {} })
  })

  it('counts the name and the contents of each saved item', () => {
    writeItem(STORAGE_KEYS.settings, { soundEnabled: true })
    const text = JSON.stringify({ soundEnabled: true })

    const usage = measureStorageUsage()
    expect(usage?.byKey).toEqual({
      [STORAGE_KEYS.settings]: STORAGE_KEYS.settings.length + text.length,
    })
    expect(usage?.total).toBe(STORAGE_KEYS.settings.length + text.length)
  })

  it('adds everything up, and grows as more is saved', () => {
    writeItem(STORAGE_KEYS.settings, { a: 1 })
    writeItem(STORAGE_KEYS.attempts, [1, 2, 3])
    const small = measureStorageUsage()!
    expect(small.total).toBe(
      Object.values(small.byKey).reduce((sum, n) => sum + n, 0),
    )

    writeItem(
      STORAGE_KEYS.attempts,
      Array.from({ length: 500 }, (_, i) => i),
    )
    expect(measureStorageUsage()!.total).toBeGreaterThan(small.total + 1000)
  })

  it("leaves out other sites' and unrelated data", () => {
    window.localStorage.setItem('someOtherApp.data', 'x'.repeat(10_000))
    writeItem(STORAGE_KEYS.settings, {})
    const usage = measureStorageUsage()!
    expect(Object.keys(usage.byKey)).toEqual([STORAGE_KEYS.settings])
    expect(usage.total).toBeLessThan(100)
  })

  it('says null, rather than crashing, when the browser will not say', () => {
    writeItem(STORAGE_KEYS.settings, {})
    vi.spyOn(Storage.prototype, 'key').mockImplementation(() => {
      throw new DOMException('no', 'SecurityError')
    })
    expect(measureStorageUsage()).toBeNull()
  })
})
