import { useState } from 'react'
import { loadMistakePatterns } from '../services/mistakeService'
import { getActivePatterns } from '../utils/mistakeReview'
import { useSettings } from './useSettings'

/**
 * How many mistake patterns still need practice: the saved ones that are not
 * mastered (using the mastery setting). It is read when the page first appears.
 * Review sessions are only offered while this is above zero.
 */
export function useActiveMistakeCount(): number {
  const { settings } = useSettings()
  const [patterns] = useState(loadMistakePatterns)
  return getActivePatterns(patterns, settings.masteryThreshold).length
}
