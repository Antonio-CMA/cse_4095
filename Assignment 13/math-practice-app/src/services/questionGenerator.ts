import type {
  DifficultyLevel,
  MathOperation,
  QuestionDraft,
} from '../types/question'
import { randomInt, type Rng } from '../utils/math'
import { validateQuestionDraft } from '../utils/validation'
import { OPERATION_GENERATORS } from './operationGenerators'

/** How many times to try again if a generated question fails validation. */
const MAX_ATTEMPTS = 5

export class QuestionGenerationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'QuestionGenerationError'
  }
}

/**
 * Generates one validated question for the given operation and difficulty.
 * Multiple-choice answers are added in Phase 5.
 */
export function generateQuestionDraft(
  operation: MathOperation,
  difficulty: DifficultyLevel,
  rng: Rng = Math.random,
): QuestionDraft {
  const generate = OPERATION_GENERATORS[operation]
  if (typeof generate !== 'function') {
    throw new QuestionGenerationError(`Unsupported operation: ${operation}`)
  }

  let problems: string[] = []
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const draft = generate(difficulty, rng)
    problems = validateQuestionDraft(draft)
    if (problems.length === 0) return draft
  }

  throw new QuestionGenerationError(
    `Could not generate a valid ${operation} question at level ${difficulty}: ${problems.join('; ')}`,
  )
}

/** Picks one of the enabled operations at random, then generates a question. */
export function generateRandomQuestionDraft(
  operations: readonly MathOperation[],
  difficulty: DifficultyLevel,
  rng: Rng = Math.random,
): QuestionDraft {
  if (operations.length === 0) {
    throw new QuestionGenerationError('Choose at least one operation')
  }
  const operation = operations[randomInt(0, operations.length - 1, rng)]
  return generateQuestionDraft(operation, difficulty, rng)
}
