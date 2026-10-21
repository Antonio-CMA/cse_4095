import type { PracticeConfig } from '../types/session'
import { useSettings } from './useSettings'

/**
 * The starting values for the practice setup page: the student's saved default
 * operations, level and session length. They are only a starting point; any of
 * them can be changed for a single session on the setup page.
 */
export function usePracticeDefaults(): PracticeConfig {
  const { settings } = useSettings()
  return {
    operations: [...settings.defaultOperations],
    difficulty: settings.defaultDifficulty,
    sessionLength: settings.defaultSessionLength,
    reviewMode: 'regular',
  }
}
