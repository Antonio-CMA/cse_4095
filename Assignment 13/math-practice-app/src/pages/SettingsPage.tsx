import { useId, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '../components/common/Button'
import { ChoiceOption } from '../components/common/ChoiceOption'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { DifficultySelector } from '../components/practice/DifficultySelector'
import { OperationSelector } from '../components/practice/OperationSelector'
import { SessionLengthSelector } from '../components/practice/SessionLengthSelector'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { useSettings } from '../hooks/useSettings'
import { MAX_MASTERY_THRESHOLD } from '../services/settingsService'
import { measureStorageUsage } from '../services/storageService'
import { formatStorageSize } from '../utils/format'
import type { AppSettings } from '../types/settings'

type SaveStatus = 'saved' | 'failed' | null

const MASTERY_CHOICES = Array.from(
  { length: MAX_MASTERY_THRESHOLD },
  (_, i) => i + 1,
)

export function SettingsPage() {
  const navigate = useNavigate()
  const { settings, updateSettings, resetSettings, clearAllData } =
    useSettings()
  const prefersReducedMotion = usePrefersReducedMotion()
  const masteryId = useId()
  const masteryHintId = useId()

  const [saveStatus, setSaveStatus] = useState<SaveStatus>(null)
  const [confirmingClear, setConfirmingClear] = useState(false)
  const [clearFailed, setClearFailed] = useState(false)
  // How much room the saved data takes. Read when the page opens.
  const [usage] = useState(measureStorageUsage)

  // Settings are saved automatically the moment they change.
  const change = (changes: Partial<AppSettings>) => {
    setSaveStatus(updateSettings(changes).ok ? 'saved' : 'failed')
  }

  const restoreDefaults = () => {
    setSaveStatus(resetSettings().ok ? 'saved' : 'failed')
  }

  const handleClearAll = () => {
    if (clearAllData()) {
      navigate('/')
    } else {
      setConfirmingClear(false)
      setClearFailed(true)
    }
  }

  return (
    <section className="page-section">
      <h1>Settings</h1>
      <p>Your choices are saved automatically on this device.</p>

      <div className="settings-status" role="status">
        {saveStatus === 'saved' && 'Your settings are saved.'}
        {saveStatus === 'failed' &&
          "We couldn't save your settings. They will work until you close this page."}
      </div>

      <div className="settings-sections">
        <section aria-labelledby="settings-practice-heading">
          <h2 id="settings-practice-heading">Practice defaults</h2>
          <p>
            These are what the practice setup page starts with. You can still
            change them for any single session.
          </p>
          <div className="settings-group">
            <OperationSelector
              legend="Default operations"
              hint="Leave them all empty to choose each time."
              value={settings.defaultOperations}
              onChange={(defaultOperations) => change({ defaultOperations })}
            />
            <DifficultySelector
              legend="Default level"
              value={settings.defaultDifficulty}
              onChange={(defaultDifficulty) => change({ defaultDifficulty })}
            />
            <SessionLengthSelector
              legend="Default session length"
              value={settings.defaultSessionLength}
              onChange={(defaultSessionLength) =>
                change({ defaultSessionLength })
              }
            />
          </div>
        </section>

        <section aria-labelledby="settings-experience-heading">
          <h2 id="settings-experience-heading">How practice feels</h2>
          <div className="choice-grid">
            <ChoiceOption
              type="checkbox"
              name="card-animation"
              label="Card animation"
              description="Flip the card with a turning animation. Turn off for an instant switch."
              checked={settings.cardAnimationEnabled}
              onChange={() =>
                change({ cardAnimationEnabled: !settings.cardAnimationEnabled })
              }
            />
            <ChoiceOption
              type="checkbox"
              name="show-explanations"
              label="Show explanations"
              description="Explain the answer on the card after a missed question."
              checked={settings.showExplanations}
              onChange={() =>
                change({ showExplanations: !settings.showExplanations })
              }
            />
            <ChoiceOption
              type="checkbox"
              name="encouraging-messages"
              label="Encouraging messages"
              description="Show a friendly message after each answer and at the end of a session."
              checked={settings.feedbackEnabled}
              onChange={() =>
                change({ feedbackEnabled: !settings.feedbackEnabled })
              }
            />
            <ChoiceOption
              type="checkbox"
              name="sound-effects"
              label="Sound effects"
              description="Sounds aren't added yet, but your choice is saved for when they are."
              checked={settings.soundEnabled}
              onChange={() => change({ soundEnabled: !settings.soundEnabled })}
            />
          </div>
          {prefersReducedMotion && (
            <p className="settings-field__hint">
              Your device is set to reduce motion, so cards always switch
              instantly, whatever you choose for card animation.
            </p>
          )}
        </section>

        <section aria-labelledby="settings-mastery-heading">
          <h2 id="settings-mastery-heading">Mistakes</h2>
          <div className="settings-field">
            <label htmlFor={masteryId}>
              Right answers needed to master a mistake
            </label>
            <select
              id={masteryId}
              className="settings-select"
              aria-describedby={masteryHintId}
              value={settings.masteryThreshold}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                change({ masteryThreshold: Number(event.target.value) })
              }
            >
              {MASTERY_CHOICES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <p id={masteryHintId} className="settings-field__hint">
              A missed question counts as learned after this many similar
              questions are answered correctly.
            </p>
          </div>
        </section>

        <section aria-labelledby="settings-restore-heading">
          <h2 id="settings-restore-heading">Starting over</h2>
          <Button variant="secondary" onClick={restoreDefaults}>
            Restore Default Settings
          </Button>
        </section>

        <section
          aria-labelledby="settings-data-heading"
          className="settings-danger"
        >
          <h2 id="settings-data-heading">Your data</h2>
          <p>
            Everything is stored only in this browser. Clearing the
            browser&apos;s data also erases your progress.
          </p>
          {usage && (
            <p className="settings-field__hint">
              Saved on this device: about {formatStorageSize(usage.total)}.
              Browsers usually allow around 5 MB for each site.
            </p>
          )}
          {clearFailed && (
            <p className="stats-message" role="alert">
              We couldn&apos;t erase everything. Your browser may be blocking
              storage.
            </p>
          )}
          {confirmingClear ? (
            <ConfirmDialog
              title="Delete everything?"
              message="This permanently deletes your settings, practice history, statistics and saved mistakes. It can't be undone."
              confirmLabel="Yes, Delete Everything"
              cancelLabel="Keep My Data"
              onConfirm={handleClearAll}
              onCancel={() => setConfirmingClear(false)}
            />
          ) : (
            <Button
              variant="secondary"
              onClick={() => {
                setClearFailed(false)
                setConfirmingClear(true)
              }}
            >
              Clear All Application Data
            </Button>
          )}
        </section>
      </div>
    </section>
  )
}
