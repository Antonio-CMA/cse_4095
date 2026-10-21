import type { DifficultyLevel, MathOperation, QuestionSource } from './question'

export type SessionLength = number | 'continuous'

export type ReviewMode = 'regular' | 'mistake-review'

/** The options a student picks on the practice setup page. */
export interface PracticeConfig {
  operations: MathOperation[]
  difficulty: DifficultyLevel
  sessionLength: SessionLength
  reviewMode: ReviewMode
}

export interface PracticeAttempt {
  id: string
  questionId: string
  operation: MathOperation
  firstOperand: number
  secondOperand: number
  correctAnswer: number
  selectedAnswer: number
  selfReportedCorrect: boolean
  difficulty: DifficultyLevel
  source: QuestionSource
  /** For review questions: the mistake pattern the question was made from. */
  mistakePatternId?: string
  attemptedAt: string
  sessionId: string
}

export interface PracticeSession {
  id: string
  startedAt: string
  completedAt?: string
  operations: MathOperation[]
  difficulty: DifficultyLevel
  sessionLength: SessionLength
  /** Regular practice if missing (sessions saved before review existed). */
  reviewMode?: ReviewMode
  attempted: number
  correct: number
  incorrect: number
}

/** Everything about a finished session; handed to the summary page. */
export interface SessionResult {
  session: PracticeSession
  attempts: PracticeAttempt[]
}
