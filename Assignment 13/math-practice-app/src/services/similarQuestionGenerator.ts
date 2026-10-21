import type { MistakePattern } from '../types/mistake'
import type { MathOperation, Question } from '../types/question'
import { calculateAnswer, randomInt, type Rng } from '../utils/math'
import { validateQuestion, validateQuestionDraft } from '../utils/validation'
import { buildChoices } from './answerChoices'
import { buildDraft } from './operationGenerators'
import { QuestionGenerationError } from './questionGenerator'

/**
 * Questions that are related to a question the student missed, so they can
 * practise the same idea again without seeing the identical question.
 *
 * Three kinds of "similar" are used (spec §6.4):
 *  - nearby:      the same operation with numbers close to the originals
 *  - reversed:    the numbers swapped, for addition and multiplication only
 *  - fact-family: the related operation that uses the same three numbers
 *
 * Every related question stays at the same difficulty level as the original.
 */

export type SimilarityStrategy = 'nearby' | 'reversed' | 'fact-family'

const STRATEGIES: readonly SimilarityStrategy[] = [
  'nearby',
  'reversed',
  'fact-family',
]

/** A problem on its own: which operation, and the two numbers in order. */
export interface Problem {
  operation: MathOperation
  first: number
  second: number
}

type PatternProblem = Pick<
  MistakePattern,
  'operation' | 'firstOperand' | 'secondOperand' | 'correctAnswer'
>

/** A short text key for a problem, e.g. "multiplication:8:7". */
export function getProblemKey(problem: {
  operation: MathOperation
  firstOperand: number
  secondOperand: number
}): string {
  return `${problem.operation}:${problem.firstOperand}:${problem.secondOperand}`
}

function keyOf(problem: Problem): string {
  return getProblemKey({
    operation: problem.operation,
    firstOperand: problem.first,
    secondOperand: problem.second,
  })
}

// ---- The three ways of finding related problems ----

/** Small steps for small numbers, bigger steps for big ones. */
function offsetsFor(n: number): number[] {
  return n >= 100 ? [-10, -5, -1, 0, 1, 5, 10] : [-2, -1, 0, 1, 2]
}

/** Same operation, numbers close to the originals. */
export function nearbyProblems(pattern: PatternProblem): Problem[] {
  const { operation, firstOperand: a, secondOperand: b } = pattern

  if (operation === 'division') {
    // A division is built from its divisor and answer, so move those. The
    // dividend then follows, and the answer is always a whole number.
    const quotient = pattern.correctAnswer
    return offsetsFor(b).flatMap((db) =>
      offsetsFor(quotient).flatMap((dq) => {
        const divisor = b + db
        const answer = quotient + dq
        return (db !== 0 || dq !== 0) && divisor >= 1 && answer >= 1
          ? [{ operation, first: divisor * answer, second: divisor }]
          : []
      }),
    )
  }

  return offsetsFor(a).flatMap((da) =>
    offsetsFor(b).flatMap((db) =>
      (da !== 0 || db !== 0) && a + da >= 0 && b + db >= 0
        ? [{ operation, first: a + da, second: b + db }]
        : [],
    ),
  )
}

/**
 * The same numbers the other way round. Only addition and multiplication give
 * the same answer that way, so subtraction and division have no reversed form
 * (3 − 8 is a different problem altogether, not the same one turned around).
 */
export function reversedProblems(pattern: PatternProblem): Problem[] {
  const { operation, firstOperand: a, secondOperand: b } = pattern
  const commutes = operation === 'addition' || operation === 'multiplication'
  if (!commutes || a === b) return []
  return [{ operation, first: b, second: a }]
}

/** The related operation using the same three numbers. */
export function factFamilyProblems(pattern: PatternProblem): Problem[] {
  const { operation, firstOperand: a, secondOperand: b } = pattern
  const answer = pattern.correctAnswer

  switch (operation) {
    case 'multiplication': // a × b = c  →  c ÷ a = b  and  c ÷ b = a
      return [
        { operation: 'division', first: answer, second: a },
        { operation: 'division', first: answer, second: b },
      ]
    case 'division': // a ÷ b = c  →  b × c = a  and  c × b = a
      return [
        { operation: 'multiplication', first: b, second: answer },
        { operation: 'multiplication', first: answer, second: b },
      ]
    case 'addition': // a + b = c  →  c − a = b  and  c − b = a
      return [
        { operation: 'subtraction', first: answer, second: a },
        { operation: 'subtraction', first: answer, second: b },
      ]
    case 'subtraction': // a − b = c  →  b + c = a  and  c + b = a
      return [
        { operation: 'addition', first: b, second: answer },
        { operation: 'addition', first: answer, second: b },
      ]
  }
}

