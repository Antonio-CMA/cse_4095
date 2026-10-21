import type { MistakePattern } from '../types/mistake'
import type { Question } from '../types/question'
import type { PracticeConfig } from '../types/session'
import type { Rng } from '../utils/math'
import {
  describeReviewSession,
  getActivePatterns,
  pickPatternForReview,
} from '../utils/mistakeReview'
import { loadMistakePatterns } from './mistakeService'
import { generateNextQuestion } from './questionGenerator'
import {
  generateSimilarQuestion,
  getProblemKey,
} from './similarQuestionGenerator'

/** How many recent problems a review session avoids repeating. */
const RECENT_PROBLEMS = 6

/** What a review session needs to remember between questions. */
export interface ReviewState {
  patterns: MistakePattern[]
  recentKeys: string[]
  lastPatternId: string | null
}

export interface ReviewQuestion {
  question: Question
  patternId: string
}

/**
 * The next question for a review session: a question similar to one of the
 * mistakes that still need practice, chosen by priority. Returns null when
 * every mistake has been mastered (or there are none).
 */
export function nextReviewQuestion(
  state: ReviewState,
  threshold: number,
  rng: Rng = Math.random,
  now: Date = new Date(),
): ReviewQuestion | null {
  const pattern = pickPatternForReview(state.patterns, rng, {
    threshold,
    now,
    lastPatternId: state.lastPatternId,
  })
  if (!pattern) return null

  return {
    question: generateSimilarQuestion(pattern, rng, state.recentKeys),
    patternId: pattern.id,
  }
}

/** The state after showing a question. */
export function afterShowing(
  state: ReviewState,
  shown: ReviewQuestion,
): ReviewState {
  return {
    patterns: state.patterns,
    recentKeys: [...state.recentKeys, getProblemKey(shown.question)].slice(
      -RECENT_PROBLEMS,
    ),
    lastPatternId: shown.patternId,
  }
}

export interface PracticePlan {
  /** The setup to run. For review, its operations and level describe the mistakes. */
  config: PracticeConfig
  firstQuestion: Question
  /** Present only for review sessions. */
  review: ReviewState | null
}

/**
 * Gets a session ready: for review, loads the mistakes and picks the first
 * question from them; otherwise makes an ordinary question. If review was
 * asked for but there is nothing to review, it quietly becomes regular practice.
 */
export function createPracticePlan(
  config: PracticeConfig,
  masteryThreshold: number,
  rng: Rng = Math.random,
): PracticePlan {
  if (config.reviewMode === 'mistake-review') {
    const patterns = loadMistakePatterns()
    const start: ReviewState = { patterns, recentKeys: [], lastPatternId: null }
    const first = nextReviewQuestion(start, masteryThreshold, rng)

    if (first) {
      return {
        config: {
          ...config,
          ...describeReviewSession(
            getActivePatterns(patterns, masteryThreshold),
          ),
        },
        firstQuestion: first.question,
        review: afterShowing(start, first),
      }
    }
  }

  return {
    config: { ...config, reviewMode: 'regular' },
    firstQuestion: generateNextQuestion(
      config.operations,
      config.difficulty,
      undefined,
      rng,
    ),
    review: null,
  }
}
