import type { DifficultyLevel, MathOperation } from '../types/question'
import { DIFFICULTY_OPTIONS, OPERATION_OPTIONS } from './practiceOptions'

/** "A", "A and B", "A, B and C". */
export function formatList(items: readonly string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

/** The operations in their usual order, e.g. "Addition and Division". */
export function formatOperations(operations: readonly MathOperation[]): string {
  return formatList(
    OPERATION_OPTIONS.filter((option) => operations.includes(option.value)).map(
      (option) => option.label,
    ),
  )
}

/** e.g. "Level 2: Easy". */
export function formatDifficulty(level: DifficultyLevel): string {
  const option = DIFFICULTY_OPTIONS.find((o) => o.value === level)
  return option ? `Level ${level}: ${option.label}` : `Level ${level}`
}
