import type { PracticeAttempt } from '../types/session'
import { recordAnswer } from './mistakeService'
import { loadAttempts } from './practiceHistory'
import { loadSettings } from './settingsService'
import { recordAttempt } from './statisticsService'
import type { WriteResult } from './storageService'

/**
 * Everything that happens when an answer is given: it is saved, counted in the
 * statistics, and used to update the mistake patterns — a wrong answer is
 * remembered, and answers to review questions move their pattern towards
 * mastered (or count as another miss).
 *
 * Each answer is only counted once. Passing the same answer again (for
 * example after a repeated update) changes nothing, so no total or mistake
 * count can be inflated.
 */
export function recordPracticeAttempt(attempt: PracticeAttempt): WriteResult {
  const alreadySaved = loadAttempts().some((a) => a.id === attempt.id)

  const saved = recordAttempt(attempt)
  if (!saved.ok || alreadySaved) return saved

  // Update the mistakes only once the answer itself has been saved.
  const { masteryThreshold } = loadSettings().settings
  const remembered = recordAnswer(attempt, masteryThreshold)
  return remembered.ok ? saved : remembered
}
