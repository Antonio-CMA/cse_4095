import { useCallback, useMemo, useReducer } from 'react'
import {
  createSessionState,
  getTotalQuestions,
  isSessionComplete,
  sessionReducer,
} from '../services/practiceSession'
import { generateNextQuestion } from '../services/questionGenerator'
import type { PracticeConfig, SessionResult } from '../types/session'

export interface ReportedResult {
  selectedAnswer: number
  /** What the student said about their own answer. */
  correct: boolean
}

/**
 * Runs one practice session: hands out questions, records each self-reported
 * result exactly once, and tracks when the session is over.
 */
export function usePracticeSession(config: PracticeConfig) {
  const [state, dispatch] = useReducer(sessionReducer, config, (initial) =>
    createSessionState(
      initial,
      generateNextQuestion(initial.operations, initial.difficulty),
    ),
  )
  const { session, attempts, currentQuestion } = state
  const { operations, difficulty } = config

  const recordResult = useCallback(
    (result: ReportedResult) => {
      dispatch({
        type: 'recordResult',
        questionId: currentQuestion.id,
        selectedAnswer: result.selectedAnswer,
        correct: result.correct,
        nextQuestion: generateNextQuestion(
          operations,
          difficulty,
          currentQuestion,
        ),
        at: new Date().toISOString(),
      })
    },
    [operations, difficulty, currentQuestion],
  )

  const endSession = useCallback(() => {
    dispatch({ type: 'end', at: new Date().toISOString() })
  }, [])

  const result = useMemo<SessionResult>(
    () => ({ session, attempts }),
    [session, attempts],
  )

  return {
    session,
    attempts,
    currentQuestion,
    /** 1-based number of the question being shown. */
    questionNumber: session.attempted + 1,
    /** null for continuous practice. */
    totalQuestions: getTotalQuestions(session),
    isComplete: isSessionComplete(state),
    result,
    recordResult,
    endSession,
  }
}
