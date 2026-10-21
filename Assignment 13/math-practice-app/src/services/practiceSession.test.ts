import { describe, expect, it } from 'vitest'
import type { Question } from '../types/question'
import type { PracticeConfig } from '../types/session'
import {
  createSessionState,
  getTotalQuestions,
  isSessionComplete,
  sessionReducer,
  type SessionAction,
} from './practiceSession'

function question(id: string, a = 2, b = 3): Question {
  return {
    id,
    operation: 'addition',
    firstOperand: a,
    secondOperand: b,
    displayText: `${a} + ${b} = ?`,
    correctAnswer: a + b,
    choices: [a + b, a + b + 1, a + b + 2, a + b + 3],
    difficulty: 1,
    source: 'regular',
  }
}

const CONFIG: PracticeConfig = {
  operations: ['addition'],
  difficulty: 1,
  sessionLength: 3,
  reviewMode: 'regular',
}

const NOW = new Date('2026-01-01T10:00:00.000Z')

function result(
  questionId: string,
  correct: boolean,
  nextQuestion: Question,
  selectedAnswer = 5,
): SessionAction {
  return {
    type: 'recordResult',
    questionId,
    selectedAnswer,
    correct,
    nextQuestion,
    at: '2026-01-01T10:01:00.000Z',
  }
}

describe('createSessionState', () => {
  it('starts an active session with nothing answered', () => {
    const state = createSessionState(CONFIG, question('q1'), NOW)

    expect(state.session).toMatchObject({
      operations: ['addition'],
      difficulty: 1,
      sessionLength: 3,
      attempted: 0,
      correct: 0,
      incorrect: 0,
      startedAt: '2026-01-01T10:00:00.000Z',
    })
    expect(state.session.id).toMatch(/\S+/)
    expect(state.session.completedAt).toBeUndefined()
    expect(state.attempts).toEqual([])
    expect(state.currentQuestion.id).toBe('q1')
    expect(isSessionComplete(state)).toBe(false)
  })

  it('does not share the operations array with the setup', () => {
    const state = createSessionState(CONFIG, question('q1'), NOW)
    expect(state.session.operations).not.toBe(CONFIG.operations)
  })
})

describe('recording results', () => {
  it('counts a right verdict and stores the attempt', () => {
    const start = createSessionState(CONFIG, question('q1', 2, 3), NOW)
    const next = sessionReducer(start, result('q1', true, question('q2')))

    expect(next.session).toMatchObject({
      attempted: 1,
      correct: 1,
      incorrect: 0,
    })
    expect(next.attempts).toHaveLength(1)
    expect(next.attempts[0]).toMatchObject({
      questionId: 'q1',
      operation: 'addition',
      firstOperand: 2,
      secondOperand: 3,
      correctAnswer: 5,
      selectedAnswer: 5,
      selfReportedCorrect: true,
      difficulty: 1,
      source: 'regular',
      sessionId: start.session.id,
      attemptedAt: '2026-01-01T10:01:00.000Z',
    })
    expect(next.currentQuestion.id).toBe('q2')
  })

  it('counts a wrong verdict', () => {
    const start = createSessionState(CONFIG, question('q1'), NOW)
    const next = sessionReducer(start, result('q1', false, question('q2'), 4))

    expect(next.session).toMatchObject({
      attempted: 1,
      correct: 0,
      incorrect: 1,
    })
    expect(next.attempts[0]).toMatchObject({
      selectedAnswer: 4,
      selfReportedCorrect: false,
    })
  })

  it('does not change the previous state object', () => {
    const start = createSessionState(CONFIG, question('q1'), NOW)
    sessionReducer(start, result('q1', true, question('q2')))
    expect(start.session.attempted).toBe(0)
    expect(start.attempts).toEqual([])
  })

  it('ignores a repeat for a question that was already recorded', () => {
    const start = createSessionState(CONFIG, question('q1'), NOW)
    const once = sessionReducer(start, result('q1', true, question('q2')))
    const twice = sessionReducer(once, result('q1', false, question('q3')))

    expect(twice).toBe(once)
    expect(twice.session.attempted).toBe(1)
    expect(twice.currentQuestion.id).toBe('q2')
  })

  it('ignores a verdict for a different question', () => {
    const start = createSessionState(CONFIG, question('q1'), NOW)
    expect(sessionReducer(start, result('other', true, question('q2')))).toBe(
      start,
    )
  })

  it('builds up the totals over several questions', () => {
    let state = createSessionState(
      { ...CONFIG, sessionLength: 'continuous' },
      question('q1'),
      NOW,
    )
    const verdicts = [true, false, true, true, false]
    verdicts.forEach((correct, i) => {
      state = sessionReducer(
        state,
        result(`q${i + 1}`, correct, question(`q${i + 2}`)),
      )
    })

    expect(state.session).toMatchObject({
      attempted: 5,
      correct: 3,
      incorrect: 2,
    })
    expect(state.attempts.map((a) => a.questionId)).toEqual([
      'q1',
      'q2',
      'q3',
      'q4',
      'q5',
    ])
    expect(isSessionComplete(state)).toBe(false)
  })
})

