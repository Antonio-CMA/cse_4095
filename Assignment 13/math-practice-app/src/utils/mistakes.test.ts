import { describe, expect, it } from 'vitest'
import type { MistakePattern } from '../types/mistake'
import {
  getMistakePatternId,
  mergeDuplicatePatterns,
  recordMistakeInPatterns,
} from './mistakes'

const AT = '2026-03-01T10:00:00.000Z'
const LATER = '2026-03-02T11:30:00.000Z'

const eightTimesSeven = {
  operation: 'multiplication' as const,
  firstOperand: 8,
  secondOperand: 7,
  correctAnswer: 56,
  difficulty: 2 as const,
  attemptedAt: AT,
}

function pattern(overrides: Partial<MistakePattern> = {}): MistakePattern {
  return {
    id: 'multiplication:8:7:L2',
    operation: 'multiplication',
    firstOperand: 8,
    secondOperand: 7,
    correctAnswer: 56,
    difficulty: 2,
    incorrectCount: 1,
    similarCorrectCount: 0,
    lastIncorrectAt: AT,
    mastered: false,
    ...overrides,
  }
}

describe('getMistakePatternId', () => {
  it('is built from the operation, the two numbers and the level', () => {
    expect(getMistakePatternId(eightTimesSeven)).toBe('multiplication:8:7:L2')
  })

  it('is the same for the same question', () => {
    expect(getMistakePatternId(eightTimesSeven)).toBe(
      getMistakePatternId({ ...eightTimesSeven, attemptedAt: LATER } as never),
    )
  })

  it('differs when the numbers are in a different order', () => {
    expect(
      getMistakePatternId({
        ...eightTimesSeven,
        firstOperand: 7,
        secondOperand: 8,
      }),
    ).not.toBe(getMistakePatternId(eightTimesSeven))
  })

  it('differs by operation and by level', () => {
    const base = getMistakePatternId(eightTimesSeven)
    expect(
      getMistakePatternId({ ...eightTimesSeven, operation: 'addition' }),
    ).not.toBe(base)
    expect(getMistakePatternId({ ...eightTimesSeven, difficulty: 3 })).not.toBe(
      base,
    )
  })
})

describe('recordMistakeInPatterns: a question missed for the first time', () => {
  it('starts a new pattern with every field filled in', () => {
    const result = recordMistakeInPatterns([], eightTimesSeven)

    expect(result).toEqual([
      {
        id: 'multiplication:8:7:L2',
        operation: 'multiplication',
        firstOperand: 8,
        secondOperand: 7,
        correctAnswer: 56,
        difficulty: 2,
        incorrectCount: 1,
        similarCorrectCount: 0,
        lastIncorrectAt: AT,
        mastered: false,
      },
    ])
  })

  it('keeps the patterns that were already there', () => {
    const other = pattern({
      id: 'addition:2:3:L1',
      operation: 'addition',
      firstOperand: 2,
      secondOperand: 3,
      correctAnswer: 5,
      difficulty: 1,
    })
    const result = recordMistakeInPatterns([other], eightTimesSeven)

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual(other)
    expect(result[1].id).toBe('multiplication:8:7:L2')
  })

  it('treats a different order, operation or level as a different pattern', () => {
    let patterns = recordMistakeInPatterns([], eightTimesSeven)
    patterns = recordMistakeInPatterns(patterns, {
      ...eightTimesSeven,
      firstOperand: 7,
      secondOperand: 8,
    })
    patterns = recordMistakeInPatterns(patterns, {
      ...eightTimesSeven,
      difficulty: 3,
    })
    patterns = recordMistakeInPatterns(patterns, {
      ...eightTimesSeven,
      operation: 'division',
      firstOperand: 56,
      secondOperand: 7,
      correctAnswer: 8,
    })

    expect(patterns).toHaveLength(4)
    expect(patterns.every((p) => p.incorrectCount === 1)).toBe(true)
  })
})

