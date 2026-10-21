import {
  ADDITION_RULES,
  DIVISION_RULES,
  MULTIPLICATION_RULES,
  SUBTRACTION_RULES,
} from '../services/difficultyRules'
import type { DifficultyLevel, QuestionDraft } from '../types/question'
import { calculateAnswer, type Range } from './math'

const OPERATIONS = ['addition', 'subtraction', 'multiplication', 'division']
const DIFFICULTIES: DifficultyLevel[] = [1, 2, 3, 4]

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

  if (!OPERATIONS.includes(operation)) {
    return [`Unsupported operation: ${operation}`]
  }
  if (!DIFFICULTIES.includes(difficulty)) {
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
