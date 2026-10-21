import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '../components/common/Button'
import { DifficultySelector } from '../components/practice/DifficultySelector'
import { OperationSelector } from '../components/practice/OperationSelector'
import { SessionLengthSelector } from '../components/practice/SessionLengthSelector'
import type { DifficultyLevel, MathOperation } from '../types/question'
import type { PracticeConfig, SessionLength } from '../types/session'
import {
  DEFAULT_DIFFICULTY,
  DEFAULT_SESSION_LENGTH,
} from '../utils/practiceOptions'

export function PracticeSetupPage() {
  const navigate = useNavigate()
  const [operations, setOperations] = useState<MathOperation[]>([])
  const [difficulty, setDifficulty] =
    useState<DifficultyLevel>(DEFAULT_DIFFICULTY)
  const [sessionLength, setSessionLength] = useState<SessionLength>(
    DEFAULT_SESSION_LENGTH,
  )

  const canStart = operations.length > 0

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canStart) return
    const config: PracticeConfig = { operations, difficulty, sessionLength }
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
