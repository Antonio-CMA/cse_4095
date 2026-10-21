import { randomInt, type Rng } from './math'

/**
 * Friendly messages for young students. They are always encouraging: a missed
 * question is treated as part of learning, never as a failure (spec §13.4).
 */

export const RIGHT_MESSAGES: readonly string[] = [
  'Great job!',
  'Nice work!',
  'You got it!',
  'Awesome!',
  'Way to go!',
  'Super thinking!',
]

export const WRONG_MESSAGES: readonly string[] = [
  'Keep practicing!',
  'You are improving!',
  'Good try! Every question helps you learn.',
  "Nice effort! You'll get it next time.",
  "That's okay. Mistakes help us learn!",
  'You are getting better with every try!',
]

/**
 * A message to show after an answer. It is chosen at random, but never the same
 * one twice in a row, so it stays friendly without becoming repetitive.
 */
export function pickFeedback(
  correct: boolean,
  previous: string | null = null,
  rng: Rng = Math.random,
): string {
  const messages = correct ? RIGHT_MESSAGES : WRONG_MESSAGES
  const choices = messages.filter((message) => message !== previous)
  return choices[randomInt(0, choices.length - 1, rng)]
}

/**
 * A message for the end of a session, matched to how it went. It is always
 * kind: even a hard session ends with a reason to keep going. Returns null if
 * nothing was answered (there is nothing to comment on).
 */
export function getSessionEncouragement(
  accuracy: number | null,
): string | null {
  if (accuracy === null) return null
  if (accuracy === 100) return 'Perfect score! Amazing work!'
  if (accuracy >= 80) return 'Great job! You really know your stuff.'
  if (accuracy >= 60) return 'Nice work! You are improving.'
  if (accuracy > 0) {
    return 'Good effort! Keep practicing and it will get easier.'
  }
  return 'Every try helps you learn. Keep practicing!'
}
