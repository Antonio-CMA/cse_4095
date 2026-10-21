import type { PracticeConfig } from '../types/session'
import {
  DEFAULT_DIFFICULTY,
  DEFAULT_OPERATIONS,
  DEFAULT_REVIEW_MODE,
  DEFAULT_SESSION_LENGTH,
} from '../utils/practiceOptions'

/**
 * The starting values for the practice setup page. For now these are the
 * built-in defaults; once settings are persisted (Phase 11) this will read the
 * student's saved defaults instead, with no change needed in the page.
 */
export function usePracticeDefaults(): PracticeConfig {
  return {
    operations: [...DEFAULT_OPERATIONS],
    difficulty: DEFAULT_DIFFICULTY,
    sessionLength: DEFAULT_SESSION_LENGTH,
    reviewMode: DEFAULT_REVIEW_MODE,
  }
}
