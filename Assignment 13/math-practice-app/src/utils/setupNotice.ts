/**
 * Why the student was sent back to the practice setup page. Pages that have
 * nothing to show (no session to run, no results to display) hand the student
 * back here with one of these, and the setup page explains it in plain words.
 */
export type SetupNotice = 'no-session' | 'no-results' | 'no-mistakes'

export const SETUP_NOTICE_MESSAGES: Record<SetupNotice, string> = {
  'no-session':
    "We couldn't find a practice session to show. This can happen if a page was opened directly, or from a bookmark. Choose what to practice to start a new one.",
  'no-results':
    "We couldn't find any session results to show. This can happen if a page was opened directly, or from a bookmark. Choose what to practice to start a new session.",
  'no-mistakes':
    "There are no mistakes to review right now, so we couldn't start a review session. Choose something else to practice instead.",
}

/** The navigation state that carries a notice to the setup page. */
export function setupNoticeState(notice: SetupNotice): { notice: SetupNotice } {
  return { notice }
}

/** The notice in some navigation state, if it holds a valid one. */
export function parseSetupNotice(state: unknown): SetupNotice | null {
  if (typeof state !== 'object' || state === null) return null
  const { notice } = state as { notice?: unknown }
  return typeof notice === 'string' &&
    Object.hasOwn(SETUP_NOTICE_MESSAGES, notice)
    ? (notice as SetupNotice)
    : null
}
