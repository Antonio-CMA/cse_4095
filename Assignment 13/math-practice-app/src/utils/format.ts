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

/** A small amount of saved data in plain words: "800 bytes", "392 KB", "1.4 MB". */
export function formatStorageSize(characters: number): string {
  if (characters < 1024) {
    return `${characters} ${characters === 1 ? 'byte' : 'bytes'}`
  }
  if (characters < 1024 * 1024) return `${Math.round(characters / 1024)} KB`
  return `${(characters / (1024 * 1024)).toFixed(1)} MB`
}

/** A date and time in the student's own language and format. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

/** Just the date, e.g. "Mar 1, 2026". */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' })
}
