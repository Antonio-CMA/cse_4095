import { useEffect, useMemo, useState } from 'react'
import { Navigate, useBlocker, useLocation, useNavigate } from 'react-router'
import { Button } from '../components/common/Button'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { ProgressBar } from '../components/practice/ProgressBar'
import { QuestionCard } from '../components/practice/QuestionCard'
import { useActiveMistakeCount } from '../hooks/useActiveMistakeCount'
import {
  usePracticeSession,
  type ReportedResult,
} from '../hooks/usePracticeSession'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { useSettings } from '../hooks/useSettings'
import type { PracticeConfig } from '../types/session'
import { pickFeedback } from '../utils/feedback'
import { setupNoticeState } from '../utils/setupNotice'
import { speakQuestion } from '../utils/speech'
import { parsePracticeConfig } from '../utils/validation'

export function PracticePage() {
  const location = useLocation()
  const config = useMemo(
    () => parsePracticeConfig(location.state),
    [location.state],
  )

  const activeMistakeCount = useActiveMistakeCount()

  // Opened directly, refreshed without setup data, or given invalid options:
  // there is nothing to practice, so go back and choose.
  if (!config) {
    return (
      <Navigate
        to="/practice/setup"
        replace
        state={setupNoticeState('no-session')}
      />
    )
  }

  // Review was asked for, but no mistakes need practice any more.
  if (config.reviewMode === 'mistake-review' && activeMistakeCount === 0) {
    return (
      <Navigate
        to="/practice/setup"
        replace
        state={setupNoticeState('no-mistakes')}
      />
    )
  }

  // Keyed by the navigation entry so each fresh start gets a fresh session. The
  // same entry opened again (a refresh) carries on the session it had.
  return (
    <ActiveSession
      key={location.key}
      sessionKey={location.key}
      config={config}
    />
  )
}

function ActiveSession({
  config,
  sessionKey,
}: {
  config: PracticeConfig
  sessionKey: string
}) {
  const navigate = useNavigate()
  const { settings } = useSettings()
  const prefersReducedMotion = usePrefersReducedMotion()
  const {
    session,
    currentQuestion,
    questionNumber,
    totalQuestions,
    isComplete,
    result,
    recordResult,
    endSession,
    resumed,
    resumedCard,
    rememberCard,
  } = usePracticeSession(config, {
    masteryThreshold: settings.masteryThreshold,
    resumeKey: sessionKey,
  })
  const [confirmingEnd, setConfirmingEnd] = useState(false)
  // Shown after a refresh, until the next answer.
  const [showResumed, setShowResumed] = useState(resumed)

  // Leaving the page by any route (a link, or the browser's Back button) while
  // the session is running asks first. This must stay above the effect below,
  // so that when the session finishes by itself the way out is already open.
  const blocker = useBlocker(!isComplete)
  const isLeaving = blocker.state === 'blocked'
  // Set once the student has chosen to end the session and go where they were
  // heading, so finishing it does not also send them to the summary.
  const [leaveRequested, setLeaveRequested] = useState(false)
  // A friendly note about the answer just given, if messages are turned on.
  const [feedback, setFeedback] = useState<{
    text: string
    correct: boolean
  } | null>(null)

  const leaveSession = () => {
    setLeaveRequested(true)
    endSession()
  }

  const handleResult = (answer: ReportedResult) => {
    setShowResumed(false)
    recordResult(answer)
    setFeedback(
      settings.feedbackEnabled
        ? {
            text: pickFeedback(answer.correct, feedback?.text ?? null),
            correct: answer.correct,
          }
        : null,
    )
  }

  // Once the session is over, hand the results to the summary page, or carry on
  // to wherever the student was going if they chose to end it and leave.
  useEffect(() => {
    if (!isComplete) return
    if (!leaveRequested) {
      navigate('/practice/summary', { replace: true, state: result })
    } else if (isLeaving) {
      blocker.proceed()
    }
  }, [isComplete, leaveRequested, isLeaving, blocker, navigate, result])

  if (isComplete) return null

  const isContinuous = totalQuestions === null

  // Read aloud by screen readers whenever the question changes.
  const progressAnnouncement = `${feedback ? `${feedback.text} ` : ''}Question ${questionNumber}${
    isContinuous ? '' : ` of ${totalQuestions}`
  }. ${speakQuestion(currentQuestion)} ${
    isContinuous
      ? `${session.attempted} answered.`
      : `${session.attempted} of ${totalQuestions} answered.`
  }`

  return (
    <section className="practice-session">
      <h1>Practice</h1>
      <div
        className="visually-hidden"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {progressAnnouncement}
      </div>

      <div className="session-bar">
        {isContinuous ? (
          <>
            <p className="session-bar__text">{session.attempted} answered</p>
            <Button
              variant="secondary"
              onClick={() => setConfirmingEnd(true)}
              disabled={confirmingEnd}
            >
              End Session
            </Button>
          </>
        ) : (
          <>
            <ProgressBar
              value={session.attempted}
              max={totalQuestions}
              label="Session progress"
            />
            <p className="session-bar__text">
              {session.attempted} of {totalQuestions} done
            </p>
          </>
        )}
      </div>

      {feedback && (
        // Screen readers hear this through the announcement above.
        <p
          className={`feedback feedback--${feedback.correct ? 'right' : 'wrong'}`}
          aria-hidden="true"
        >
          <span className="feedback__star">★</span> {feedback.text}
        </p>
      )}

      {showResumed && (
        <p className="stats-message" role="status">
          Welcome back! We saved your place, so you can keep going.
        </p>
      )}

      {isLeaving && (
        <ConfirmDialog
          title="Leave this session?"
          message={
            session.attempted === 0
              ? "You haven't answered any questions yet."
              : `You've answered ${session.attempted} ${
                  session.attempted === 1 ? 'question' : 'questions'
                } so far. If you leave, the session ends and your answers are kept.`
          }
          confirmLabel="End Session and Leave"
          cancelLabel="Keep Practicing"
          onConfirm={leaveSession}
          onCancel={() => blocker.reset()}
        />
      )}

      {confirmingEnd && !isLeaving && (
        <ConfirmDialog
          title="End this session?"
          message={
            session.attempted === 0
              ? "You haven't answered any questions yet."
              : `You've answered ${session.attempted} ${
                  session.attempted === 1 ? 'question' : 'questions'
                } so far. You'll see how you did next.`
          }
          confirmLabel="End Session"
          cancelLabel="Keep Practicing"
          onConfirm={endSession}
          onCancel={() => setConfirmingEnd(false)}
        />
      )}

      <QuestionCard
        question={currentQuestion}
        questionNumber={questionNumber}
        totalQuestions={totalQuestions}
        animationEnabled={
          settings.cardAnimationEnabled && !prefersReducedMotion
        }
        shortcutsEnabled={!confirmingEnd && !isLeaving}
        showExplanation={settings.showExplanations}
        initialProgress={
          resumedCard?.questionId === currentQuestion.id
            ? resumedCard
            : undefined
        }
        onProgressChange={rememberCard}
        onResult={handleResult}
      />
    </section>
  )
}
