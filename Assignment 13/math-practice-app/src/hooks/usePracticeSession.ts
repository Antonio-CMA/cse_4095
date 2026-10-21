import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import { recordPracticeAttempt } from '../services/attemptRecorder'
import { saveSession } from '../services/practiceHistory'
import {
  createSessionState,
  getTotalQuestions,
  isSessionComplete,
  sessionReducer,
} from '../services/practiceSession'
import { generateNextQuestion } from '../services/questionGenerator'
import {
  afterShowing,
  createPracticePlan,
  nextReviewQuestion,
} from '../services/reviewSession'
import { DEFAULT_MASTERY_THRESHOLD } from '../services/settingsService'
import type { Question } from '../types/question'
import type { PracticeConfig, SessionResult } from '../types/session'
import { applyAnswerToPatterns } from '../utils/mistakeReview'

export interface ReportedResult {
  selectedAnswer: number
  /** What the student said about their own answer. */
  correct: boolean
}

interface Options {
  /** Similar questions needed to master a mistake (review sessions). */
  masteryThreshold?: number
}

/**
 * Runs one practice session: hands out questions, records each self-reported
 * result exactly once, and tracks when the session is over.
 *
 * In a review session the questions come from the student's mistakes, most
 * in need of practice first. The session ends early if every mistake gets
 * mastered along the way.
 */
export function usePracticeSession(
  config: PracticeConfig,
  { masteryThreshold = DEFAULT_MASTERY_THRESHOLD }: Options = {},
) {
  const [plan] = useState(() => createPracticePlan(config, masteryThreshold))
  const [state, dispatch] = useReducer(sessionReducer, plan, (initial) =>
    createSessionState(initial.config, initial.firstQuestion),
  )
  const { session, attempts, currentQuestion } = state
  const { operations, difficulty } = plan.config

  // The mistakes as this session sees them, kept up to date answer by answer so
  // the next question already reflects the one just answered.
  const reviewRef = useRef(plan.review)
  const handledQuestionRef = useRef<string | null>(null)

  // Keep the session and every answer saved as the student goes. A session
  // with no answers yet is not worth keeping. If the browser cannot save
  // (blocked or full), practice simply carries on.
  useEffect(() => {
    if (session.attempted > 0) saveSession(session)
  }, [session])

  useEffect(() => {
    const latest = attempts[attempts.length - 1]
    // Saves the answer, counts it in the statistics and updates the mistake
    // patterns — each exactly once.
    if (latest) recordPracticeAttempt(latest)
  }, [attempts])

  const recordResult = useCallback(
    (result: ReportedResult) => {
      // A second press for the same question must not count again.
      if (handledQuestionRef.current === currentQuestion.id) return
      handledQuestionRef.current = currentQuestion.id

      const at = new Date().toISOString()
      let nextQuestion: Question
      let finish = false

      const review = reviewRef.current
      if (review) {
        const patterns = applyAnswerToPatterns(
          review.patterns,
          {
            source: currentQuestion.source,
            mistakePatternId: currentQuestion.mistakePatternId,
            selfReportedCorrect: result.correct,
            operation: currentQuestion.operation,
            firstOperand: currentQuestion.firstOperand,
            secondOperand: currentQuestion.secondOperand,
            correctAnswer: currentQuestion.correctAnswer,
            difficulty: currentQuestion.difficulty,
            attemptedAt: at,
          },
          masteryThreshold,
        )
        const next = nextReviewQuestion(
          { ...review, patterns },
          masteryThreshold,
        )
        if (next) {
          nextQuestion = next.question
          reviewRef.current = afterShowing({ ...review, patterns }, next)
        } else {
          // Every mistake is mastered: nothing is left to review.
          nextQuestion = currentQuestion
          finish = true
          reviewRef.current = { ...review, patterns }
        }
      } else {
        nextQuestion = generateNextQuestion(
          operations,
          difficulty,
          currentQuestion,
        )
      }

      dispatch({
        type: 'recordResult',
        questionId: currentQuestion.id,
        selectedAnswer: result.selectedAnswer,
        correct: result.correct,
        nextQuestion,
        finish,
        at,
      })
    },
    [operations, difficulty, currentQuestion, masteryThreshold],
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
