import { describe, expect, it } from 'vitest'
import { formatStorageSize } from './format'

describe('formatStorageSize', () => {
  it.each([
    [0, '0 bytes'],
    [1, '1 byte'],
    [800, '800 bytes'],
    [1023, '1023 bytes'],
    [1024, '1 KB'],
    [1536, '2 KB'],
    [402_368, '393 KB'],
    [1024 * 1024 - 1, '1024 KB'],
    [1024 * 1024, '1.0 MB'],
    [1.4 * 1024 * 1024, '1.4 MB'],
    [4.96 * 1024 * 1024, '5.0 MB'],
  ])('writes %i as "%s"', (characters, words) => {
    expect(formatStorageSize(characters)).toBe(words)
  })
})
