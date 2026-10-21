import { describe, expect, it } from 'vitest'
import { makePattern } from '../test/mistakePatterns'
import { pickPatternForReview } from './mistakeReview'

describe('pickPatternForReview at the very ends of the dice', () => {
  const patterns = [
    makePattern('addition', 1, 2, 1),
    makePattern('addition', 3, 4, 1),
    makePattern('addition', 5, 6, 1),
  ]
  const ids = patterns.map((p) => p.id)

  it('still picks a pattern when the random number rounds all the way up', () => {
    const picked = pickPatternForReview(patterns, () => 1, { threshold: 3 })
    expect(ids).toContain(picked?.id)
  })

  it('picks a pattern at the very start of the dice', () => {
    const picked = pickPatternForReview(patterns, () => 0, { threshold: 3 })
    expect(ids).toContain(picked?.id)
  })
})
