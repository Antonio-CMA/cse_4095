import { useMemo } from 'react'
import { Navigate, useLocation } from 'react-router'
import { SessionSummary } from '../components/practice/SessionSummary'
import { SummaryActions } from '../components/practice/SummaryActions'
import { useActiveMistakeCount } from '../hooks/useActiveMistakeCount'
import type { PracticeConfig } from '../types/session'
import { parseSessionResult } from '../utils/validation'

export function SessionSummaryPage() {
  const location = useLocation()
  const activeMistakeCount = useActiveMistakeCount()
  const result = useMemo(
    () => parseSessionResult(location.state),
    [location.state],
  )

  // Opened directly or refreshed without results: nothing to summarise.
  if (!result) return <Navigate to="/practice/setup" replace />

  const { session } = result
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
      <SessionSummary result={result} />
      <SummaryActions config={config} activeMistakeCount={activeMistakeCount} />
    </section>
  )
}
