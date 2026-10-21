import type {
  PracticeAttempt,
  PracticeSession,
  SessionResult,
} from '../types/session'

let counter = 0

export function makeAttempt(
  overrides: Partial<PracticeAttempt> = {},
): PracticeAttempt {
  counter += 1
  return {
    id: `attempt-${counter}`,
    questionId: `question-${counter}`,
    operation: 'addition',
    firstOperand: 2,
    secondOperand: 3,
    correctAnswer: 5,
    selectedAnswer: 5,
    selfReportedCorrect: true,
    difficulty: 2,
    source: 'regular',
    attemptedAt: '2026-01-01T10:01:00.000Z',
    sessionId: 'session-1',
    ...overrides,
  }
}

/**
 * A finished session with the given verdicts, one attempt per entry.
 * `correct`/`incorrect` totals are derived so the result always adds up.
 */
export function makeResult(
  verdicts: boolean[],
  overrides: Partial<PracticeSession> = {},
  attemptOverrides: Partial<PracticeAttempt> = {},
): SessionResult {
  const correct = verdicts.filter(Boolean).length
  return {
    session: {
      id: 'session-1',
      startedAt: '2026-01-01T10:00:00.000Z',
      completedAt: '2026-01-01T10:05:00.000Z',
      operations: ['addition', 'subtraction'],
      difficulty: 2,
      sessionLength: verdicts.length || 5,
      attempted: verdicts.length,
      correct,
      incorrect: verdicts.length - correct,
      ...overrides,
    },
    attempts: verdicts.map((selfReportedCorrect) =>
      makeAttempt({ selfReportedCorrect, ...attemptOverrides }),
    ),
  }
}
