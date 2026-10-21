import { useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
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
  if (!config) return <Navigate to="/practice/setup" replace />

  // Review was asked for, but no mistakes need practice any more.
  if (config.reviewMode === 'mistake-review' && activeMistakeCount === 0) {
    return <Navigate to="/practice/setup" replace />
  }

  // Keyed by the navigation entry so each fresh start gets a fresh session.
  return <ActiveSession key={location.key} config={config} />
}

function ActiveSession({ config }: { config: PracticeConfig }) {
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
  } = usePracticeSession(config, {
    masteryThreshold: settings.masteryThreshold,
  })
  const [confirmingEnd, setConfirmingEnd] = useState(false)
  // A friendly note about the answer just given, if messages are turned on.
  const [feedback, setFeedback] = useState<{
    text: string
    correct: boolean
  } | null>(null)

  const handleResult = (answer: ReportedResult) => {
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

  // Once the session is over, hand the results to the summary page.
  useEffect(() => {
    if (isComplete) {
      navigate('/practice/summary', { replace: true, state: result })
    }
  }, [isComplete, navigate, result])

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

      {confirmingEnd && (
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
        shortcutsEnabled={!confirmingEnd}
        showExplanation={settings.showExplanations}
        onResult={handleResult}
      />
    </section>
  )
}
