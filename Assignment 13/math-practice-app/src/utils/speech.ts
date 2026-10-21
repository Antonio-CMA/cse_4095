import type { MathOperation, Question } from '../types/question'

/**
 * Plain-words versions of a problem, for screen readers. Symbols such as × and
 * − are read inconsistently, so announcements spell the problem out.
 */

const OPERATION_WORDS: Record<MathOperation, string> = {
  addition: 'plus',
  subtraction: 'minus',
  multiplication: 'times',
  division: 'divided by',
}

type Problem = Pick<Question, 'operation' | 'firstOperand' | 'secondOperand'>

/** e.g. "7 times 8". */
export function speakProblem(problem: Problem): string {
  return `${problem.firstOperand} ${OPERATION_WORDS[problem.operation]} ${problem.secondOperand}`
}

/** e.g. "7 times 8 equals what?". */
export function speakQuestion(problem: Problem): string {
  return `${speakProblem(problem)} equals what?`
}

/** e.g. "7 times 8 equals 56". */
export function speakSolution(
  problem: Problem & Pick<Question, 'correctAnswer'>,
): string {
  return `${speakProblem(problem)} equals ${problem.correctAnswer}`
}
