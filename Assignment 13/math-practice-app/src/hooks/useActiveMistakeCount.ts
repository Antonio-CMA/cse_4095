/**
 * How many mistake patterns are still waiting to be reviewed. Mistakes are not
 * tracked yet, so this is always 0 — it will read stored mistake patterns once
 * mistake tracking exists (Phases 12–14).
 */
export function useActiveMistakeCount(): number {
  return 0
}
