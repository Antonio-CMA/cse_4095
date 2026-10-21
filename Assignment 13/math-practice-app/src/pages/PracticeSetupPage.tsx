import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Button } from '../components/common/Button'
import { DifficultySelector } from '../components/practice/DifficultySelector'
import { OperationSelector } from '../components/practice/OperationSelector'
import { ReviewModeSelector } from '../components/practice/ReviewModeSelector'
import { SessionLengthSelector } from '../components/practice/SessionLengthSelector'
import { useActiveMistakeCount } from '../hooks/useActiveMistakeCount'
import { usePracticeDefaults } from '../hooks/usePracticeDefaults'
import type { DifficultyLevel, MathOperation } from '../types/question'
import type {
  PracticeConfig,
  ReviewMode,
  SessionLength,
} from '../types/session'
import { parsePracticeConfig } from '../utils/validation'

export function PracticeSetupPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const defaults = usePracticeDefaults()
  const activeMistakeCount = useActiveMistakeCount()

  // Start from the previous session's choices when arriving from the summary
  // page ("Change Settings"); otherwise from the defaults.
  const [initial] = useState<PracticeConfig>(() => {
    const previous = parsePracticeConfig(location.state)
    if (!previous) return defaults
    return activeMistakeCount === 0 && previous.reviewMode === 'mistake-review'
      ? { ...previous, reviewMode: 'regular' }
      : previous
  })

  const [operations, setOperations] = useState<MathOperation[]>(
    initial.operations,
  )
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(
    initial.difficulty,
  )
  const [sessionLength, setSessionLength] = useState<SessionLength>(
    initial.sessionLength,
  )
  const [reviewMode, setReviewMode] = useState<ReviewMode>(initial.reviewMode)

  const canStart = operations.length > 0

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canStart) return
    const config: PracticeConfig = {
      operations,
      difficulty,
      sessionLength,
      reviewMode,
    }
    navigate('/practice/session', { state: config })
  }

  return (
    <section className="page-section">
      <h1>Practice Setup</h1>
      <p>Choose what you want to practice, then start your session.</p>
      <form className="setup-form" onSubmit={handleSubmit} noValidate>
        <OperationSelector value={operations} onChange={setOperations} />
        <DifficultySelector value={difficulty} onChange={setDifficulty} />
        <SessionLengthSelector
          value={sessionLength}
          onChange={setSessionLength}
        />
        <ReviewModeSelector
          value={reviewMode}
          onChange={setReviewMode}
          activeMistakeCount={activeMistakeCount}
        />
        <div className="setup-form__footer">
          <Button type="submit" disabled={!canStart}>
            Start Session
          </Button>
          {!canStart && (
            <p className="setup-form__message" role="status">
              Pick at least one operation to start.
            </p>
          )}
        </div>
      </form>
    </section>
  )
}
