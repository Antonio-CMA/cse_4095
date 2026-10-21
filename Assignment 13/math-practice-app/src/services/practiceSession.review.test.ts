import { describe, expect, it } from 'vitest'
import type { Question } from '../types/question'
import type { PracticeConfig } from '../types/session'
import {
  createSessionState,
  isSessionComplete,
  sessionReducer,
} from './practiceSession'

function question(id: string, extra: Partial<Question> = {}): Question {
  return {
    id,
    operation: 'multiplication',
    firstOperand: 8,
    secondOperand: 6,
    displayText: '8 × 6 = ?',
    correctAnswer: 48,
    choices: [46, 48, 49, 54],
    difficulty: 2,
    source: 'regular',
    ...extra,
  }
}

const CONFIG: PracticeConfig = {
  operations: ['multiplication'],
  difficulty: 2,
  sessionLength: 5,
  reviewMode: 'mistake-review',
}

const NOW = new Date('2026-03-01T10:00:00.000Z')

describe('a review session in the reducer', () => {
  it('remembers that the session is a review session', () => {
    expect(
      createSessionState(CONFIG, question('q1'), NOW).session.reviewMode,
    ).toBe('mistake-review')
    expect(
      createSessionState(
        { ...CONFIG, reviewMode: 'regular' },
        question('q1'),
        NOW,
      ).session.reviewMode,
    ).toBe('regular')
  })

  it('keeps the pattern a review question came from on its attempt', () => {
    const start = createSessionState(
      CONFIG,
      question('q1', {
        source: 'mistake-review',
        mistakePatternId: 'multiplication:8:7:L2',
      }),
      NOW,
    )
    const next = sessionReducer(start, {
      type: 'recordResult',
      questionId: 'q1',
      selectedAnswer: 48,
      correct: true,
      nextQuestion: question('q2'),
      at: '2026-03-01T10:01:00.000Z',
    })

    expect(next.attempts[0]).toMatchObject({
      source: 'mistake-review',
      mistakePatternId: 'multiplication:8:7:L2',
    })
  })

  it('leaves the pattern off the attempt for an ordinary question', () => {
    const start = createSessionState(CONFIG, question('q1'), NOW)
    const next = sessionReducer(start, {
      type: 'recordResult',
      questionId: 'q1',
      selectedAnswer: 48,
      correct: true,
      nextQuestion: question('q2'),
      at: '2026-03-01T10:01:00.000Z',
    })
    expect('mistakePatternId' in next.attempts[0]).toBe(false)
  })

  it('can end the session early after an answer, even before its length is reached', () => {
    const start = createSessionState(CONFIG, question('q1'), NOW)
    const next = sessionReducer(start, {
      type: 'recordResult',
      questionId: 'q1',
      selectedAnswer: 48,
      correct: true,
      nextQuestion: question('q2'),
      finish: true,
      at: '2026-03-01T10:01:00.000Z',
    })

    expect(isSessionComplete(next)).toBe(true)
    expect(next.session).toMatchObject({
      attempted: 1,
      correct: 1,
      completedAt: '2026-03-01T10:01:00.000Z',
    })
    expect(next.attempts).toHaveLength(1)
    // It stays on the finished question rather than moving on.
    expect(next.currentQuestion.id).toBe('q1')
  })

  it('records nothing more after the early finish', () => {
    let state = createSessionState(CONFIG, question('q1'), NOW)
    state = sessionReducer(state, {
      type: 'recordResult',
      questionId: 'q1',
      selectedAnswer: 48,
      correct: true,
      nextQuestion: question('q2'),
      finish: true,
      at: '2026-03-01T10:01:00.000Z',
    })
    const after = sessionReducer(state, {
      type: 'recordResult',
      questionId: 'q1',
      selectedAnswer: 46,
      correct: false,
      nextQuestion: question('q3'),
      at: '2026-03-01T10:02:00.000Z',
    })
    expect(after).toBe(state)
  })

  it('does not end a normal session early without the finish flag', () => {
    const start = createSessionState(CONFIG, question('q1'), NOW)
    const next = sessionReducer(start, {
      type: 'recordResult',
      questionId: 'q1',
      selectedAnswer: 48,
      correct: true,
      nextQuestion: question('q2'),
      at: '2026-03-01T10:01:00.000Z',
    })
    expect(isSessionComplete(next)).toBe(false)
  })
})
