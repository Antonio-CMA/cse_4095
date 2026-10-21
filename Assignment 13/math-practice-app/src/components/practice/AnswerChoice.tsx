interface AnswerChoiceProps {
  value: number
  selected: boolean
  /** Answers cannot be changed once the card has been flipped. */
  disabled?: boolean
  onSelect: (value: number) => void
}

/** One multiple-choice answer, shown as a large, touch-friendly button. */
export function AnswerChoice({
  value,
  selected,
  disabled = false,
  onSelect,
}: AnswerChoiceProps) {
  const classes = ['answer-choice', selected && 'answer-choice--selected']
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type="button"
      className={classes}
      aria-pressed={selected}
      disabled={disabled}
      onClick={() => onSelect(value)}
    >
      <span className="answer-choice__value">{value}</span>
      <span className="answer-choice__check" aria-hidden="true">
        ✓
      </span>
    </button>
  )
}
