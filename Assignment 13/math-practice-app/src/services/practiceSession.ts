import type { Question } from '../types/question'
import type {
  PracticeAttempt,
  PracticeConfig,
  PracticeSession,
} from '../types/session'
import { createId } from '../utils/ids'

/** Everything about a practice session while it is running. */
export interface SessionState {
  session: PracticeSession
  /** One entry per question answered so far, oldest first. */
  attempts: PracticeAttempt[]
  currentQuestion: Question
}

export type SessionAction =
  | {
      type: 'recordResult'
      /** The question this verdict is for, so a late repeat is ignored. */
      questionId: string
      selectedAnswer: number
      /** What the student said about their own answer. */
      correct: boolean
      /** The question to show next (unused if this ends the session). */
      nextQuestion: Question
      at: string
    }
  | { type: 'end'; at: string }

export function createSessionState(
  config: PracticeConfig,
  firstQuestion: Question,
  now: Date = new Date(),
): SessionState {
  return {
    session: {
      id: createId(),
      startedAt: now.toISOString(),
      operations: [...config.operations],
      difficulty: config.difficulty,
      sessionLength: config.sessionLength,
      attempted: 0,
      correct: 0,
      incorrect: 0,
    },
    attempts: [],
    currentQuestion: firstQuestion,
  }
}

export function isSessionComplete(state: SessionState): boolean {
  return state.session.completedAt !== undefined
}

/** The number of questions in the session, or null for continuous practice. */
export function getTotalQuestions(session: PracticeSession): number | null {
  return typeof session.sessionLength === 'number'
    ? session.sessionLength
    : null
}

export function sessionReducer(
  state: SessionState,
  action: SessionAction,
): SessionState {
  switch (action.type) {
    case 'recordResult': {
      // Count each question once, and never after the session has finished.
      if (isSessionComplete(state)) return state
      if (action.questionId !== state.currentQuestion.id) return state

      const { session, currentQuestion: question } = state
      const attempt: PracticeAttempt = {
        id: createId(),
        questionId: question.id,
        operation: question.operation,
        firstOperand: question.firstOperand,
        secondOperand: question.secondOperand,
        correctAnswer: question.correctAnswer,
        selectedAnswer: action.selectedAnswer,
        selfReportedCorrect: action.correct,
        difficulty: question.difficulty,
        source: question.source,
        attemptedAt: action.at,
        sessionId: session.id,
      }

      const attempted = session.attempted + 1
      const finished =
        typeof session.sessionLength === 'number' &&
        attempted >= session.sessionLength

      return {
        session: {
          ...session,
          attempted,
          correct: session.correct + (action.correct ? 1 : 0),
          incorrect: session.incorrect + (action.correct ? 0 : 1),
          ...(finished ? { completedAt: action.at } : {}),
        },
        attempts: [...state.attempts, attempt],
        currentQuestion: finished ? question : action.nextQuestion,
      }
    }

    case 'end': {
      if (isSessionComplete(state)) return state
      return {
        ...state,
        session: { ...state.session, completedAt: action.at },
      }
    }
  }
}
