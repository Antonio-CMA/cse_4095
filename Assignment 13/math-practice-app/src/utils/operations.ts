import type { DifficultyLevel, MathOperation } from '../types/question'

/** Every operation, in the order they are always shown. */
export const ALL_OPERATIONS: readonly MathOperation[] = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
]

/** Every difficulty level, easiest first. */
export const ALL_DIFFICULTIES: readonly DifficultyLevel[] = [1, 2, 3, 4]
