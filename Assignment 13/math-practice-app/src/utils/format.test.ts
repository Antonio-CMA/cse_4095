import { describe, expect, it } from 'vitest'
import { formatDifficulty, formatList, formatOperations } from './format'

describe('formatList', () => {
  it('joins items the way you would say them', () => {
    expect(formatList([])).toBe('')
    expect(formatList(['A'])).toBe('A')
    expect(formatList(['A', 'B'])).toBe('A and B')
    expect(formatList(['A', 'B', 'C'])).toBe('A, B and C')
  })
})

describe('formatOperations', () => {
  it('uses friendly names in the usual order', () => {
    expect(formatOperations(['division', 'addition'])).toBe(
      'Addition and Division',
    )
    expect(
      formatOperations([
        'division',
        'multiplication',
        'subtraction',
        'addition',
      ]),
    ).toBe('Addition, Subtraction, Multiplication and Division')
    expect(formatOperations(['subtraction'])).toBe('Subtraction')
  })
})

describe('formatDifficulty', () => {
  it('shows the level number and name', () => {
    expect(formatDifficulty(1)).toBe('Level 1: Beginner')
    expect(formatDifficulty(2)).toBe('Level 2: Easy')
    expect(formatDifficulty(3)).toBe('Level 3: Intermediate')
    expect(formatDifficulty(4)).toBe('Level 4: Advanced')
  })
})
