import { describe, expect, it, vi } from 'vitest'
import { makeAttempt, makeResult } from '../test/sessionResult'
import type { PracticeSession } from '../types/session'
import {
  loadAttempts,
  loadRecentSessions,
  loadSessions,
  MAX_STORED_ATTEMPTS,
  MAX_STORED_SESSIONS,
  saveAttempt,
  saveAttempts,
  saveSession,
} from './practiceHistory'
import { STORAGE_KEYS } from './storageService'

function session(
  id: string,
  startedAt: string,
  extra: Partial<PracticeSession> = {},
): PracticeSession {
  return {
    ...makeResult([true, false]).session,
    id,
    startedAt,
    completedAt: startedAt,
    ...extra,
  }
}

const raw = (key: string) => window.localStorage.getItem(key)

describe('sessions', () => {
  it('starts empty', () => {
    expect(loadSessions()).toEqual([])
    expect(loadRecentSessions()).toEqual([])
  })

  it('saves a session and loads it back with every field', () => {
    const s = session('s1', '2026-01-01T10:00:00.000Z', {
      operations: ['multiplication', 'division'],
      difficulty: 3,
      sessionLength: 'continuous',
    })
    expect(saveSession(s)).toEqual({ ok: true })
    expect(loadSessions()).toEqual([s])
  })

  it('keeps sessions after a "restart" (a later read of the same storage)', () => {
    saveSession(session('s1', '2026-01-01T10:00:00.000Z'))
    expect(loadSessions().map((s) => s.id)).toEqual(['s1'])
  })

  it('updates the saved copy when the same session is saved again', () => {
    const open = session('s1', '2026-01-01T10:00:00.000Z', {
      attempted: 1,
      correct: 1,
      incorrect: 0,
      completedAt: undefined,
    })
    delete open.completedAt
    saveSession(open)
    expect(loadSessions()[0].completedAt).toBeUndefined()

    saveSession({
      ...open,
      attempted: 2,
      correct: 1,
      incorrect: 1,
      completedAt: '2026-01-01T10:05:00.000Z',
    })

    const saved = loadSessions()
    expect(saved).toHaveLength(1)
    expect(saved[0]).toMatchObject({
      attempted: 2,
      completedAt: '2026-01-01T10:05:00.000Z',
    })
  })

  it('keeps different sessions separate', () => {
    saveSession(session('a', '2026-01-01T10:00:00.000Z'))
    saveSession(session('b', '2026-01-02T10:00:00.000Z'))
    expect(loadSessions().map((s) => s.id)).toEqual(['a', 'b'])
  })

  it('lists the most recent sessions newest first', () => {
    saveSession(session('old', '2026-01-01T10:00:00.000Z'))
    saveSession(session('new', '2026-03-01T10:00:00.000Z'))
    saveSession(session('mid', '2026-02-01T10:00:00.000Z'))

    expect(loadRecentSessions().map((s) => s.id)).toEqual(['new', 'mid', 'old'])
    expect(loadRecentSessions(2).map((s) => s.id)).toEqual(['new', 'mid'])
  })

  it('skips damaged records but keeps the good ones', () => {
    saveSession(session('good', '2026-01-01T10:00:00.000Z'))
    const list = JSON.parse(raw(STORAGE_KEYS.sessions) ?? '[]')
    list.push({ id: 'bad' }, 'junk', null)
    window.localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(list))

    expect(loadSessions().map((s) => s.id)).toEqual(['good'])
  })

  it('heals damaged data the next time a session is saved', () => {
    window.localStorage.setItem(STORAGE_KEYS.sessions, '[{"id":"bad"}, 5]')
    saveSession(session('fresh', '2026-01-01T10:00:00.000Z'))
    expect(JSON.parse(raw(STORAGE_KEYS.sessions) ?? '')).toHaveLength(1)
  })

  it('treats unreadable data as no sessions at all', () => {
    window.localStorage.setItem(STORAGE_KEYS.sessions, 'not json')
    expect(loadSessions()).toEqual([])
    window.localStorage.setItem(STORAGE_KEYS.sessions, '{"a":1}')
    expect(loadSessions()).toEqual([])
  })

  it('only keeps the most recent sessions once there are too many', () => {
    const extra = 5
    for (let i = 0; i < MAX_STORED_SESSIONS + extra; i++) {
      const day = new Date(Date.UTC(2026, 0, 1) + i * 86_400_000).toISOString()
      saveSession(session(`s${i}`, day))
    }
    const saved = loadSessions()
    expect(saved).toHaveLength(MAX_STORED_SESSIONS)
    expect(saved[0].id).toBe(`s${extra}`) // the oldest ones were dropped
    expect(saved[saved.length - 1].id).toBe(
      `s${MAX_STORED_SESSIONS + extra - 1}`,
    )
  })

  it('never throws when storage refuses', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    expect(saveSession(session('s', '2026-01-01T10:00:00.000Z'))).toEqual({
      ok: false,
      reason: 'unavailable',
    })
    expect(loadSessions()).toEqual([])
  })
})

