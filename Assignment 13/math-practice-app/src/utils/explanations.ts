import type { Question } from '../types/question'

type Explainable = Pick<
  Question,
  'operation' | 'firstOperand' | 'secondOperand' | 'correctAnswer'
>

/**
 * A short, friendly explanation of how to get to the answer, with a way to
 * check it. Shown on the back of the card when the answer was missed.
 */
export function explainSolution(question: Explainable): string {
  const {
    operation,
    firstOperand: a,
    secondOperand: b,
    correctAnswer,
  } = question

  switch (operation) {
    case 'addition':
      return `Adding ${a} and ${b} together makes ${correctAnswer}. You can check it by subtracting: ${correctAnswer} − ${b} = ${a}.`
    case 'subtraction':
      return `Taking ${b} away from ${a} leaves ${correctAnswer}. You can check it by adding: ${correctAnswer} + ${b} = ${a}.`
    case 'multiplication':
      if (a === 0 || b === 0) {
        return 'Anything multiplied by 0 is 0, because there is nothing in the groups.'
      }
      return `${a} groups of ${b} make ${correctAnswer}. You can check it by dividing: ${correctAnswer} ÷ ${b} = ${a}.`
    case 'division':
      return `Sharing ${a} into groups of ${b} makes ${correctAnswer} groups. You can check it by multiplying: ${b} × ${correctAnswer} = ${a}.`
  }
}
