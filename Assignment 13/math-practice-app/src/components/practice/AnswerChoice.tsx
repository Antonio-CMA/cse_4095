interface AnswerChoiceProps {
  value: number
  selected: boolean
  /** Answers cannot be changed once the card has been flipped. */
  disabled?: boolean
  /** The number key that also chooses this answer (shown on the button). */
  shortcut?: number
  onSelect: (value: number) => void
}

/** One multiple-choice answer, shown as a large, touch-friendly button. */
export function AnswerChoice({
  value,
  selected,
  disabled = false,
  shortcut,
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
      aria-keyshortcuts={shortcut === undefined ? undefined : String(shortcut)}
      disabled={disabled}
      onClick={() => onSelect(value)}
    >
      {shortcut !== undefined && (
        <span className="answer-choice__key" aria-hidden="true">
          {shortcut}
        </span>
      )}
      <span className="answer-choice__value">{value}</span>
      <span className="answer-choice__check" aria-hidden="true">
        ✓
      </span>
    </button>
  )
}
