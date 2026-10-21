import type { QuestionDraft } from '../types/question'
import { type Rng } from '../utils/math'
import { shuffle } from '../utils/shuffle'

/** How many wrong answers each question needs (four choices in total). */
export const DISTRACTOR_COUNT = 3

/** Upper limit on the last-resort search so it can never loop forever. */
const MAX_FALLBACK_STEPS = 50

const NEARBY_OFFSETS = [1, 2, 3, 5, 10]

/** Answers just above and below the right one (an "almost" answer). */
function nearbyNumbers(correct: number): number[] {
  const offsets = correct >= 100 ? [...NEARBY_OFFSETS, 100] : NEARBY_OFFSETS
  return offsets.flatMap((offset) => [correct + offset, correct - offset])
}

/** Answers a child might land on after a typical slip for this operation. */
function operationMistakes(question: QuestionDraft): number[] {
  const { operation, firstOperand: a, secondOperand: b } = question
  const correct = question.correctAnswer

  switch (operation) {
    case 'addition':
      return [
        correct + 10, // carried when they shouldn't have
        correct - 10, // forgot to carry
        Math.abs(a - b), // subtracted instead of adding
      ]
    case 'subtraction':
      return [
        correct + 10, // borrowed the wrong way
        correct - 10, // forgot to borrow
        a + b, // added instead of subtracting
      ]
    case 'multiplication':
      return [
        (a + 1) * b, // neighbouring times-table facts
        (a - 1) * b,
        a * (b + 1),
        a * (b - 1),
        a + b, // added instead of multiplying
      ]
    case 'division':
      return [
        correct + 1, // neighbouring facts in the same fact family
        correct - 1,
        correct + 2,
        correct - 2,
        b, // gave back the divisor
        a - b, // subtracted instead of dividing
      ]
  }
}

/**
 * Three believable wrong answers for a question. Every one is a different
 * whole number, never negative, never equal to the right answer, and close
 * enough to the right answer to be tempting.
 */
export function generateDistractors(
  question: QuestionDraft,
  rng: Rng = Math.random,
  count: number = DISTRACTOR_COUNT,
): number[] {
  const correct = question.correctAnswer
  const chosen = new Set<number>()

  // "Close enough to be believable": within 10, or half the answer if larger.
  const reachable = (n: number) =>
    Math.abs(n - correct) <= Math.max(10, Math.ceil(correct / 2))
  const isUsable = (n: number) =>
    Number.isInteger(n) && n >= 0 && n !== correct && !chosen.has(n)

  const take = (pool: number[], limit: number) => {
    for (const n of shuffle(pool, rng)) {
      if (chosen.size >= limit) return
      if (reachable(n) && isUsable(n)) chosen.add(n)
    }
  }

  const mistakes = operationMistakes(question)
  // Mix: a couple of operation-specific slips, then nearby answers, then
  // any remaining slips.
  take(mistakes, Math.min(2, count))
  take(nearbyNumbers(correct), count)
  take(mistakes, count)

  // Last resort: walk outward from the right answer. This is bounded, so it
  // cannot loop forever.
  for (
    let step = 1;
    chosen.size < count && step <= MAX_FALLBACK_STEPS;
    step++
  ) {
    for (const n of [correct + step, correct - step]) {
      if (chosen.size < count && isUsable(n)) chosen.add(n)
    }
  }

  if (chosen.size < count) {
    throw new Error(
      `Could not find ${count} wrong answers for ${question.displayText}`,
    )
  }
  return [...chosen]
}
