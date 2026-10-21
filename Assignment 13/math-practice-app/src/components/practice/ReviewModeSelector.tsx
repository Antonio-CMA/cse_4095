import type { ReviewMode } from '../../types/session'
import { REVIEW_MODE_OPTIONS } from '../../utils/practiceOptions'
import { ChoiceOption } from '../common/ChoiceOption'

interface ReviewModeSelectorProps {
  value: ReviewMode
  onChange: (mode: ReviewMode) => void
  /** Mistake review is only available when there is something to review. */
  activeMistakeCount: number
}

function describe(mode: ReviewMode, activeMistakeCount: number): string {
  if (mode === 'regular') return 'Fresh questions at your chosen level.'
  if (activeMistakeCount === 0) {
    return 'Nothing to review yet. Questions you miss will show up here!'
  }
  return `Review ${activeMistakeCount} ${
    activeMistakeCount === 1 ? 'question' : 'questions'
  } you missed.`
}

export function ReviewModeSelector({
  value,
  onChange,
  activeMistakeCount,
}: ReviewModeSelectorProps) {
  return (
    <fieldset className="selector">
      <legend className="selector__legend">What kind of practice?</legend>
      <div className="choice-grid">
        {REVIEW_MODE_OPTIONS.map(({ value: mode, label }) => (
          <ChoiceOption
            key={mode}
            type="radio"
            name="review-mode"
            label={label}
            description={describe(mode, activeMistakeCount)}
            checked={value === mode}
            disabled={mode === 'mistake-review' && activeMistakeCount === 0}
            onChange={() => onChange(mode)}
          />
        ))}
      </div>
    </fieldset>
  )
}
