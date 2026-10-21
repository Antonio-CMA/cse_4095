interface ProgressBarProps {
  value: number
  max: number
  /** Read out by screen readers, e.g. "Session progress". */
  label: string
}

export function ProgressBar({ value, max, label }: ProgressBarProps) {
  return (
    <progress className="progress" value={value} max={max} aria-label={label}>
      {value} of {max}
    </progress>
  )
}
