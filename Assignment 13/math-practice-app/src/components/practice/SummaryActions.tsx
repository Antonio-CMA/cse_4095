import { useId, useState } from 'react'
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
  const mistakesHintId = useId()
  const settingsHintId = useId()
  const settingsPanelId = useId()
  const [settingsOpen, setSettingsOpen] = useState(false)
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
          <Button
            variant="secondary"
            disabled
            aria-describedby={mistakesHintId}
          >
            Practice Mistakes
          </Button>
          <p id={mistakesHintId} className="summary-actions__hint">
            No mistakes to review yet.
          </p>
        </div>
      )}

      <Button
        variant="secondary"
        aria-expanded={settingsOpen}
        aria-controls={settingsPanelId}
        onClick={() => setSettingsOpen((open) => !open)}
      >
        Change Settings
      </Button>
      <ButtonLink to="/statistics" variant="secondary">
        View Statistics
      </ButtonLink>
      <ButtonLink to="/" variant="secondary">
        Return Home
      </ButtonLink>

      {/*
        "Change Settings" offers both kinds of settings. Only the practice
        setup works today.

        NOTE (Phase 11): when the Settings page is designed, turn the
        "App Settings" option below into a link to /settings. It belongs in
        this panel, behind the existing "Change Settings" button.
      */}
      <div
        id={settingsPanelId}
        hidden={!settingsOpen}
        className="settings-choice"
      >
        <ButtonLink to="/practice/setup" state={config}>
          Practice Setup
        </ButtonLink>
        <div className="summary-actions__unavailable">
          <Button
            variant="secondary"
            disabled
            aria-describedby={settingsHintId}
          >
            App Settings
          </Button>
          <p id={settingsHintId} className="summary-actions__hint">
            Coming soon.
          </p>
        </div>
      </div>
    </nav>
  )
}
