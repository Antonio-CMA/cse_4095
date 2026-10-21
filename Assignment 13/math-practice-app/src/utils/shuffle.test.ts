import { describe, expect, it } from 'vitest'
import { seededRng } from '../test/rng'
import { shuffle } from './shuffle'

describe('shuffle', () => {
  it('keeps exactly the same items', () => {
    const items = [1, 2, 3, 4, 5, 6]
    expect([...shuffle(items, seededRng(7))].sort()).toEqual(items)
  })

  it('does not change the original array', () => {
    const items = [1, 2, 3, 4]
    shuffle(items, seededRng(3))
    expect(items).toEqual([1, 2, 3, 4])
  })

  it('is repeatable with the same seed and varies with another', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8]
    expect(shuffle(items, seededRng(5))).toEqual(shuffle(items, seededRng(5)))
    expect(shuffle(items, seededRng(5))).not.toEqual(
      shuffle(items, seededRng(6)),
    )
  })

  it('handles empty and single-item arrays', () => {
    expect(shuffle([])).toEqual([])
    expect(shuffle(['a'])).toEqual(['a'])
  })

  it('can put each item in every position', () => {
    const rng = seededRng(11)
    const positionsOfOne = new Set<number>()
    for (let i = 0; i < 300; i++) {
      positionsOfOne.add(shuffle([1, 2, 3, 4], rng).indexOf(1))
    }
    expect([...positionsOfOne].sort()).toEqual([0, 1, 2, 3])
  })
})
