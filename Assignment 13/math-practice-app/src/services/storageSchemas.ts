import type { MistakePattern } from '../types/mistake'
import type {
  DifficultyLevel,
  MathOperation,
  Question,
} from '../types/question'
import type {
  PracticeAttempt,
  PracticeSession,
  SessionLength,
} from '../types/session'
import { calculateAnswer } from '../utils/math'
import { getMistakePatternId } from '../utils/mistakes'
import { ALL_DIFFICULTIES, ALL_OPERATIONS } from '../utils/operations'
import {
  MAX_SESSION_LENGTH,
  validateQuestionChoices,
} from '../utils/validation'

/**
 * Checks for data that comes back from storage. Saved data can be damaged or
 * edited by hand, so each record is checked field by field before the app
 * trusts it. A record that fails is dropped; it never crashes the app.
 */

type Json = Record<string, unknown>

function isRecord(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isCount(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0
}

export function isOperation(value: unknown): value is MathOperation {
  return ALL_OPERATIONS.includes(value as MathOperation)
}

export function isDifficulty(value: unknown): value is DifficultyLevel {
  return ALL_DIFFICULTIES.includes(value as DifficultyLevel)
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
    reviewMode,
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
    // Sessions saved before review existed have no mode: they were regular.
    ...(reviewMode === 'regular' || reviewMode === 'mistake-review'
      ? { reviewMode }
      : {}),
    attempted,
    correct,
    incorrect,
  }
}

/**
 * A saved question. Only its own facts are checked (whole numbers, the answer
 * really is the answer, four sensible choices), not the difficulty ranges: the
 * app made this question itself, and review questions may sit outside them.
 */
export function parseStoredQuestion(value: unknown): Question | null {
  if (!isRecord(value)) return null
  const {
    id,
    operation,
    firstOperand,
    secondOperand,
    displayText,
    correctAnswer,
    choices,
    difficulty,
    source,
    mistakePatternId,
  } = value

  if (typeof id !== 'string' || id === '') return null
  if (!isOperation(operation) || !isDifficulty(difficulty)) return null
  if (typeof displayText !== 'string' || displayText === '') return null
  if (source !== 'regular' && source !== 'mistake-review') return null
  if (![firstOperand, secondOperand, correctAnswer].every(Number.isInteger)) {
    return null
  }
  if (operation === 'division' && secondOperand === 0) return null
  if (
    calculateAnswer(
      operation,
      firstOperand as number,
      secondOperand as number,
    ) !== correctAnswer
  ) {
    return null
  }
  if (!Array.isArray(choices)) return null
  if (
    validateQuestionChoices({
      choices: choices as number[],
      correctAnswer: correctAnswer as number,
    }).length > 0
  ) {
    return null
  }

  return {
    id,
    operation,
    firstOperand: firstOperand as number,
    secondOperand: secondOperand as number,
    displayText,
    correctAnswer: correctAnswer as number,
    choices: [...(choices as number[])],
    difficulty,
    source,
    ...(typeof mistakePatternId === 'string' && mistakePatternId !== ''
      ? { mistakePatternId }
      : {}),
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
    mistakePatternId,
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
    ...(typeof mistakePatternId === 'string' && mistakePatternId !== ''
      ? { mistakePatternId }
      : {}),
    attemptedAt,
    sessionId,
  }
}

export function parseStoredMistakePattern(
  value: unknown,
): MistakePattern | null {
  if (!isRecord(value)) return null
  const {
    operation,
    firstOperand,
    secondOperand,
    correctAnswer,
    difficulty,
    incorrectCount,
    similarCorrectCount,
    lastIncorrectAt,
    mastered,
  } = value

  if (!isOperation(operation) || !isDifficulty(difficulty)) return null
  if (![firstOperand, secondOperand, correctAnswer].every(Number.isInteger)) {
    return null
  }
  // The saved answer has to be the real answer to the saved question.
  if (
    calculateAnswer(
      operation,
      firstOperand as number,
      secondOperand as number,
    ) !== correctAnswer
  ) {
    return null
  }
  // A pattern exists because of at least one mistake.
  if (!isCount(incorrectCount) || incorrectCount < 1) return null
  if (!isCount(similarCorrectCount)) return null
  if (!isTimestamp(lastIncorrectAt)) return null
  if (typeof mastered !== 'boolean') return null

  return {
    // Always rebuilt from the question, so a damaged id cannot cause a
    // duplicate.
    id: getMistakePatternId({
      operation,
      firstOperand: firstOperand as number,
      secondOperand: secondOperand as number,
      difficulty,
    }),
    operation,
    firstOperand: firstOperand as number,
    secondOperand: secondOperand as number,
    correctAnswer: correctAnswer as number,
    difficulty,
    incorrectCount,
    similarCorrectCount,
    lastIncorrectAt,
    mastered,
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
