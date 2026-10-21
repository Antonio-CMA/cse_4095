import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { loadActiveSession } from '../services/activeSessionService'
import { saveMistakePatterns } from '../services/mistakeService'
import { loadAttempts, loadSessions } from '../services/practiceHistory'
import { loadStatistics } from '../services/statisticsService'
import { makePattern } from '../test/mistakePatterns'
import type { PracticeConfig } from '../types/session'
import { isValidQuestion } from '../utils/validation'
import { usePracticeSession } from './usePracticeSession'

const CONFIG: PracticeConfig = {
  operations: ['addition'],
  difficulty: 1,
  sessionLength: 3,
  reviewMode: 'regular',
}

function renderSession(
  config: PracticeConfig = CONFIG,
  options?: Parameters<typeof usePracticeSession>[1],
) {
  return renderHook(() => usePracticeSession(config, options))
}

type Session = ReturnType<typeof renderSession>

function answer(session: Session, correct = true) {
  const { currentQuestion } = session.result.current
  act(() =>
    session.result.current.recordResult({
      selectedAnswer: currentQuestion.choices[0],
      correct,
    }),
  )
}

describe('usePracticeSession: a new session', () => {
  it('starts on a valid first question with nothing answered', () => {
    const { result } = renderSession()
    expect(isValidQuestion(result.current.currentQuestion)).toBe(true)
    expect(result.current.questionNumber).toBe(1)
    expect(result.current.totalQuestions).toBe(3)
    expect(result.current.isComplete).toBe(false)
    expect(result.current.resumed).toBe(false)
    expect(result.current.session).toMatchObject({
      attempted: 0,
      correct: 0,
      incorrect: 0,
      operations: ['addition'],
      difficulty: 1,
    })
  })

  it('counts each answer and moves on to a new question', () => {
    const session = renderSession()
    const first = session.result.current.currentQuestion

    answer(session, true)
    answer(session, false)

    expect(session.result.current.session).toMatchObject({
      attempted: 2,
      correct: 1,
      incorrect: 1,
    })
    expect(session.result.current.questionNumber).toBe(3)
    expect(session.result.current.currentQuestion.id).not.toBe(first.id)
    expect(
      session.result.current.attempts.map((a) => a.selfReportedCorrect),
    ).toEqual([true, false])
  })

  it('counts a repeated verdict for the same question only once', () => {
    const session = renderSession()
    const { currentQuestion } = session.result.current

    act(() => {
      session.result.current.recordResult({
        selectedAnswer: currentQuestion.choices[0],
        correct: true,
      })
      session.result.current.recordResult({
        selectedAnswer: currentQuestion.choices[1],
        correct: false,
      })
    })

    expect(session.result.current.session.attempted).toBe(1)
    expect(session.result.current.attempts).toHaveLength(1)
    expect(loadAttempts()).toHaveLength(1)
  })

  it('is complete after the last question, with the whole result', () => {
    const session = renderSession()
    answer(session)
    answer(session)
    expect(session.result.current.isComplete).toBe(false)
    answer(session)

    expect(session.result.current.isComplete).toBe(true)
    expect(session.result.current.result.attempts).toHaveLength(3)
    expect(session.result.current.result.session.completedAt).toBeDefined()
  })

  it('has no total, and never completes by itself, in continuous practice', () => {
    const session = renderSession({ ...CONFIG, sessionLength: 'continuous' })
    expect(session.result.current.totalQuestions).toBeNull()
    for (let i = 0; i < 8; i++) answer(session)
    expect(session.result.current.isComplete).toBe(false)
    expect(session.result.current.session.attempted).toBe(8)
  })

  it('ends when asked to, keeping what was answered', () => {
    const session = renderSession({ ...CONFIG, sessionLength: 'continuous' })
    answer(session)
    act(() => session.result.current.endSession())

    expect(session.result.current.isComplete).toBe(true)
    expect(session.result.current.result.session.attempted).toBe(1)
  })
})

