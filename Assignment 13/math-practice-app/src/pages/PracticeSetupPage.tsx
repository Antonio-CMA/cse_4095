import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
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

export function PracticeSetupPage() {
  const navigate = useNavigate()
  const defaults = usePracticeDefaults()
  const activeMistakeCount = useActiveMistakeCount()

  const [operations, setOperations] = useState<MathOperation[]>(
    defaults.operations,
  )
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(
    defaults.difficulty,
  )
  const [sessionLength, setSessionLength] = useState<SessionLength>(
    defaults.sessionLength,
  )
  const [reviewMode, setReviewMode] = useState<ReviewMode>(defaults.reviewMode)

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
