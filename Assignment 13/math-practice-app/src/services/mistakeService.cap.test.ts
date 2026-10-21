import { describe, expect, it } from 'vitest'
import { makePattern } from '../test/mistakePatterns'
import {
  loadMistakePatterns,
  MAX_STORED_MISTAKE_PATTERNS,
  saveMistakePatterns,
} from './mistakeService'

/** `count` different patterns, each a minute newer than the one before. */
function manyPatterns(count: number, firstOperandStart = 0, mastered = false) {
  return Array.from({ length: count }, (_, i) =>
    makePattern('addition', firstOperandStart + i, 1, 1, {
      lastIncorrectAt: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(),
      mastered,
    }),
  )
}

describe('keeping the number of saved mistakes in check', () => {
  it('keeps everything while there is room', () => {
    saveMistakePatterns(manyPatterns(50))
    expect(loadMistakePatterns()).toHaveLength(50)
  })

  it('drops mastered mistakes first when there are too many', () => {
    const mastered = manyPatterns(3, 5000, true)
    const active = manyPatterns(MAX_STORED_MISTAKE_PATTERNS)
    saveMistakePatterns([...mastered, ...active])

    const kept = loadMistakePatterns()
    expect(kept).toHaveLength(MAX_STORED_MISTAKE_PATTERNS)
    expect(kept.some((p) => p.mastered)).toBe(false)
  })

  it('then drops the least recent mistakes', () => {
    saveMistakePatterns(manyPatterns(MAX_STORED_MISTAKE_PATTERNS + 2))

    const kept = new Set(loadMistakePatterns().map((p) => p.firstOperand))
    expect(kept.size).toBe(MAX_STORED_MISTAKE_PATTERNS)
    // The two oldest (first operands 0 and 1) are the ones that went.
    expect(kept.has(0)).toBe(false)
    expect(kept.has(1)).toBe(false)
    expect(kept.has(2)).toBe(true)
    expect(kept.has(MAX_STORED_MISTAKE_PATTERNS + 1)).toBe(true)
  })
})