describe('finishing a fixed-length session', () => {
  it('completes after the last question and stops moving on', () => {
    let state = createSessionState(
      { ...CONFIG, sessionLength: 2 },
      question('q1'),
      NOW,
    )
    state = sessionReducer(state, result('q1', true, question('q2')))
    expect(isSessionComplete(state)).toBe(false)

    state = sessionReducer(state, result('q2', false, question('q3')))
    expect(isSessionComplete(state)).toBe(true)
    expect(state.session.completedAt).toBe('2026-01-01T10:01:00.000Z')
    expect(state.session).toMatchObject({
      attempted: 2,
      correct: 1,
      incorrect: 1,
    })
    expect(state.currentQuestion.id).toBe('q2')
  })

  it('records nothing once the session is complete', () => {
    let state = createSessionState(
      { ...CONFIG, sessionLength: 1 },
      question('q1'),
      NOW,
    )
    state = sessionReducer(state, result('q1', true, question('q2')))
    const after = sessionReducer(state, result('q1', true, question('q3')))

    expect(after).toBe(state)
    expect(after.attempts).toHaveLength(1)
  })
})

describe('ending a session early', () => {
  it('marks a continuous session as complete', () => {
    let state = createSessionState(
      { ...CONFIG, sessionLength: 'continuous' },
      question('q1'),
      NOW,
    )
    state = sessionReducer(state, result('q1', true, question('q2')))
    state = sessionReducer(state, {
      type: 'end',
      at: '2026-01-01T10:05:00.000Z',
    })

    expect(isSessionComplete(state)).toBe(true)
    expect(state.session.completedAt).toBe('2026-01-01T10:05:00.000Z')
    expect(state.session.attempted).toBe(1)
  })

  it('keeps the original completion time if ended twice', () => {
    let state = createSessionState(CONFIG, question('q1'), NOW)
    state = sessionReducer(state, {
      type: 'end',
      at: '2026-01-01T10:05:00.000Z',
    })
    const again = sessionReducer(state, {
      type: 'end',
      at: '2026-01-01T10:09:00.000Z',
    })
    expect(again).toBe(state)
  })

  it('does not accept answers after ending', () => {
    let state = createSessionState(
      { ...CONFIG, sessionLength: 'continuous' },
      question('q1'),
      NOW,
    )
    state = sessionReducer(state, {
      type: 'end',
      at: '2026-01-01T10:05:00.000Z',
    })
    expect(sessionReducer(state, result('q1', true, question('q2')))).toBe(
      state,
    )
  })
})

describe('getTotalQuestions', () => {
  it('is the length for fixed sessions and null for continuous', () => {
    const fixed = createSessionState(CONFIG, question('q1')).session
    const open = createSessionState(
      { ...CONFIG, sessionLength: 'continuous' },
      question('q1'),
    ).session
    expect(getTotalQuestions(fixed)).toBe(3)
    expect(getTotalQuestions(open)).toBeNull()
  })
})
