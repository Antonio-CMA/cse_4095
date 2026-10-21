import type { MistakePattern } from '../types/mistake'
import type { DifficultyLevel, MathOperation } from '../types/question'
import { calculateAnswer } from '../utils/math'
import { getMistakePatternId } from '../utils/mistakes'

/** A mistake pattern for `first <operation> second`, with sensible defaults. */
export function makePattern(
  operation: MathOperation = 'multiplication',
  firstOperand = 8,
  secondOperand = 7,
  difficulty: DifficultyLevel = 2,
  overrides: Partial<MistakePattern> = {},
): MistakePattern {
  return {
    id: getMistakePatternId({
      operation,
      firstOperand,
      secondOperand,
      difficulty,
    }),
    operation,
    firstOperand,
    secondOperand,
    correctAnswer: calculateAnswer(operation, firstOperand, secondOperand),
    difficulty,
    incorrectCount: 1,
    similarCorrectCount: 0,
    lastIncorrectAt: new Date().toISOString(),
    mastered: false,
    ...overrides,
  }
}
