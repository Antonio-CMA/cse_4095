import { describe, expect, it, vi } from 'vitest'
import { makeResult } from '../test/sessionResult'
import type { Question } from '../types/question'
import {
  clearActiveSession,
  loadActiveSession,
  parseActiveSession,
  saveActiveSession,
  type ActiveSession,
} from './activeSessionService'
import { STORAGE_KEYS } from './storageService'

const QUESTION: Question = {
  id: 'q-now',
  operation: 'multiplication',
  firstOperand: 7,
  secondOperand: 8,
  displayText: '7 × 8 = ?',
  correctAnswer: 56,
  choices: [48, 54, 56, 64],
  difficulty: 2,
  source: 'regular',
}

/** A session part-way through: two of five questions answered. */
function makeActive(overrides: Partial<ActiveSession> = {}): ActiveSession {
  const { session, attempts } = makeResult([true, false], { sessionLength: 5 })
  const { completedAt, ...open } = session
  void completedAt
  return {
    key: 'visit-1',
    state: { session: open, attempts, currentQuestion: QUESTION },
    review: null,
    card: null,
    ...overrides,
  }
}

/** What the browser would hand back: plain saved data, ready to be damaged. */
function saved(active: ActiveSession = makeActive()) {
  return JSON.parse(
    JSON.stringify({
      key: active.key,
      session: active.state.session,
      attempts: active.state.attempts,
      currentQuestion: active.state.currentQuestion,
      review: active.review,
      card: active.card,
    }),
  )
}

describe('saving and loading the session in progress', () => {
  it('gives back what was saved, for the same page visit', () => {
    const active = makeActive({
      card: { questionId: 'q-now', selectedAnswer: 54, flipped: true },
    })
    expect(saveActiveSession(active)).toEqual({ ok: true })
    expect(loadActiveSession('visit-1')).toEqual(active)
  })

  it('is not picked up by any other page visit', () => {
    saveActiveSession(makeActive())
    expect(loadActiveSession('visit-2')).toBeNull()
  })

  it('has nothing to load before anything is saved', () => {
    expect(loadActiveSession('visit-1')).toBeNull()
  })

  it('keeps only the latest session', () => {
    saveActiveSession(makeActive({ key: 'old' }))
    saveActiveSession(makeActive({ key: 'new' }))
    expect(loadActiveSession('old')).toBeNull()
    expect(loadActiveSession('new')).not.toBeNull()
  })

  it('forgets the session when cleared', () => {
    saveActiveSession(makeActive())
    expect(clearActiveSession()).toBe(true)
    expect(loadActiveSession('visit-1')).toBeNull()
    expect(window.localStorage.getItem(STORAGE_KEYS.activeSession)).toBeNull()
  })

  it('remembers a review session’s notes', () => {
    const base = makeActive()
    const active = makeActive({
      state: {
        ...base.state,
        session: { ...base.state.session, reviewMode: 'mistake-review' },
      },
      review: { recentKeys: ['multiplication:7:8'], lastPatternId: 'p1' },
    })
    saveActiveSession(active)
    expect(loadActiveSession('visit-1')?.review).toEqual(active.review)
  })

  it('reports, rather than throws, when the browser will not save', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    expect(saveActiveSession(makeActive())).toEqual({
      ok: false,
      reason: 'unavailable',
    })
  })

  it('starts afresh, without crashing, if the saved text is not JSON', () => {
    window.localStorage.setItem(STORAGE_KEYS.activeSession, '{{{')
    expect(loadActiveSession('visit-1')).toBeNull()
  })
})

describe('parseActiveSession', () => {
  it('accepts a real saved session', () => {
    // Built once: every makeActive() hands out fresh answer ids.
    const active = makeActive()
    expect(parseActiveSession(saved(active))).toEqual(active)
  })

  it.each([
    ['nothing', undefined],
    ['text', 'session'],
    ['a list', []],
    ['no key', { ...saved(), key: '' }],
    ['no session', { ...saved(), session: undefined }],
    ['no list of answers', { ...saved(), attempts: 'none' }],
    ['no question', { ...saved(), currentQuestion: undefined }],
    [
      'a question that does not add up',
      {
        ...saved(),
        currentQuestion: { ...QUESTION, correctAnswer: 57 },
      },
    ],
  ])('rejects %s', (_label, value) => {
    expect(parseActiveSession(value)).toBeNull()
  })

  it('rejects a session that has already finished', () => {
    const data = saved()
    data.session.completedAt = '2026-01-01T10:05:00.000Z'
    expect(parseActiveSession(data)).toBeNull()
  })

  it('rejects a session that has used up all its questions', () => {
    const data = saved()
    data.session.sessionLength = 2
    expect(parseActiveSession(data)).toBeNull()
  })

  it('rejects answers that are missing, extra or from another session', () => {
    const missing = saved()
    missing.attempts.pop()
    expect(parseActiveSession(missing)).toBeNull()

    const stranger = saved()
    stranger.attempts[0].sessionId = 'someone-else'
    expect(parseActiveSession(stranger)).toBeNull()

    const damaged = saved()
    damaged.attempts[1] = { nonsense: true }
    expect(parseActiveSession(damaged)).toBeNull()
  })

  it('rejects counts that do not match the answers', () => {
    const data = saved()
    data.attempts[0].selfReportedCorrect = false
    expect(parseActiveSession(data)).toBeNull()
  })

  it('needs the review notes exactly when it is a review session', () => {
    const regularWithNotes = saved()
    regularWithNotes.review = { recentKeys: [], lastPatternId: null }
    expect(parseActiveSession(regularWithNotes)).toBeNull()

    const reviewWithoutNotes = saved()
    reviewWithoutNotes.session.reviewMode = 'mistake-review'
    expect(parseActiveSession(reviewWithoutNotes)).toBeNull()
  })

  it('rejects review notes of the wrong shape', () => {
    for (const review of [
      'notes',
      { recentKeys: 'a', lastPatternId: null },
      { recentKeys: [1], lastPatternId: null },
      { recentKeys: [], lastPatternId: 5 },
    ]) {
      const data = saved()
      data.session.reviewMode = 'mistake-review'
      data.review = review
      expect(parseActiveSession(data)).toBeNull()
    }
  })

  describe('the card in progress', () => {
    const withCard = (card: unknown) => ({ ...saved(), card })

    it('keeps a picked answer and a turned card', () => {
      const card = { questionId: 'q-now', selectedAnswer: 56, flipped: true }
      expect(parseActiveSession(withCard(card))?.card).toEqual(card)
    })

    it('keeps a card with nothing picked yet', () => {
      const card = { questionId: 'q-now', selectedAnswer: null, flipped: false }
      expect(parseActiveSession(withCard(card))?.card).toEqual(card)
    })

    it.each([
      [
        'it is for an earlier question',
        { questionId: 'old', selectedAnswer: 56, flipped: false },
      ],
      [
        'the answer is not one of the choices',
        { questionId: 'q-now', selectedAnswer: 99, flipped: false },
      ],
      [
        'it is turned with nothing picked',
        { questionId: 'q-now', selectedAnswer: null, flipped: true },
      ],
      [
        'turned is not true or false',
        { questionId: 'q-now', selectedAnswer: 56, flipped: 'yes' },
      ],
      ['it is not an object', 'card'],
    ])('drops it, but keeps the session, when %s', (_label, card) => {
      const parsed = parseActiveSession(withCard(card))
      expect(parsed).not.toBeNull()
      expect(parsed?.card).toBeNull()
    })
  })
})
