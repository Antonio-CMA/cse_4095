import type { SessionLength } from '../../types/session'
import { SESSION_LENGTH_OPTIONS } from '../../utils/practiceOptions'
import { ChoiceOption } from '../common/ChoiceOption'

interface SessionLengthSelectorProps {
  value: SessionLength
  onChange: (length: SessionLength) => void
  legend?: string
}

export function SessionLengthSelector({
  value,
  onChange,
  legend = 'How many questions?',
}: SessionLengthSelectorProps) {
  return (
    <fieldset className="selector">
      <legend className="selector__legend">{legend}</legend>
      <div className="choice-grid">
        {SESSION_LENGTH_OPTIONS.map(({ value: length, label }) => (
          <ChoiceOption
            key={length}
            type="radio"
            name="session-length"
            label={label}
            checked={value === length}
            onChange={() => onChange(length)}
          />
        ))}
      </div>
    </fieldset>
  )
}
