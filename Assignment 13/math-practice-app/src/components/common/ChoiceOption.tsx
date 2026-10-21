import { useId } from 'react'

interface ChoiceOptionProps {
  type: 'checkbox' | 'radio'
  /** Shared by the radios in one group. */
  name: string
  label: string
  description?: string
  /** Decorative symbol shown beside the label, e.g. "+". */
  symbol?: string
  checked: boolean
  disabled?: boolean
  onChange: () => void
}

/**
 * A large, touch-friendly checkbox or radio tile. The native input stays in
 * the page (visually hidden) so keyboard and screen-reader behavior is free,
 * and the selected state shows a check mark as well as a color change.
 */
export function ChoiceOption({
  type,
  name,
  label,
  description,
  symbol,
  checked,
  disabled = false,
  onChange,
}: ChoiceOptionProps) {
  const labelId = useId()
  const descriptionId = useId()

  return (
    <label className={disabled ? 'choice choice--disabled' : 'choice'}>
      <input
        className="choice__input"
        type={type}
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        aria-labelledby={labelId}
        aria-describedby={description ? descriptionId : undefined}
      />
      <span className="choice__body">
        <span className="choice__heading">
          {symbol && (
            <span className="choice__symbol" aria-hidden="true">
              {symbol}
            </span>
          )}
          <span id={labelId} className="choice__label">
            {label}
          </span>
          <span className="choice__check" aria-hidden="true">
            ✓
          </span>
        </span>
        {description && (
          <span id={descriptionId} className="choice__description">
            {description}
          </span>
        )}
      </span>
    </label>
  )
}
