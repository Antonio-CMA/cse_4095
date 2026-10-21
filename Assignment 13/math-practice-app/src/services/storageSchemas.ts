import type { DifficultyLevel, MathOperation } from '../types/question'
import type {
  PracticeAttempt,
  PracticeSession,
  SessionLength,
} from '../types/session'
import { MAX_SESSION_LENGTH } from '../utils/validation'

/**
 * Checks for data that comes back from storage. Saved data can be damaged or
 * edited by hand, so each record is checked field by field before the app
 * trusts it. A record that fails is dropped; it never crashes the app.
 */

const OPERATIONS: MathOperation[] = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
]
const DIFFICULTIES: DifficultyLevel[] = [1, 2, 3, 4]

type Json = Record<string, unknown>

function isRecord(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isCount(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0
}

export function isOperation(value: unknown): value is MathOperation {
  return OPERATIONS.includes(value as MathOperation)
}

export function isDifficulty(value: unknown): value is DifficultyLevel {
  return DIFFICULTIES.includes(value as DifficultyLevel)
}

export function isSessionLength(value: unknown): value is SessionLength {
  return (
    value === 'continuous' ||
    (Number.isInteger(value) &&
      (value as number) >= 1 &&
      (value as number) <= MAX_SESSION_LENGTH)
  )
}

/** A string that is a real date and time, such as an ISO timestamp. */
function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

export function parseStoredSession(value: unknown): PracticeSession | null {
  if (!isRecord(value)) return null
  const {
    id,
    startedAt,
    completedAt,
    operations,
    difficulty,
    sessionLength,
    attempted,
    correct,
    incorrect,
  } = value

  if (typeof id !== 'string' || id === '') return null
  if (!isTimestamp(startedAt)) return null
  if (completedAt !== undefined && !isTimestamp(completedAt)) return null
  if (!Array.isArray(operations) || operations.length === 0) return null
  if (!operations.every(isOperation)) return null
  if (!isDifficulty(difficulty) || !isSessionLength(sessionLength)) return null
  if (!isCount(attempted) || !isCount(correct) || !isCount(incorrect)) {
    return null
  }
  if (correct + incorrect !== attempted) return null

  return {
    id,
    startedAt,
    ...(completedAt !== undefined ? { completedAt } : {}),
    operations: [...new Set(operations)],
    difficulty,
    sessionLength,
    attempted,
    correct,
    incorrect,
  }
}

export function parseStoredAttempt(value: unknown): PracticeAttempt | null {
  if (!isRecord(value)) return null
  const {
    id,
    questionId,
    operation,
    firstOperand,
    secondOperand,
    correctAnswer,
    selectedAnswer,
    selfReportedCorrect,
    difficulty,
    source,
    attemptedAt,
    sessionId,
  } = value

  if (typeof id !== 'string' || id === '') return null
  if (typeof questionId !== 'string' || typeof sessionId !== 'string') {
    return null
  }
  if (!isOperation(operation) || !isDifficulty(difficulty)) return null
  if (
    ![firstOperand, secondOperand, correctAnswer, selectedAnswer].every(
      Number.isInteger,
    )
  ) {
    return null
  }
  if (typeof selfReportedCorrect !== 'boolean') return null
  if (source !== 'regular' && source !== 'mistake-review') return null
  if (!isTimestamp(attemptedAt)) return null

  return {
    id,
    questionId,
    operation,
    firstOperand: firstOperand as number,
    secondOperand: secondOperand as number,
    correctAnswer: correctAnswer as number,
    selectedAnswer: selectedAnswer as number,
    selfReportedCorrect,
    difficulty,
    source,
    attemptedAt,
    sessionId,
  }
}

/**
 * Turns a saved list into valid records, silently dropping any that are
 * damaged. Returns null if the saved value is not a list at all.
 */
export function parseStoredList<T>(
  value: unknown,
  parseItem: (item: unknown) => T | null,
): T[] | null {
  if (!Array.isArray(value)) return null
  return value.map(parseItem).filter((item): item is T => item !== null)
}
