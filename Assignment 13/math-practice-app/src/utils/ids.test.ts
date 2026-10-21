import { afterEach, describe, expect, it, vi } from 'vitest'
import { createId } from './ids'

describe('createId', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns a non-empty string', () => {
    expect(createId()).toMatch(/\S+/)
  })

  it('returns a different id each time', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => createId()))
    expect(ids.size).toBe(1000)
  })

  it('still produces unique ids without crypto.randomUUID', () => {
    vi.stubGlobal('crypto', {})
    const ids = new Set(Array.from({ length: 1000 }, () => createId()))
    expect(ids.size).toBe(1000)
  })
})
