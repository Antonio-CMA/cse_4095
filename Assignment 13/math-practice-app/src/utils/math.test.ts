import { describe, expect, it } from 'vitest'
import { seededRng, sequenceRng } from '../test/rng'
import {
  calculateAnswer,
  OPERATION_SYMBOLS,
  randomInRange,
  randomInt,
} from './math'

describe('randomInt', () => {
  it('maps the ends of the random range to min and max', () => {
    expect(randomInt(3, 7, () => 0)).toBe(3)
    expect(randomInt(3, 7, () => 0.999999)).toBe(7)
  })

  it('always stays within min and max, inclusive', () => {
    const rng = seededRng(1)
    const seen = new Set<number>()
    for (let i = 0; i < 1000; i++) {
      const n = randomInt(0, 5, rng)
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThanOrEqual(5)
      seen.add(n)
    }
    expect([...seen].sort()).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('returns the only possible value when min equals max', () => {
    expect(randomInt(4, 4)).toBe(4)
  })

  it('rejects a reversed range and non-integers', () => {
    expect(() => randomInt(5, 1)).toThrow(RangeError)
    expect(() => randomInt(1.5, 3)).toThrow(RangeError)
  })

  it('works with a range object', () => {
    expect(randomInRange({ min: 10, max: 10 })).toBe(10)
    expect(randomInRange({ min: 1, max: 4 }, sequenceRng([0.5]))).toBe(3)
  })
})

describe('calculateAnswer', () => {
  it('computes each operation', () => {
    expect(calculateAnswer('addition', 7, 8)).toBe(15)
    expect(calculateAnswer('subtraction', 9, 4)).toBe(5)
    expect(calculateAnswer('multiplication', 7, 8)).toBe(56)
    expect(calculateAnswer('division', 56, 7)).toBe(8)
  })
})

describe('OPERATION_SYMBOLS', () => {
  it('has a symbol for every operation', () => {
    expect(OPERATION_SYMBOLS).toEqual({
      addition: '+',
      subtraction: '−',
      multiplication: '×',
      division: '÷',
    })
  })
})
