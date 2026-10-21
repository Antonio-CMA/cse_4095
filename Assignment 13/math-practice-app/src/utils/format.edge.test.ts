import { describe, expect, it } from 'vitest'
import type { DifficultyLevel } from '../types/question'
import { formatDifficulty } from './format'

describe('formatDifficulty', () => {
  it('names a known level', () => {
    expect(formatDifficulty(2)).toBe('Level 2: Easy')
  })

  it('still says something sensible for a level it has no name for', () => {
    expect(formatDifficulty(9 as DifficultyLevel)).toBe('Level 9')
  })
})
