import { useId } from 'react'
import type { PracticeConfig } from '../../types/session'
import { Button } from '../common/Button'
import { ButtonLink } from '../common/ButtonLink'

interface SummaryActionsProps {
  /** The setup of the session that just finished. */
  config: PracticeConfig
  /** Mistake review is only offered when there is something to review. */
  activeMistakeCount: number
}

export function SummaryActions({
  config,
  activeMistakeCount,
}: SummaryActionsProps) {
  const hintId = useId()
  const canReviewMistakes = activeMistakeCount > 0

  return (
    <nav aria-label="What next?" className="summary-actions">
      <ButtonLink to="/practice/session" state={config}>
        Practice Again
      </ButtonLink>

      {canReviewMistakes ? (
        <ButtonLink
          to="/practice/session"
          state={{ ...config, reviewMode: 'mistake-review' }}
          variant="secondary"
        >
          Practice Mistakes
        </ButtonLink>
      ) : (
        <div className="summary-actions__unavailable">
          <Button variant="secondary" disabled aria-describedby={hintId}>
            Practice Mistakes
          </Button>
          <p id={hintId} className="summary-actions__hint">
            No mistakes to review yet.
          </p>
        </div>
      )}

      <ButtonLink to="/practice/setup" state={config} variant="secondary">
        Change Settings
      </ButtonLink>
      <ButtonLink to="/statistics" variant="secondary">
        View Statistics
      </ButtonLink>
      <ButtonLink to="/" variant="secondary">
        Return Home
      </ButtonLink>
    </nav>
  )
}
