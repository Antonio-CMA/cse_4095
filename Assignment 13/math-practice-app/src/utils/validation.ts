import {
  ADDITION_RULES,
  DIVISION_RULES,
  MULTIPLICATION_RULES,
  SUBTRACTION_RULES,
} from '../services/difficultyRules'
import type {
  DifficultyLevel,
  Question,
  QuestionDraft,
} from '../types/question'
import type { MathOperation } from '../types/question'
import type { PracticeConfig, SessionResult } from '../types/session'
import { calculateAnswer, type Range } from './math'
import { ALL_DIFFICULTIES, ALL_OPERATIONS } from './operations'

function inRange(n: number, range: Range): boolean {
  return n >= range.min && n <= range.max
}

/**
 * Checks a question draft against the rules in the spec (§18) and returns a
 * list of problems — an empty list means the draft is valid.
 */
export function validateQuestionDraft(question: QuestionDraft): string[] {
  const {
    operation,
    firstOperand: a,
    secondOperand: b,
    correctAnswer,
  } = question
  const difficulty = question.difficulty

  if (!ALL_OPERATIONS.includes(operation)) {
    return [`Unsupported operation: ${operation}`]
  }
  if (!ALL_DIFFICULTIES.includes(difficulty)) {
    return [`Unsupported difficulty: ${difficulty}`]
  }

  const problems: string[] = []

  if (![a, b, correctAnswer].every(Number.isInteger)) {
    problems.push('Operands and answer must be whole numbers')
    return problems
  }

  if (operation === 'division' && b === 0) {
    problems.push('Division by zero')
    return problems
  }

  if (calculateAnswer(operation, a, b) !== correctAnswer) {
    problems.push('Correct answer does not match the operands')
  }
  if (correctAnswer < 0) {
    problems.push('Answer must not be negative')
  }

  switch (operation) {
    case 'addition': {
      const rule = ADDITION_RULES[difficulty]
      if (!inRange(a, rule.operand) || !inRange(b, rule.operand)) {
        problems.push('Operands are outside the difficulty range')
      }
      if (correctAnswer > rule.maxResult) {
        problems.push('Result is above the difficulty limit')
      }
      break
    }
    case 'subtraction': {
      const rule = SUBTRACTION_RULES[difficulty]
      if (!inRange(a, rule.operand) || !inRange(b, rule.operand)) {
        problems.push('Operands are outside the difficulty range')
      }
      break
    }
    case 'multiplication': {
      const fits = MULTIPLICATION_RULES[difficulty].some(
        (shape) => inRange(a, shape.first) && inRange(b, shape.second),
      )
      if (!fits) problems.push('Factors are outside the difficulty range')
      break
    }
    case 'division': {
      const rule = DIVISION_RULES[difficulty]
      if (a % b !== 0) problems.push('Division answer must be a whole number')
      if (!inRange(b, rule.divisor)) {
        problems.push('Divisor is outside the difficulty range')
      }
      if (!inRange(correctAnswer, rule.quotient)) {
        problems.push('Quotient is outside the difficulty range')
      }
      if (a > rule.maxDividend) {
        problems.push('Dividend is above the difficulty limit')
      }
      break
    }
  }

  return problems
}

export function isValidQuestionDraft(question: QuestionDraft): boolean {
  return validateQuestionDraft(question).length === 0
}

/** The number of multiple-choice answers every question must have. */
export const CHOICE_COUNT = 4

/** Checks the multiple-choice answers of a finished question. */
export function validateQuestionChoices(
  question: Pick<Question, 'choices' | 'correctAnswer'>,
): string[] {
  const { choices, correctAnswer } = question
  const problems: string[] = []

  if (choices.length !== CHOICE_COUNT) {
    problems.push(`There must be exactly ${CHOICE_COUNT} answer choices`)
  }
  if (!choices.every((choice) => Number.isInteger(choice) && choice >= 0)) {
    problems.push('Answer choices must be whole numbers that are not negative')
  }
  if (new Set(choices).size !== choices.length) {
    problems.push('Answer choices must all be different')
  }
  if (choices.filter((choice) => choice === correctAnswer).length !== 1) {
    problems.push('Exactly one answer choice must be the correct answer')
  }

  return problems
}

/** Everything wrong with a finished question; empty means it is ready to show. */
export function validateQuestion(question: Question): string[] {
  return [
    ...validateQuestionDraft(question),
    ...validateQuestionChoices(question),
  ]
}

export function isValidQuestion(question: Question): boolean {
  return validateQuestion(question).length === 0
}

/** The longest fixed-length session the app will accept. */
export const MAX_SESSION_LENGTH = 100

/**
 * Turns whatever arrived as navigation state into a usable practice setup, or
 * null if it is missing or not valid (for example after opening the practice
 * address directly).
 */
export function parsePracticeConfig(value: unknown): PracticeConfig | null {
  if (typeof value !== 'object' || value === null) return null
  const { operations, difficulty, sessionLength, reviewMode } = value as Record<
    string,
    unknown
  >

  if (!Array.isArray(operations) || operations.length === 0) return null
  if (!operations.every((op) => ALL_OPERATIONS.includes(op))) return null
  const uniqueOperations = [...new Set(operations)] as MathOperation[]

  if (!ALL_DIFFICULTIES.includes(difficulty as DifficultyLevel)) return null

  const lengthOk =
    sessionLength === 'continuous' ||
    (Number.isInteger(sessionLength) &&
      (sessionLength as number) >= 1 &&
      (sessionLength as number) <= MAX_SESSION_LENGTH)
  if (!lengthOk) return null

  return {
    operations: uniqueOperations,
    difficulty: difficulty as DifficultyLevel,
    sessionLength: sessionLength as PracticeConfig['sessionLength'],
    // Mistake review is not available yet, so everything runs as regular
    // practice; a missing or unknown mode is treated the same way.
    reviewMode: reviewMode === 'mistake-review' ? 'mistake-review' : 'regular',
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isCount(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0
}

/**
 * Checks that navigation state really is a finished session (as handed over
 * by the practice page) before the summary page trusts it. Returns null if the
 * state is missing or does not add up.
 */
export function parseSessionResult(value: unknown): SessionResult | null {
  if (!isRecord(value)) return null
  const { session, attempts } = value
  if (!isRecord(session) || !Array.isArray(attempts)) return null

  const setup = parsePracticeConfig({
    operations: session.operations,
    difficulty: session.difficulty,
    sessionLength: session.sessionLength,
  })
  if (!setup) return null

  const { id, startedAt, attempted, correct, incorrect } = session
  if (typeof id !== 'string' || typeof startedAt !== 'string') return null
  if (!isCount(attempted) || !isCount(correct) || !isCount(incorrect)) {
    return null
  }
  if (correct + incorrect !== attempted || attempts.length !== attempted) {
    return null
  }

  const attemptsOk = attempts.every(
    (attempt) =>
      isRecord(attempt) &&
      typeof attempt.selfReportedCorrect === 'boolean' &&
      (attempt.source === 'regular' || attempt.source === 'mistake-review'),
  )
  if (!attemptsOk) return null

  return value as unknown as SessionResult
}