describe('recordMistakeInPatterns: a question missed again', () => {
  it('adds one to the miss count and updates the time', () => {
    const result = recordMistakeInPatterns([pattern({ incorrectCount: 2 })], {
      ...eightTimesSeven,
      attemptedAt: LATER,
    })
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      incorrectCount: 3,
      lastIncorrectAt: LATER,
    })
  })

  it('does not create a second record for the same mistake', () => {
    let patterns = recordMistakeInPatterns([], eightTimesSeven)
    for (let i = 0; i < 5; i++) {
      patterns = recordMistakeInPatterns(patterns, eightTimesSeven)
    }
    expect(patterns).toHaveLength(1)
    expect(patterns[0].incorrectCount).toBe(6)
  })

  it('starts progress towards mastery over', () => {
    const result = recordMistakeInPatterns(
      [pattern({ similarCorrectCount: 2 })],
      eightTimesSeven,
    )
    expect(result[0].similarCorrectCount).toBe(0)
  })

  it('makes a mastered pattern active again', () => {
    const result = recordMistakeInPatterns(
      [pattern({ mastered: true, similarCorrectCount: 3 })],
      eightTimesSeven,
    )
    expect(result[0]).toMatchObject({ mastered: false, similarCorrectCount: 0 })
  })

  it('only changes the pattern that was missed', () => {
    const other = pattern({
      id: 'addition:2:3:L1',
      operation: 'addition',
      firstOperand: 2,
      secondOperand: 3,
      correctAnswer: 5,
      difficulty: 1,
      incorrectCount: 4,
      similarCorrectCount: 2,
    })
    const result = recordMistakeInPatterns([pattern(), other], eightTimesSeven)
    expect(result[1]).toEqual(other)
  })

  it('keeps the original details of the question', () => {
    const result = recordMistakeInPatterns([pattern()], eightTimesSeven)
    expect(result[0]).toMatchObject({
      operation: 'multiplication',
      firstOperand: 8,
      secondOperand: 7,
      correctAnswer: 56,
      difficulty: 2,
    })
  })
})

describe('recordMistakeInPatterns: purity', () => {
  it('does not change the list or patterns it was given', () => {
    const original = [pattern({ incorrectCount: 2 })]
    const snapshot = JSON.parse(JSON.stringify(original))

    recordMistakeInPatterns(original, eightTimesSeven)
    recordMistakeInPatterns(original, { ...eightTimesSeven, difficulty: 4 })

    expect(original).toEqual(snapshot)
  })
})

describe('mergeDuplicatePatterns', () => {
  it('leaves a list without duplicates as it is', () => {
    const list = [
      pattern(),
      pattern({
        id: 'addition:2:3:L1',
        operation: 'addition',
        correctAnswer: 5,
      }),
    ]
    expect(mergeDuplicatePatterns(list)).toEqual(list)
  })

  it('merges records for the same mistake, adding up the misses', () => {
    const merged = mergeDuplicatePatterns([
      pattern({ incorrectCount: 2, lastIncorrectAt: AT }),
      pattern({
        incorrectCount: 3,
        lastIncorrectAt: LATER,
        similarCorrectCount: 1,
      }),
    ])

    expect(merged).toHaveLength(1)
    expect(merged[0]).toMatchObject({
      incorrectCount: 5,
      lastIncorrectAt: LATER,
      similarCorrectCount: 1,
    })
  })

  it('lets the most recent record decide the rest, whatever the order', () => {
    const older = pattern({
      lastIncorrectAt: AT,
      mastered: true,
      similarCorrectCount: 3,
    })
    const newer = pattern({
      lastIncorrectAt: LATER,
      mastered: false,
      similarCorrectCount: 0,
    })

    for (const list of [
      [older, newer],
      [newer, older],
    ]) {
      expect(mergeDuplicatePatterns(list)[0]).toMatchObject({
        mastered: false,
        similarCorrectCount: 0,
        lastIncorrectAt: LATER,
        incorrectCount: 2,
      })
    }
  })
})
