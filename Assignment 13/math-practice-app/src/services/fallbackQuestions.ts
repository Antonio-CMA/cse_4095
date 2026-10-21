import type {
  DifficultyLevel,
  MathOperation,
  Question,
} from '../types/question'
import { createId } from '../utils/ids'
import { OPERATION_SYMBOLS } from '../utils/math'

/**
 * Questions to show when making a fresh one fails, so practice never stops.
 * Everything here is deliberately plain and written out by hand: it must not
 * depend on the generators it is standing in for.
 */

interface FallbackProblem {
  first: number
  second: number
  answer: number
}

/** One ready-made problem for every operation at every level. */
export const FALLBACK_PROBLEMS: Record<
  MathOperation,
  Record<DifficultyLevel, FallbackProblem>
> = {
  addition: {
    1: { first: 3, second: 4, answer: 7 },
    2: { first: 12, second: 15, answer: 27 },
    3: { first: 45, second: 38, answer: 83 },
    4: { first: 125, second: 238, answer: 363 },
  },
  subtraction: {
    1: { first: 9, second: 4, answer: 5 },
    2: { first: 30, second: 12, answer: 18 },
    3: { first: 84, second: 37, answer: 47 },
    4: { first: 500, second: 230, answer: 270 },
  },
  multiplication: {
    1: { first: 3, second: 4, answer: 12 },
    2: { first: 6, second: 7, answer: 42 },
    3: { first: 7, second: 8, answer: 56 },
    4: { first: 12, second: 6, answer: 72 },
  },
  division: {
    1: { first: 12, second: 3, answer: 4 },
    2: { first: 42, second: 6, answer: 7 },
    3: { first: 96, second: 8, answer: 12 },
    4: { first: 144, second: 12, answer: 12 },
  },
}

/**
 * Four different answers that include the right one, without anything that
 * could fail: the answer and the next three numbers, turned round so the right
 * one is not always first.
 */
export function fallbackChoices(answer: number): number[] {
  const choices = [answer, answer + 1, answer + 2, answer + 3]
  const turn = answer % 4
  return [...choices.slice(turn), ...choices.slice(0, turn)]
}

function describe(operation: MathOperation, first: number, second: number) {
  return `${first} ${OPERATION_SYMBOLS[operation]} ${second} = ?`
}

/** A ready-made question for this operation and level. */
export function createFallbackQuestion(
  operation: MathOperation,
  difficulty: DifficultyLevel,
): Question {
  const { first, second, answer } = FALLBACK_PROBLEMS[operation][difficulty]
  return {
    id: createId(),
    operation,
    firstOperand: first,
    secondOperand: second,
    displayText: describe(operation, first, second),
    correctAnswer: answer,
    choices: fallbackChoices(answer),
    difficulty,
    source: 'regular',
  }
}

/**
 * A review question asking the mistake itself again (the one question that is
 * certain to be a fair test of it), still credited to its mistake pattern.
 */
export function createFallbackReviewQuestion(pattern: {
  id: string
  operation: MathOperation
  firstOperand: number
  secondOperand: number
  correctAnswer: number
  difficulty: DifficultyLevel
}): Question {
  return {
    id: createId(),
    operation: pattern.operation,
    firstOperand: pattern.firstOperand,
    secondOperand: pattern.secondOperand,
    displayText: describe(
      pattern.operation,
      pattern.firstOperand,
      pattern.secondOperand,
    ),
    correctAnswer: pattern.correctAnswer,
    choices: fallbackChoices(pattern.correctAnswer),
    difficulty: pattern.difficulty,
    source: 'mistake-review',
    mistakePatternId: pattern.id,
  }
}
