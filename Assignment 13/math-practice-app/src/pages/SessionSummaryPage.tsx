import { useMemo } from 'react'
import { Navigate, useLocation } from 'react-router'
import { SessionSummary } from '../components/practice/SessionSummary'
import { SummaryActions } from '../components/practice/SummaryActions'
import { useActiveMistakeCount } from '../hooks/useActiveMistakeCount'
import { useSettings } from '../hooks/useSettings'
import type { PracticeConfig } from '../types/session'
import { getSessionEncouragement } from '../utils/feedback'
import { calculateAccuracy } from '../utils/math'
import { setupNoticeState } from '../utils/setupNotice'
import { parseSessionResult } from '../utils/validation'

export function SessionSummaryPage() {
  const location = useLocation()
  const activeMistakeCount = useActiveMistakeCount()
  const { settings } = useSettings()
  const result = useMemo(
    () => parseSessionResult(location.state),
    [location.state],
  )

  // Opened directly or refreshed without results: nothing to summarise.
  if (!result) {
    return (
      <Navigate
        to="/practice/setup"
        replace
        state={setupNoticeState('no-results')}
      />
    )
  }

  const { session } = result
  const encouragement = settings.feedbackEnabled
    ? getSessionEncouragement(
        calculateAccuracy(session.correct, session.attempted),
      )
    : null
  const config: PracticeConfig = {
    operations: session.operations,
    difficulty: session.difficulty,
    sessionLength: session.sessionLength,
    // "Practice Again" after a review session reviews again.
    reviewMode: session.reviewMode ?? 'regular',
  }

  return (
    <section className="page-section">
      <h1>Session Summary</h1>
      <p>
        {session.attempted === 0
          ? 'You ended before answering any questions.'
          : "Here's how you did."}
      </p>
      {encouragement && (
        <p className="feedback feedback--summary">{encouragement}</p>
      )}
      <SessionSummary result={result} />
      <SummaryActions config={config} activeMistakeCount={activeMistakeCount} />
    </section>
  )
}
