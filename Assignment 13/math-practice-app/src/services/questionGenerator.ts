import type {
  DifficultyLevel,
  MathOperation,
  Question,
  QuestionDraft,
} from '../types/question'
import { logDevError } from '../utils/devLog'
import { randomInt, type Rng } from '../utils/math'
import { validateQuestion, validateQuestionDraft } from '../utils/validation'
import { buildChoices } from './answerChoices'
import { createFallbackQuestion } from './fallbackQuestions'
import { OPERATION_GENERATORS } from './operationGenerators'

/** How many times to try again if a generated question fails validation. */
const MAX_ATTEMPTS = 5

export class QuestionGenerationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'QuestionGenerationError'
  }
}

/** Generates one validated question without its multiple-choice answers. */
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

/**
 * Generates one complete, validated question: the arithmetic problem plus four
 * shuffled multiple-choice answers. A question that fails its checks (a bad
 * problem, or answer choices that do not work) is thrown away and another is
 * tried, up to MAX_ATTEMPTS times, before giving up with an error.
 */
export function generateQuestion(
  operation: MathOperation,
  difficulty: DifficultyLevel,
  rng: Rng = Math.random,
): Question {
  let lastError: unknown
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const draft = generateQuestionDraft(operation, difficulty, rng)
      const question: Question = { ...draft, choices: buildChoices(draft, rng) }

      const problems = validateQuestion(question)
      if (problems.length === 0) return question
      lastError = new QuestionGenerationError(
        `Generated an invalid ${operation} question: ${problems.join('; ')}`,
      )
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof QuestionGenerationError
    ? lastError
    : new QuestionGenerationError(
        `Could not generate a ${operation} question at level ${difficulty}: ${String(lastError)}`,
      )
}

/**
 * Like `generateQuestion`, but never fails: if a question cannot be made, the
 * problem is logged for developers and a ready-made question is used instead,
 * so a session is never interrupted.
 */
export function generateQuestionSafely(
  operation: MathOperation,
  difficulty: DifficultyLevel,
  rng: Rng = Math.random,
): Question {
  try {
    return generateQuestion(operation, difficulty, rng)
  } catch (error) {
    logDevError('Could not generate a question, so a fallback was used.', {
      operation,
      difficulty,
      error,
    })
    return createFallbackQuestion(operation, difficulty)
  }
}

function pickOperation(
  operations: readonly MathOperation[],
  rng: Rng,
): MathOperation {
  if (operations.length === 0) {
    throw new QuestionGenerationError('Choose at least one operation')
  }
  return operations[randomInt(0, operations.length - 1, rng)]
}

/** Picks one of the enabled operations at random, then generates a question. */
export function generateRandomQuestion(
  operations: readonly MathOperation[],
  difficulty: DifficultyLevel,
  rng: Rng = Math.random,
): Question {
  return generateQuestion(pickOperation(operations, rng), difficulty, rng)
}

/** How many times to re-draw to avoid showing the same problem twice in a row. */
const MAX_REPEAT_RETRIES = 10

function isSameProblem(a: Question, b: Question): boolean {
  return (
    a.operation === b.operation &&
    a.firstOperand === b.firstOperand &&
    a.secondOperand === b.secondOperand
  )
}

/**
 * The next question in a session. It avoids repeating the problem that was
 * just shown (unless the level is so small that it keeps drawing the same one).
 * It always returns a question: if one cannot be made, a fallback is used.
 */
export function generateNextQuestion(
  operations: readonly MathOperation[],
  difficulty: DifficultyLevel,
  previous?: Question,
  rng: Rng = Math.random,
): Question {
  const draw = () =>
    generateQuestionSafely(pickOperation(operations, rng), difficulty, rng)

  let question = draw()
  for (
    let retry = 0;
    previous && isSameProblem(question, previous) && retry < MAX_REPEAT_RETRIES;
    retry++
  ) {
    question = draw()
  }
  return question
}
