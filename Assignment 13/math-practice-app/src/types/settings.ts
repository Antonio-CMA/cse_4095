import type { DifficultyLevel, MathOperation } from './question'
import type { SessionLength } from './session'

export interface AppSettings {
  soundEnabled: boolean
  cardAnimationEnabled: boolean
  showExplanations: boolean
  /** Friendly messages after each answer and at the end of a session. */
  feedbackEnabled: boolean
  defaultSessionLength: SessionLength
  defaultDifficulty: DifficultyLevel
  defaultOperations: MathOperation[]
  masteryThreshold: number
}
