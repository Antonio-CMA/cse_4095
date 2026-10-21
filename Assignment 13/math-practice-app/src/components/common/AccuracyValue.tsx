interface AccuracyValueProps {
  /** Percent correct, or null when nothing has been attempted. */
  accuracy: number | null
  /** Read out instead of the dash when there is no accuracy to show. */
  emptyLabel?: string
}

/** "75%", or a dash (with a spoken explanation) when there is nothing to show. */
export function AccuracyValue({
  accuracy,
  emptyLabel = 'No questions answered',
}: AccuracyValueProps) {
  if (accuracy === null) {
    return (
      <>
        <span aria-hidden="true">—</span>
        <span className="visually-hidden">{emptyLabel}</span>
      </>
    )
  }
  return <>{accuracy}%</>
}
