import type { PracticeAttempt } from '../types/session'
import type { SessionState } from './practiceSession'
import {
  parseStoredAttempt,
  parseStoredQuestion,
  parseStoredSession,
} from './storageSchemas'
import {
  readItem,
  removeItem,
  STORAGE_KEYS,
  writeItem,
  type WriteResult,
} from './storageService'

/**
 * The practice session in progress, kept in the browser so a refresh can carry
 * on where the student left off. It is only a bookmark: the answers themselves
 * are saved as they are given, and this is removed the moment the session ends.
 */

/** What the student has done on the card that is showing, before answering. */
export interface CardProgress {
  questionId: string
  /** The answer picked on the front, if any. */
  selectedAnswer: number | null
  /** True once the card has been turned to show the answer. */
  flipped: boolean
}

/** What a mistake-review session remembers between questions. */
export interface SavedReview {
  recentKeys: string[]
  lastPatternId: string | null
}

export interface ActiveSession {
  /**
   * The page visit (navigation entry) this session belongs to. Only that same
   * visit picks it up again, so starting a new session never resumes an old one.
   */
  key: string
  state: SessionState
  /** Null for regular practice. The mistakes themselves are saved separately. */
  review: SavedReview | null
  card: CardProgress | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseCard(value: unknown, state: SessionState): CardProgress | null {
  if (!isRecord(value)) return null
  const { questionId, selectedAnswer, flipped } = value
  const { currentQuestion } = state

  // A leftover from an earlier question is simply not wanted any more.
  if (questionId !== currentQuestion.id) return null
  if (typeof flipped !== 'boolean') return null
  if (selectedAnswer === null) {
    return flipped ? null : { questionId, selectedAnswer: null, flipped }
  }
  if (!currentQuestion.choices.includes(selectedAnswer as number)) return null
  return { questionId, selectedAnswer: selectedAnswer as number, flipped }
}

function parseReview(value: unknown): SavedReview | null | undefined {
  if (value === null) return null
  if (!isRecord(value)) return undefined
  const { recentKeys, lastPatternId } = value
  if (!Array.isArray(recentKeys) || recentKeys.length > 50) return undefined
  if (!recentKeys.every((k) => typeof k === 'string')) return undefined
  if (lastPatternId !== null && typeof lastPatternId !== 'string') {
    return undefined
  }
  return { recentKeys: [...recentKeys], lastPatternId }
}

/**
 * Checks a saved bookmark before the app trusts it. Anything that does not add
 * up (damaged, edited, or from an unfinished write) gives null, and the
 * student just starts afresh.
 */
export function parseActiveSession(value: unknown): ActiveSession | null {
  if (!isRecord(value)) return null
  const { key, session: rawSession, attempts: rawAttempts } = value
  if (typeof key !== 'string' || key === '') return null

  const session = parseStoredSession(rawSession)
  // A session that has finished is not one to carry on with.
  if (!session || session.completedAt !== undefined) return null
  if (
    typeof session.sessionLength === 'number' &&
    session.attempted >= session.sessionLength
  ) {
    return null
  }

  if (!Array.isArray(rawAttempts)) return null
  const attempts = rawAttempts.map(parseStoredAttempt)
  if (attempts.length !== session.attempted) return null
  const answered: PracticeAttempt[] = []
  for (const attempt of attempts) {
    if (!attempt || attempt.sessionId !== session.id) return null
    answered.push(attempt)
  }
  if (
    answered.filter((a) => a.selfReportedCorrect).length !== session.correct
  ) {
    return null
  }

  const currentQuestion = parseStoredQuestion(value.currentQuestion)
  if (!currentQuestion) return null
  const state: SessionState = { session, attempts: answered, currentQuestion }

  const review = parseReview(value.review)
  if (review === undefined) return null
  // Mistake review and the saved review notes go together.
  if ((session.reviewMode === 'mistake-review') !== (review !== null)) {
    return null
  }

  return { key, state, review, card: parseCard(value.card, state) }
}

export function saveActiveSession(active: ActiveSession): WriteResult {
  return writeItem(STORAGE_KEYS.activeSession, {
    key: active.key,
    session: active.state.session,
    attempts: active.state.attempts,
    currentQuestion: active.state.currentQuestion,
    review: active.review,
    card: active.card,
  })
}

/** The saved session for this page visit, or null if there is none to resume. */
export function loadActiveSession(key: string): ActiveSession | null {
  const saved = readItem(STORAGE_KEYS.activeSession, parseActiveSession)
  return saved.status === 'ok' && saved.value.key === key ? saved.value : null
}

/** Forgets the saved session. Returns false if the browser refused. */
export function clearActiveSession(): boolean {
  return removeItem(STORAGE_KEYS.activeSession)
}
