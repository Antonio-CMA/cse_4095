import type { QuestionDraft } from '../types/question'
import { type Rng } from '../utils/math'
import { shuffle } from '../utils/shuffle'
import { generateDistractors } from './distractors'

/**
 * The four multiple-choice answers for a question: the right answer plus three
 * believable wrong ones, shuffled so the right answer can land anywhere.
 */
export function buildChoices(
  question: QuestionDraft,
  rng: Rng = Math.random,
): number[] {
  const distractors = generateDistractors(question, rng)
  return shuffle([question.correctAnswer, ...distractors], rng)
}