describe('attempts', () => {
  it('starts empty', () => {
    expect(loadAttempts()).toEqual([])
  })

  it('saves an attempt with every field', () => {
    const attempt = makeAttempt({
      operation: 'division',
      firstOperand: 56,
      secondOperand: 7,
      correctAnswer: 8,
      selectedAnswer: 9,
      selfReportedCorrect: false,
      difficulty: 3,
      source: 'mistake-review',
      attemptedAt: '2026-02-03T04:05:06.000Z',
      sessionId: 'sess-9',
      questionId: 'q-9',
    })
    expect(saveAttempt(attempt)).toEqual({ ok: true })
    expect(loadAttempts()).toEqual([attempt])
  })

  it('keeps attempts in the order they were saved', () => {
    const [a, b, c] = [makeAttempt(), makeAttempt(), makeAttempt()]
    saveAttempt(a)
    saveAttempt(b)
    saveAttempt(c)
    expect(loadAttempts().map((x) => x.id)).toEqual([a.id, b.id, c.id])
  })

  it('does not save the same attempt twice', () => {
    const attempt = makeAttempt()
    saveAttempt(attempt)
    saveAttempt(attempt)
    saveAttempts([attempt, makeAttempt()])
    expect(loadAttempts()).toHaveLength(2)
  })

  it('saves a batch in one go', () => {
    const batch = [makeAttempt(), makeAttempt(), makeAttempt()]
    saveAttempts(batch)
    expect(loadAttempts()).toEqual(batch)
  })

  it('saves nothing, and writes nothing, for an empty batch', () => {
    expect(saveAttempts([])).toEqual({ ok: true })
    expect(raw(STORAGE_KEYS.attempts)).toBeNull()
  })

  it('persists across a "restart"', () => {
    const attempt = makeAttempt()
    saveAttempt(attempt)
    expect(loadAttempts()).toEqual([attempt])
  })

  it('skips damaged attempts but keeps the good ones', () => {
    const good = makeAttempt()
    window.localStorage.setItem(
      STORAGE_KEYS.attempts,
      JSON.stringify([good, { id: 'bad' }, 3]),
    )
    expect(loadAttempts()).toEqual([good])
  })

  it('only keeps the most recent attempts once there are too many', () => {
    const many = Array.from({ length: MAX_STORED_ATTEMPTS + 3 }, () =>
      makeAttempt(),
    )
    saveAttempts(many)
    const saved = loadAttempts()
    expect(saved).toHaveLength(MAX_STORED_ATTEMPTS)
    expect(saved[0].id).toBe(many[3].id)
    expect(saved[saved.length - 1].id).toBe(many[many.length - 1].id)
  })
})

describe('when the browser is full', () => {
  function failOnceWithQuota() {
    const original = Storage.prototype.setItem
    let failed = false
    return vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (!failed) {
        failed = true
        throw new DOMException('full', 'QuotaExceededError')
      }
      original.call(this, key, value)
    })
  }

  it('drops the oldest attempts and saves the new one', () => {
    const old = Array.from({ length: 8 }, () => makeAttempt())
    saveAttempts(old)
    failOnceWithQuota()

    const newest = makeAttempt()
    expect(saveAttempt(newest)).toEqual({ ok: true })

    const saved = loadAttempts()
    expect(saved.length).toBeLessThan(old.length + 1)
    expect(saved[saved.length - 1].id).toBe(newest.id)
    expect(saved[0].id).not.toBe(old[0].id)
  })

  it('drops the oldest sessions and saves the new one', () => {
    for (let i = 0; i < 8; i++) {
      saveSession(session(`s${i}`, `2026-01-0${i + 1}T10:00:00.000Z`))
    }
    failOnceWithQuota()

    expect(saveSession(session('latest', '2026-02-01T10:00:00.000Z'))).toEqual({
      ok: true,
    })
    const ids = loadSessions().map((s) => s.id)
    expect(ids[ids.length - 1]).toBe('latest')
    expect(ids).not.toContain('s0')
  })

  it('reports failure if it is still full after trimming', () => {
    saveAttempts([makeAttempt(), makeAttempt()])
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    expect(saveAttempt(makeAttempt())).toEqual({ ok: false, reason: 'quota' })
  })

  it('does not lose what is already saved when saving fails', () => {
    const kept = makeAttempt()
    saveAttempt(kept)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    saveAttempt(makeAttempt())
    vi.restoreAllMocks()
    expect(loadAttempts().map((a) => a.id)).toEqual([kept.id])
  })
})