const FINDERS: Record<
  SimilarityStrategy,
  (pattern: PatternProblem) => Problem[]
> = {
  nearby: nearbyProblems,
  reversed: reversedProblems,
  'fact-family': factFamilyProblems,
}

// ---- Choosing one ----

/** Keeps only the problems that are real questions at the pattern's level. */
function usableProblems(pattern: MistakePattern, problems: Problem[]) {
  const seen = new Set<string>([getProblemKey(pattern)]) // never the original
  const usable: Problem[] = []

  for (const problem of problems) {
    const key = keyOf(problem)
    if (seen.has(key)) continue
    seen.add(key)

    // Division by zero is rejected before any arithmetic is attempted.
    if (problem.operation === 'division' && problem.second === 0) continue
    const answer = calculateAnswer(
      problem.operation,
      problem.first,
      problem.second,
    )
    const draft = buildDraft(
      problem.operation,
      problem.first,
      problem.second,
      answer,
      pattern.difficulty,
    )
    if (validateQuestionDraft(draft).length === 0) usable.push(problem)
  }
  return usable
}

export interface SimilarChoice {
  strategy: SimilarityStrategy
  problem: Problem
}

/**
 * Picks a similar problem: first one of the three strategies that has
 * something to offer, then one of its problems. Problems named in `avoid` (ones
 * shown recently) are skipped when there is any alternative. If nothing related
 * exists at all, the original problem is returned so practice can carry on.
 */
export function pickSimilarProblem(
  pattern: MistakePattern,
  rng: Rng = Math.random,
  avoid: readonly string[] = [],
): SimilarChoice {
  const options = STRATEGIES.map((strategy) => ({
    strategy,
    problems: usableProblems(pattern, FINDERS[strategy](pattern)),
  })).filter((option) => option.problems.length > 0)

  if (options.length === 0) {
    return {
      strategy: 'nearby',
      problem: {
        operation: pattern.operation,
        first: pattern.firstOperand,
        second: pattern.secondOperand,
      },
    }
  }

  const isFresh = (problem: Problem) => !avoid.includes(keyOf(problem))
  const fresh = options
    .map((o) => ({ ...o, problems: o.problems.filter(isFresh) }))
    .filter((o) => o.problems.length > 0)

  const pool = fresh.length > 0 ? fresh : options
  const chosen = pool[randomInt(0, pool.length - 1, rng)]
  return {
    strategy: chosen.strategy,
    problem: chosen.problems[randomInt(0, chosen.problems.length - 1, rng)],
  }
}

/**
 * A complete multiple-choice question related to a mistake pattern. It is
 * labelled as a mistake-review question and carries the pattern's id, so the
 * answer can be credited to the right pattern later.
 */
export function generateSimilarQuestion(
  pattern: MistakePattern,
  rng: Rng = Math.random,
  avoid: readonly string[] = [],
): Question {
  const { problem } = pickSimilarProblem(pattern, rng, avoid)
  const draft = buildDraft(
    problem.operation,
    problem.first,
    problem.second,
    calculateAnswer(problem.operation, problem.first, problem.second),
    pattern.difficulty,
  )

  const question: Question = {
    ...draft,
    choices: [],
    source: 'mistake-review',
    mistakePatternId: pattern.id,
  }
  try {
    question.choices = buildChoices(draft, rng)
  } catch (error) {
    throw new QuestionGenerationError(
      `Could not build answer choices for ${draft.displayText}: ${String(error)}`,
    )
  }

  const problems = validateQuestion(question)
  if (problems.length > 0) {
    throw new QuestionGenerationError(
      `Generated an invalid similar question: ${problems.join('; ')}`,
    )
  }
  return question
}
