import { describe, expect, it } from 'vitest'
import { calculateAccuracy } from './math'

describe('calculateAccuracy', () => {
  it('is the percentage of answers that were correct', () => {
    expect(calculateAccuracy(7, 10)).toBe(70)
    expect(calculateAccuracy(1, 4)).toBe(25)
    expect(calculateAccuracy(10, 10)).toBe(100)
    expect(calculateAccuracy(0, 10)).toBe(0)
  })

  it('rounds to a whole number', () => {
    expect(calculateAccuracy(2, 3)).toBe(67)
    expect(calculateAccuracy(1, 3)).toBe(33)
  })

  it('is null, not NaN, when nothing was attempted', () => {
    expect(calculateAccuracy(0, 0)).toBeNull()
  })
})
