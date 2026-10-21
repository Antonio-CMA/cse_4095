import type { Question } from '../types/question'
import { OPERATION_SYMBOLS } from './math'

/** The finished sum with its answer filled in, e.g. "7 × 8 = 56". */
export function formatSolution(
  question: Pick<
    Question,
    'operation' | 'firstOperand' | 'secondOperand' | 'correctAnswer'
  >,
): string {
  const { operation, firstOperand, secondOperand, correctAnswer } = question
  return `${firstOperand} ${OPERATION_SYMBOLS[operation]} ${secondOperand} = ${correctAnswer}`
}
