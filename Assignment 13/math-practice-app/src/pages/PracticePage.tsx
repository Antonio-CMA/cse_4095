import { useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { Button } from '../components/common/Button'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { ProgressBar } from '../components/practice/ProgressBar'
import { QuestionCard } from '../components/practice/QuestionCard'
import { usePracticeSession } from '../hooks/usePracticeSession'
import type { PracticeConfig } from '../types/session'
import { parsePracticeConfig } from '../utils/validation'

export function PracticePage() {
  const location = useLocation()
  const config = useMemo(
    () => parsePracticeConfig(location.state),
    [location.state],
  )

  // Opened directly, refreshed without setup data, or given invalid options:
  // there is nothing to practice, so go back and choose.
  if (!config) return <Navigate to="/practice/setup" replace />

  // Keyed by the navigation entry so each fresh start gets a fresh session.
  return <ActiveSession key={location.key} config={config} />
}

function ActiveSession({ config }: { config: PracticeConfig }) {
  const navigate = useNavigate()
  const {
    session,
    currentQuestion,
    questionNumber,
    totalQuestions,
    isComplete,
    result,
    recordResult,
    endSession,
  } = usePracticeSession(config)
  const [confirmingEnd, setConfirmingEnd] = useState(false)

  // Once the session is over, hand the results to the summary page.
  useEffect(() => {
    if (isComplete) {
      navigate('/practice/summary', { replace: true, state: result })
    }
  }, [isComplete, navigate, result])

  if (isComplete) return null

  const isContinuous = totalQuestions === null

  return (
    <section>
      <h1>Practice</h1>

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
        onResult={recordResult}
      />
    </section>
  )
}
