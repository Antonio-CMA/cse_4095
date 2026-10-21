import { useCallback, useState } from 'react'
import { loadMistakePatterns } from '../services/mistakeService'
import {
  loadRecentSessions,
  resetPracticeHistory,
} from '../services/practiceHistory'
import { loadStatistics } from '../services/statisticsService'

/** How many recent sessions the statistics page lists. */
export const RECENT_SESSION_COUNT = 10

function readAll() {
  return {
    statistics: loadStatistics(),
    recentSessions: loadRecentSessions(RECENT_SESSION_COUNT),
    mistakePatterns: loadMistakePatterns(),
  }
}

/**
 * The saved statistics, recent sessions and mistake patterns, plus a way to
 * erase them all.
 */
export function useStatistics() {
  const [data, setData] = useState(readAll)

  /**
   * Erases all practice history and refreshes what is shown. Returns false if
   * the browser would not let the data be removed.
   */
  const reset = useCallback(() => {
    const erased = resetPracticeHistory()
    setData(readAll())
    return erased
  }, [])

  return { ...data, reset }
}
