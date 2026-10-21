import type { MathOperation } from '../../types/question'
import { OPERATION_OPTIONS } from '../../utils/practiceOptions'
import { Button } from '../common/Button'
import { ChoiceOption } from '../common/ChoiceOption'

interface OperationSelectorProps {
  value: MathOperation[]
  onChange: (operations: MathOperation[]) => void
}

export function OperationSelector({ value, onChange }: OperationSelectorProps) {
  const allSelected = value.length === OPERATION_OPTIONS.length

  const toggle = (operation: MathOperation) => {
    const next = value.includes(operation)
      ? value.filter((op) => op !== operation)
      : [...value, operation]
    // Keep a stable, canonical order no matter what order they were clicked.
    onChange(
      OPERATION_OPTIONS.map((o) => o.value).filter((op) => next.includes(op)),
    )
  }

  const toggleAll = () => {
    onChange(allSelected ? [] : OPERATION_OPTIONS.map((o) => o.value))
  }

  return (
    <fieldset className="selector">
      <legend className="selector__legend">Choose your operations</legend>
      <p className="selector__hint">Pick one or more, or mix them all!</p>
      <div className="choice-grid">
        {OPERATION_OPTIONS.map(({ value: operation, label, symbol }) => (
          <ChoiceOption
            key={operation}
            type="checkbox"
            name="operations"
            label={label}
            symbol={symbol}
            checked={value.includes(operation)}
            onChange={() => toggle(operation)}
          />
        ))}
      </div>
      <Button
        variant="secondary"
        className="selector__shortcut"
        onClick={toggleAll}
      >
        {allSelected ? 'Clear all' : 'Select all (mixed)'}
      </Button>
    </fieldset>
  )
}
