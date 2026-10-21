import type {
  DifficultyLevel,
  MathOperation,
  Question,
  QuestionDraft,
} from '../types/question'
import { randomInt, type Rng } from '../utils/math'
import { validateQuestion, validateQuestionDraft } from '../utils/validation'
import { buildChoices } from './answerChoices'
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
 * shuffled multiple-choice answers.
 */
export function generateQuestion(
  operation: MathOperation,
  difficulty: DifficultyLevel,
  rng: Rng = Math.random,
): Question {
  const draft = generateQuestionDraft(operation, difficulty, rng)
  const question: Question = { ...draft, choices: buildChoices(draft, rng) }

  const problems = validateQuestion(question)
  if (problems.length > 0) {
    throw new QuestionGenerationError(
      `Generated an invalid ${operation} question: ${problems.join('; ')}`,
    )
  }
  return question
}

/** Picks one of the enabled operations at random, then generates a question. */
export function generateRandomQuestion(
  operations: readonly MathOperation[],
  difficulty: DifficultyLevel,
  rng: Rng = Math.random,
): Question {
  if (operations.length === 0) {
    throw new QuestionGenerationError('Choose at least one operation')
  }
  const operation = operations[randomInt(0, operations.length - 1, rng)]
  return generateQuestion(operation, difficulty, rng)
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
 */
export function generateNextQuestion(
  operations: readonly MathOperation[],
  difficulty: DifficultyLevel,
  previous?: Question,
  rng: Rng = Math.random,
): Question {
  let question = generateRandomQuestion(operations, difficulty, rng)
  for (
    let retry = 0;
    previous && isSameProblem(question, previous) && retry < MAX_REPEAT_RETRIES;
    retry++
  ) {
    question = generateRandomQuestion(operations, difficulty, rng)
  }
  return question
}
