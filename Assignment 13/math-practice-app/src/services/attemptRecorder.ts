import type { PracticeAttempt } from '../types/session'
import { recordMistake } from './mistakeService'
import { loadAttempts } from './practiceHistory'
import { recordAttempt } from './statisticsService'
import type { WriteResult } from './storageService'

/**
 * Everything that happens when an answer is given: it is saved, counted in the
 * statistics, and — if the student said they got it wrong — remembered as a
 * mistake pattern.
 *
 * Each answer is only counted once. Passing the same answer again (for
 * example after a repeated update) changes nothing, so no total or mistake
 * count can be inflated.
 */
export function recordPracticeAttempt(attempt: PracticeAttempt): WriteResult {
  const alreadySaved = loadAttempts().some((a) => a.id === attempt.id)

  const saved = recordAttempt(attempt)
  if (!saved.ok || alreadySaved) return saved

  // Remember the mistake only once the answer itself has been saved.
  const remembered = recordMistake(attempt)
  return remembered.ok ? saved : remembered
}
