import type {
  DifficultyLevel,
  MathOperation,
  QuestionDraft,
} from '../types/question'
import { createId } from '../utils/ids'
import {
  OPERATION_SYMBOLS,
  randomInRange,
  randomInt,
  type Rng,
} from '../utils/math'
import {
  ADDITION_RULES,
  DIVISION_RULES,
  MULTIPLICATION_RULES,
  SUBTRACTION_RULES,
} from './difficultyRules'

export type OperationGenerator = (
  difficulty: DifficultyLevel,
  rng?: Rng,
) => QuestionDraft

/** Builds a question draft for a chosen problem (not a random one). */
export function buildDraft(
  operation: MathOperation,
  firstOperand: number,
  secondOperand: number,
  correctAnswer: number,
  difficulty: DifficultyLevel,
): QuestionDraft {
  return {
    id: createId(),
    operation,
    firstOperand,
    secondOperand,
    displayText: `${firstOperand} ${OPERATION_SYMBOLS[operation]} ${secondOperand} = ?`,
    correctAnswer,
    difficulty,
    source: 'regular',
  }
}

export const generateAddition: OperationGenerator = (
  difficulty,
  rng = Math.random,
) => {
  const { operand } = ADDITION_RULES[difficulty]
  const first = randomInRange(operand, rng)
  const second = randomInRange(operand, rng)
  return buildDraft('addition', first, second, first + second, difficulty)
}

export const generateSubtraction: OperationGenerator = (
  difficulty,
  rng = Math.random,
) => {
  const { operand } = SUBTRACTION_RULES[difficulty]
  const a = randomInRange(operand, rng)
  const b = randomInRange(operand, rng)
  // The larger number always comes first so the answer is never negative.
  const first = Math.max(a, b)
  const second = Math.min(a, b)
  return buildDraft('subtraction', first, second, first - second, difficulty)
}

export const generateMultiplication: OperationGenerator = (
  difficulty,
  rng = Math.random,
) => {
  const shapes = MULTIPLICATION_RULES[difficulty]
  const shape = shapes[randomInt(0, shapes.length - 1, rng)]
  const first = randomInRange(shape.first, rng)
  const second = randomInRange(shape.second, rng)
  return buildDraft('multiplication', first, second, first * second, difficulty)
}

export const generateDivision: OperationGenerator = (
  difficulty,
  rng = Math.random,
) => {
  const rule = DIVISION_RULES[difficulty]
  // Pick the divisor and the answer first, then build the dividend from them.
  // That keeps every answer a whole number and a divisor of zero impossible.
  const divisor = randomInRange(rule.divisor, rng)
  const maxQuotient = Math.min(
    rule.quotient.max,
    Math.floor(rule.maxDividend / divisor),
  )
  const quotient = randomInt(rule.quotient.min, maxQuotient, rng)
  return buildDraft(
    'division',
    divisor * quotient,
    divisor,
    quotient,
    difficulty,
  )
}

export const OPERATION_GENERATORS: Record<MathOperation, OperationGenerator> = {
  addition: generateAddition,
  subtraction: generateSubtraction,
  multiplication: generateMultiplication,
  division: generateDivision,
}