describe('usePracticeSession: filing the answers away', () => {
  it('saves the session and every answer as they are given', () => {
    const session = renderSession()
    answer(session, true)
    answer(session, false)

    expect(loadSessions()).toHaveLength(1)
    expect(loadSessions()[0]).toMatchObject({ attempted: 2, correct: 1 })
    expect(loadAttempts()).toHaveLength(2)
    expect(loadStatistics()).toMatchObject({ attempted: 2, correct: 1 })
  })

  it('does not keep a session in which nothing was answered', () => {
    renderSession()
    expect(loadSessions()).toEqual([])
  })
})

describe('usePracticeSession: the refresh bookmark', () => {
  it('keeps none unless it is given a key to keep it under', () => {
    const session = renderSession()
    answer(session)
    expect(window.localStorage.getItem('mathPractice.activeSession')).toBeNull()
  })

  it('keeps one, from the first question, when given a key', () => {
    const session = renderSession(CONFIG, { resumeKey: 'visit-1' })
    const saved = loadActiveSession('visit-1')
    expect(saved?.state.currentQuestion.id).toBe(
      session.result.current.currentQuestion.id,
    )
    expect(saved?.state.session.attempted).toBe(0)
  })

  it('keeps it up to date, and removes it when the session finishes', () => {
    const session = renderSession(CONFIG, { resumeKey: 'visit-1' })
    answer(session)
    expect(loadActiveSession('visit-1')?.state.session.attempted).toBe(1)

    answer(session)
    answer(session)
    expect(session.result.current.isComplete).toBe(true)
    expect(loadActiveSession('visit-1')).toBeNull()
  })

  it('carries on the same session when opened again with the same key', () => {
    const first = renderSession(CONFIG, { resumeKey: 'visit-1' })
    answer(first)
    const waiting = first.result.current.currentQuestion
    first.unmount()

    const second = renderSession(CONFIG, { resumeKey: 'visit-1' })
    expect(second.result.current.resumed).toBe(true)
    expect(second.result.current.currentQuestion).toEqual(waiting)
    expect(second.result.current.session.attempted).toBe(1)
    expect(second.result.current.session.id).toBe(
      first.result.current.session.id,
    )
  })

  it('starts afresh under a different key', () => {
    const first = renderSession(CONFIG, { resumeKey: 'visit-1' })
    answer(first)
    first.unmount()

    const second = renderSession(CONFIG, { resumeKey: 'visit-2' })
    expect(second.result.current.resumed).toBe(false)
    expect(second.result.current.session.attempted).toBe(0)
  })

  it('remembers what the card in front of the student looks like', () => {
    const session = renderSession(CONFIG, { resumeKey: 'visit-1' })
    const { currentQuestion } = session.result.current
    act(() =>
      session.result.current.rememberCard({
        selectedAnswer: currentQuestion.choices[2],
        flipped: true,
      }),
    )
    session.unmount()

    const again = renderSession(CONFIG, { resumeKey: 'visit-1' })
    expect(again.result.current.resumedCard).toEqual({
      questionId: currentQuestion.id,
      selectedAnswer: currentQuestion.choices[2],
      flipped: true,
    })
  })

  it('forgets the card once the next question arrives', () => {
    const session = renderSession(CONFIG, { resumeKey: 'visit-1' })
    const { currentQuestion } = session.result.current
    act(() =>
      session.result.current.rememberCard({
        selectedAnswer: currentQuestion.choices[0],
        flipped: true,
      }),
    )
    answer(session)

    expect(loadActiveSession('visit-1')?.card).toBeNull()
  })
})

describe('usePracticeSession: reviewing mistakes', () => {
  it('asks questions made from the saved mistakes', () => {
    saveMistakePatterns([makePattern('multiplication', 8, 7)])
    const { result } = renderSession({
      ...CONFIG,
      operations: ['multiplication'],
      difficulty: 2,
      reviewMode: 'mistake-review',
    })

    expect(result.current.currentQuestion).toMatchObject({
      source: 'mistake-review',
      mistakePatternId: 'multiplication:8:7:L2',
    })
    expect(result.current.session.reviewMode).toBe('mistake-review')
  })

  it('quietly becomes ordinary practice when there is nothing to review', () => {
    const { result } = renderSession({
      ...CONFIG,
      reviewMode: 'mistake-review',
    })
    expect(result.current.currentQuestion.source).toBe('regular')
    expect(result.current.session.reviewMode).toBe('regular')
  })
})
