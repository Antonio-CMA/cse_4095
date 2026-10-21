import { useState } from 'react'
import { loadMistakePatterns } from '../services/mistakeService'
import type { MistakePattern } from '../types/mistake'

/**
 * The saved mistake patterns, loaded (and checked) when the component first
 * appears. The mistake statistics (Phase 15) build on this.
 */
export function useMistakePatterns(): MistakePattern[] {
  const [patterns] = useState(loadMistakePatterns)
  return patterns
}
