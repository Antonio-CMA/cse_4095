import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import {
  clearActiveSession,
  loadActiveSession,
  saveActiveSession,
  type CardProgress,
} from '../services/activeSessionService'
import { recordPracticeAttempt } from '../services/attemptRecorder'
import { loadMistakePatterns } from '../services/mistakeService'
import { saveSession } from '../services/practiceHistory'
import {
  createSessionState,
  getTotalQuestions,
  isSessionComplete,
  sessionReducer,
  type SessionState,
} from '../services/practiceSession'
import { generateNextQuestion } from '../services/questionGenerator'
import {
  afterShowing,
  createPracticePlan,
  nextReviewQuestion,
  type ReviewState,
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
  /**
   * The page visit this session belongs to. When given, the session is kept up
   * to date in storage, and opening the same visit again (a refresh) carries on
   * where the student was instead of starting over.
   */
  resumeKey?: string
}

interface Start {
  state: SessionState
  review: ReviewState | null
  card: CardProgress | null
  resumed: boolean
}

/** Picks up the saved session for this visit, or gets a new one ready. */
function getStarted(
  config: PracticeConfig,
  masteryThreshold: number,
  resumeKey: string | undefined,
): Start {
  const saved = resumeKey ? loadActiveSession(resumeKey) : null
  if (saved) {
    return {
      state: saved.state,
      // The mistakes were saved answer by answer, so they are up to date.
      review: saved.review
        ? { patterns: loadMistakePatterns(), ...saved.review }
        : null,
      card: saved.card,
      resumed: true,
    }
  }

  const plan = createPracticePlan(config, masteryThreshold)
  return {
    state: createSessionState(plan.config, plan.firstQuestion),
    review: plan.review,
    card: null,
    resumed: false,
  }
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
  { masteryThreshold = DEFAULT_MASTERY_THRESHOLD, resumeKey }: Options = {},
) {
  const [started] = useState(() =>
    getStarted(config, masteryThreshold, resumeKey),
  )
  const [state, dispatch] = useReducer(sessionReducer, started.state)
  const { session, attempts, currentQuestion } = state
  // A review session's setup describes its mistakes, so use the session's own.
  const { operations, difficulty } = session

  // The mistakes as this session sees them, kept up to date answer by answer so
  // the next question already reflects the one just answered.
  const reviewRef = useRef(started.review)
  const handledQuestionRef = useRef<string | null>(null)

  // The refresh bookmark needs the latest of everything, so it is written from
  // refs rather than from state: what the student has done on the card showing
  // now (answer picked, card turned) is not drawn by anything here, so keeping
  // it in state would only cost an extra redraw of the page on every tap. The
  // layout effect runs before any other effect, so the card's own effect (which
  // runs first) already sees the question that is showing.
  const stateRef = useRef(state)
  const cardRef = useRef(started.card)
  useLayoutEffect(() => {
    stateRef.current = state
  }, [state])

  // Keep a bookmark of the session so a refresh can carry on, and throw it away
  // when the session is over.
  const saveBookmark = useCallback(() => {
    if (!resumeKey) return
    const current = stateRef.current
    if (isSessionComplete(current)) {
      clearActiveSession()
      return
    }
    const review = reviewRef.current
    const card = cardRef.current
    saveActiveSession({
      key: resumeKey,
      state: current,
      review: review
        ? { recentKeys: review.recentKeys, lastPatternId: review.lastPatternId }
        : null,
      card: card?.questionId === current.currentQuestion.id ? card : null,
    })
  }, [resumeKey])

  useEffect(() => {
    saveBookmark()
  }, [state, saveBookmark])

  const rememberCard = useCallback(
    (progress: Pick<CardProgress, 'selectedAnswer' | 'flipped'>) => {
      cardRef.current = {
        questionId: stateRef.current.currentQuestion.id,
        ...progress,
      }
      saveBookmark()
    },
    [saveBookmark],
  )

  // A resumed session may have answers that were never filed away (the page was
  // closed in between). Filing is by id, so ones already saved are skipped.
  useEffect(() => {
    for (const attempt of started.state.attempts) {
      recordPracticeAttempt(attempt)
    }
  }, [started])

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
    /** True if this is a session carried on after a refresh. */
    resumed: started.resumed,
    /** The card as it was when the page closed; only for the first question shown. */
    resumedCard: started.card,
    /** Tell the session what the card is showing, so it can be put back. */
    rememberCard,
  }
}
