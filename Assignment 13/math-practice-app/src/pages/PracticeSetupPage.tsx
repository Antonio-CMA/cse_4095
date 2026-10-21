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
import { ALL_OPERATIONS } from '../utils/operations'
import { parseSetupNotice, SETUP_NOTICE_MESSAGES } from '../utils/setupNotice'
import { parsePracticeConfig } from '../utils/validation'

export function PracticeSetupPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const defaults = usePracticeDefaults()
  const activeMistakeCount = useActiveMistakeCount()
  // Set when another page had nothing to show and sent the student back here.
  const notice = parseSetupNotice(location.state)

  // Start from the previous session's choices when arriving from the summary
  // page ("Change Settings" → "Practice Setup"); otherwise from the defaults.
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

  const isReview = reviewMode === 'mistake-review'

  // A review session is made from the student's mistakes, so it does not need
  // operations picked; ordinary practice does.
  const canStart = isReview ? activeMistakeCount > 0 : operations.length > 0

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canStart) return
    const config: PracticeConfig = {
      operations: operations.length > 0 ? operations : [...ALL_OPERATIONS],
      difficulty,
      sessionLength,
      reviewMode,
    }
    navigate('/practice/session', { state: config })
  }

  return (
    <section className="page-section">
      <h1>Practice Setup</h1>
      {notice && (
        <p className="stats-message" role="status">
          {SETUP_NOTICE_MESSAGES[notice]}
        </p>
      )}
      <p>Choose what you want to practice, then start your session.</p>
      <form className="setup-form" onSubmit={handleSubmit} noValidate>
        <ReviewModeSelector
          value={reviewMode}
          onChange={setReviewMode}
          activeMistakeCount={activeMistakeCount}
        />
        {isReview ? (
          <p className="setup-form__note">
            Review practice is made from the questions you missed, so you
            don&apos;t need to pick operations or a level. The ones you need
            most come up first.
          </p>
        ) : (
          <>
            <OperationSelector value={operations} onChange={setOperations} />
            <DifficultySelector value={difficulty} onChange={setDifficulty} />
          </>
        )}
        <SessionLengthSelector
          value={sessionLength}
          onChange={setSessionLength}
        />
        <div className="setup-form__footer">
          <Button type="submit" disabled={!canStart}>
            Start Session
          </Button>
          {!canStart && (
            <p className="setup-form__message" role="status">
              {isReview
                ? 'There are no mistakes to review yet.'
                : 'Pick at least one operation to start.'}
            </p>
          )}
        </div>
      </form>
    </section>
  )
}
