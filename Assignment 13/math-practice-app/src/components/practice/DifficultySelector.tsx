import type { DifficultyLevel } from '../../types/question'
import { DIFFICULTY_OPTIONS } from '../../utils/practiceOptions'
import { ChoiceOption } from '../common/ChoiceOption'

interface DifficultySelectorProps {
  value: DifficultyLevel
  onChange: (difficulty: DifficultyLevel) => void
  legend?: string
}

export function DifficultySelector({
  value,
  onChange,
  legend = 'Choose a level',
}: DifficultySelectorProps) {
  return (
    <fieldset className="selector">
      <legend className="selector__legend">{legend}</legend>
      <div className="choice-grid">
        {DIFFICULTY_OPTIONS.map(({ value: level, label, description }) => (
          <ChoiceOption
            key={level}
            type="radio"
            name="difficulty"
            label={label}
            description={description}
            checked={value === level}
            onChange={() => onChange(level)}
          />
        ))}
      </div>
    </fieldset>
  )
}
