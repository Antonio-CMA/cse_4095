/**
 * How many mistake patterns are still waiting to be reviewed.
 *
 * Mistakes are now remembered (see `useMistakePatterns`), but this stays at 0
 * on purpose until mistake review itself exists: while it is 0 the app does
 * not offer review sessions it cannot yet run. Phase 14 changes this to count
 * the patterns that are not mastered.
 */
export function useActiveMistakeCount(): number {
  return 0
}
