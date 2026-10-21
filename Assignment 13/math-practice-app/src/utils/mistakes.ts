import type { MistakePattern } from '../types/mistake'
import type { PracticeAttempt } from '../types/session'

/** The parts of an answer that identify which question it was. */
type QuestionFact = Pick<
  PracticeAttempt,
  'operation' | 'firstOperand' | 'secondOperand' | 'difficulty'
>

/**
 * The identity of a mistake: the same operation, the same two numbers (in the
 * same order) at the same level. Missing 8 × 7 twice is one pattern; 7 × 8 and
 * 8 × 6 are different ones. Because the id comes from the question itself, the
 * same mistake can never be stored twice.
 */
export function getMistakePatternId(fact: QuestionFact): string {
  return `${fact.operation}:${fact.firstOperand}:${fact.secondOperand}:L${fact.difficulty}`
}

/**
 * The mistake patterns after one more wrong answer.
 *
 * - A question missed for the first time starts a new pattern.
 * - A question missed again updates its pattern: one more miss, the new time,
 *   and any progress towards mastering it starts over (a mastered pattern
 *   becomes active again).
 *
 * The list passed in is not changed.
 */
export function recordMistakeInPatterns(
  patterns: readonly MistakePattern[],
  attempt: QuestionFact &
    Pick<PracticeAttempt, 'correctAnswer' | 'attemptedAt'>,
): MistakePattern[] {
  const id = getMistakePatternId(attempt)

  if (!patterns.some((pattern) => pattern.id === id)) {
    return [
      ...patterns,
      {
        id,
        operation: attempt.operation,
        firstOperand: attempt.firstOperand,
        secondOperand: attempt.secondOperand,
        correctAnswer: attempt.correctAnswer,
        difficulty: attempt.difficulty,
        incorrectCount: 1,
        similarCorrectCount: 0,
        lastIncorrectAt: attempt.attemptedAt,
        mastered: false,
      },
    ]
  }

  return patterns.map((pattern) =>
    pattern.id === id
      ? {
          ...pattern,
          incorrectCount: pattern.incorrectCount + 1,
          lastIncorrectAt: attempt.attemptedAt,
          similarCorrectCount: 0,
          mastered: false,
        }
      : pattern,
  )
}

/**
 * Collapses records that describe the same mistake into one (for example if
 * saved data was damaged or edited). The misses are added together and the
 * most recent record decides the rest.
 */
export function mergeDuplicatePatterns(
  patterns: readonly MistakePattern[],
): MistakePattern[] {
  const merged = new Map<string, MistakePattern>()

  for (const pattern of patterns) {
    const existing = merged.get(pattern.id)
    if (!existing) {
      merged.set(pattern.id, pattern)
      continue
    }
    const newer =
      Date.parse(pattern.lastIncorrectAt) >=
      Date.parse(existing.lastIncorrectAt)
        ? pattern
        : existing
    merged.set(pattern.id, {
      ...newer,
      incorrectCount: existing.incorrectCount + pattern.incorrectCount,
    })
  }
  return [...merged.values()]
}
