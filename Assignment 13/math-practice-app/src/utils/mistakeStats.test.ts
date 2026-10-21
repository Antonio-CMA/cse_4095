import { describe, expect, it } from 'vitest'
import { makePattern } from '../test/mistakePatterns'
import { createEmptyStatistics } from '../services/statisticsService'
import type { MistakePattern } from '../types/mistake'
import type { AppStatistics } from '../types/statistics'
import {
  getMasteryProgress,
  getMostMissedFacts,
  getMostMissedOperations,
  sortPatternsByMisses,
  splitByMastery,
} from './mistakeStats'

const THRESHOLD = 3
const at = (day: number) => new Date(Date.UTC(2026, 2, day)).toISOString()

const pat = (
  first: number,
  incorrectCount: number,
  day = 1,
  extra: Partial<MistakePattern> = {},
) =>
  makePattern('multiplication', first, 7, 2, {
    incorrectCount,
    lastIncorrectAt: at(day),
    ...extra,
  })

function statsWithMisses(
  misses: Partial<Record<string, number>>,
): AppStatistics {
  const stats = createEmptyStatistics()
  for (const [op, n] of Object.entries(misses)) {
    stats.byOperation[op as keyof AppStatistics['byOperation']] = {
      attempted: n!,
      correct: 0,
      incorrect: n!,
    }
  }
  return stats
}

describe('splitByMastery', () => {
  it('separates the patterns still being practised from the mastered ones', () => {
    const active = pat(1, 1)
    const flagged = pat(2, 1, 1, { mastered: true })
    const counted = pat(3, 1, 1, { similarCorrectCount: 3 })
    const partway = pat(4, 1, 1, { similarCorrectCount: 2 })

    const result = splitByMastery(
      [active, flagged, counted, partway],
      THRESHOLD,
    )
    expect(result.active).toEqual([active, partway])
    expect(result.mastered).toEqual([flagged, counted])
  })

  it('follows the mastery setting', () => {
    const p = pat(1, 1, 1, { similarCorrectCount: 2 })
    expect(splitByMastery([p], 3).active).toHaveLength(1)
    expect(splitByMastery([p], 2).mastered).toHaveLength(1)
  })

  it('handles no patterns', () => {
    expect(splitByMastery([], THRESHOLD)).toEqual({ active: [], mastered: [] })
  })
})

describe('sortPatternsByMisses', () => {
  it('puts the most missed first', () => {
    const sorted = sortPatternsByMisses([pat(1, 2), pat(2, 5), pat(3, 3)])
    expect(sorted.map((p) => p.incorrectCount)).toEqual([5, 3, 2])
  })

  it('breaks ties by the most recent miss', () => {
    const sorted = sortPatternsByMisses([
      pat(1, 3, 1),
      pat(2, 3, 9),
      pat(3, 3, 5),
    ])
    expect(sorted.map((p) => p.firstOperand)).toEqual([2, 3, 1])
  })

  it('breaks complete ties by id, so the order never changes', () => {
    const a = pat(1, 3, 4)
    const b = pat(2, 3, 4)
    const c = pat(3, 3, 4)
    const expected = sortPatternsByMisses([a, b, c]).map((p) => p.id)
    expect(sortPatternsByMisses([c, a, b]).map((p) => p.id)).toEqual(expected)
    expect(sortPatternsByMisses([b, c, a]).map((p) => p.id)).toEqual(expected)
  })

  it('does not change the list it was given', () => {
    const list = [pat(1, 1), pat(2, 9)]
    sortPatternsByMisses(list)
    expect(list.map((p) => p.firstOperand)).toEqual([1, 2])
  })

  it('handles an empty list', () => {
    expect(sortPatternsByMisses([])).toEqual([])
  })
})

describe('getMostMissedFacts', () => {
  it('gives the five most missed facts by default', () => {
    const patterns = Array.from({ length: 8 }, (_, i) => pat(i + 1, i + 1))
    const top = getMostMissedFacts(patterns)
    expect(top).toHaveLength(5)
    expect(top.map((p) => p.incorrectCount)).toEqual([8, 7, 6, 5, 4])
  })

  it('accepts a different limit', () => {
    expect(
      getMostMissedFacts([pat(1, 1), pat(2, 2), pat(3, 3)], 2),
    ).toHaveLength(2)
  })

  it('returns everything when there are fewer than the limit', () => {
    expect(getMostMissedFacts([pat(1, 1), pat(2, 2)])).toHaveLength(2)
  })

  it('includes mastered facts too', () => {
    const mastered = pat(1, 7, 1, { mastered: true })
    expect(getMostMissedFacts([mastered, pat(2, 2)])[0]).toBe(mastered)
  })

  it('is empty when there are no mistakes', () => {
    expect(getMostMissedFacts([])).toEqual([])
  })

  it('handles ties in a stable, recency-based way', () => {
    const top = getMostMissedFacts(
      [pat(1, 4, 1), pat(2, 4, 8), pat(3, 4, 3)],
      2,
    )
    expect(top.map((p) => p.firstOperand)).toEqual([2, 3])
  })
})

describe('getMostMissedOperations', () => {
  it('names the operation with the most wrong answers', () => {
    expect(
      getMostMissedOperations(
        statsWithMisses({ addition: 2, division: 7, subtraction: 1 }),
      ),
    ).toEqual({ operations: ['division'], misses: 7 })
  })

  it('returns every operation in a tie, in the usual order', () => {
    expect(
      getMostMissedOperations(
        statsWithMisses({ division: 4, addition: 4, multiplication: 2 }),
      ),
    ).toEqual({ operations: ['addition', 'division'], misses: 4 })
  })

  it('can be a four-way tie', () => {
    expect(
      getMostMissedOperations(
        statsWithMisses({
          addition: 1,
          subtraction: 1,
          multiplication: 1,
          division: 1,
        }),
      )?.operations,
    ).toEqual(['addition', 'subtraction', 'multiplication', 'division'])
  })

  it('is null when nothing has been missed', () => {
    expect(getMostMissedOperations(createEmptyStatistics())).toBeNull()
  })

  it('only looks at wrong answers, not at how much was attempted', () => {
    const stats = createEmptyStatistics()
    stats.byOperation.addition = { attempted: 50, correct: 50, incorrect: 0 }
    stats.byOperation.division = { attempted: 2, correct: 1, incorrect: 1 }
    expect(getMostMissedOperations(stats)?.operations).toEqual(['division'])
  })
})

describe('getMasteryProgress', () => {
  it('shows how many right answers out of how many are needed', () => {
    expect(
      getMasteryProgress(pat(1, 1, 1, { similarCorrectCount: 1 }), 3),
    ).toEqual({
      done: 1,
      needed: 3,
    })
    expect(getMasteryProgress(pat(1, 1), 3)).toEqual({ done: 0, needed: 3 })
  })

  it('is complete for a mastered pattern', () => {
    expect(getMasteryProgress(pat(1, 1, 1, { mastered: true }), 3)).toEqual({
      done: 3,
      needed: 3,
    })
  })

  it('never shows more than is needed', () => {
    expect(
      getMasteryProgress(pat(1, 1, 1, { similarCorrectCount: 9 }), 3),
    ).toEqual({
      done: 3,
      needed: 3,
    })
  })

  it('follows the mastery setting', () => {
    expect(
      getMasteryProgress(pat(1, 1, 1, { similarCorrectCount: 2 }), 5),
    ).toEqual({
      done: 2,
      needed: 5,
    })
  })

  it('copes with a threshold below 1', () => {
    expect(getMasteryProgress(pat(1, 1), 0).needed).toBe(1)
  })
})
