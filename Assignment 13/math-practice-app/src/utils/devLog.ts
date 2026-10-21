/**
 * Reports something unexpected to developers, in the browser console. It is
 * only for development: students never see it, and a built (production) copy
 * of the app stays quiet. Put the useful facts in `details`.
 */
export function logDevError(message: string, details?: unknown): void {
  if (!import.meta.env.DEV) return
  if (details === undefined) console.error(`[Math Practice] ${message}`)
  else console.error(`[Math Practice] ${message}`, details)
}
