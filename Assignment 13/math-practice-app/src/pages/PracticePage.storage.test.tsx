import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { loadAttempts, loadSessions } from '../services/practiceHistory'
import { loadStatistics } from '../services/statisticsService'
import type { PracticeConfig } from '../types/session'
import { AppProvider } from '../app/AppProvider'
import { PracticePage } from './PracticePage'

const CONFIG: PracticeConfig = {
  operations: ['addition', 'subtraction'],
  difficulty: 2,
  sessionLength: 3,
  reviewMode: 'regular',
}

function renderSession(config: PracticeConfig = CONFIG) {
  return render(
    <AppProvider>
      <MemoryRouter
        initialEntries={[{ pathname: '/practice/session', state: config }]}
      >
        <Routes>
          <Route path="/practice/session" element={<PracticePage />} />
          <Route path="/practice/summary" element={<h1>Summary</h1>} />
          <Route path="/practice/setup" element={<h1>Setup</h1>} />
        </Routes>
      </MemoryRouter>
    </AppProvider>,
  )
}

async function answer(
  user: ReturnType<typeof userEvent.setup>,
  verdict: 'right' | 'wrong',
) {
  const front = screen.getByRole('region', { name: 'Question' })
  await user.click(within(front).getAllByRole('button', { pressed: false })[0])
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  await user.click(
    screen.getByRole('button', {
      name: verdict === 'right' ? 'I Got It Right' : 'I Got It Wrong',
    }),
  )
}

describe('saving practice history', () => {
  it('saves nothing until a question has been answered', () => {
    renderSession()
    expect(loadSessions()).toEqual([])
    expect(loadAttempts()).toEqual([])
  })

  it('saves each answer as it is given, and the session as it grows', async () => {
    const user = userEvent.setup()
    renderSession()

    await answer(user, 'right')
    expect(loadAttempts()).toHaveLength(1)
    expect(loadSessions()).toHaveLength(1)
    expect(loadSessions()[0]).toMatchObject({
      attempted: 1,
      correct: 1,
      incorrect: 0,
    })
    expect(loadSessions()[0].completedAt).toBeUndefined()

    await answer(user, 'wrong')
    expect(loadAttempts()).toHaveLength(2)
    expect(loadSessions()).toHaveLength(1) // same session, updated
    expect(loadSessions()[0]).toMatchObject({
      attempted: 2,
      correct: 1,
      incorrect: 1,
    })
  })

  it('saves the completed session and every attempt with full details', async () => {
    const user = userEvent.setup()
    renderSession()

    await answer(user, 'right')
    await answer(user, 'wrong')
    await answer(user, 'right')

    const [session] = loadSessions()
    expect(loadSessions()).toHaveLength(1)
    expect(session).toMatchObject({
      operations: ['addition', 'subtraction'],
      difficulty: 2,
      sessionLength: 3,
      attempted: 3,
      correct: 2,
      incorrect: 1,
    })
    expect(Date.parse(session.completedAt ?? '')).not.toBeNaN()

    const attempts = loadAttempts()
    expect(attempts).toHaveLength(3)
    expect(attempts.map((a) => a.selfReportedCorrect)).toEqual([
      true,
      false,
      true,
    ])
    for (const attempt of attempts) {
      expect(attempt.sessionId).toBe(session.id)
      expect(['addition', 'subtraction']).toContain(attempt.operation)
      expect(attempt.difficulty).toBe(2)
      expect(attempt.source).toBe('regular')
      expect(Number.isInteger(attempt.selectedAnswer)).toBe(true)
      expect(Number.isInteger(attempt.correctAnswer)).toBe(true)
      expect(Date.parse(attempt.attemptedAt)).not.toBeNaN()
    }
    expect(new Set(attempts.map((a) => a.questionId)).size).toBe(3)
  })

  it('keeps the statistics up to date, counting each answer exactly once', async () => {
    const user = userEvent.setup()
    renderSession()

    await answer(user, 'right')
    expect(loadStatistics()).toMatchObject({
      attempted: 1,
      correct: 1,
      incorrect: 0,
    })

    await answer(user, 'wrong')
    await answer(user, 'right')

    const stats = loadStatistics()
    expect(stats).toMatchObject({ attempted: 3, correct: 2, incorrect: 1 })
    expect(stats.byDifficulty[2]).toEqual({
      attempted: 3,
      correct: 2,
      incorrect: 1,
    })
    expect(stats.byDifficulty[1].attempted).toBe(0)
    const byOperation = Object.values(stats.byOperation)
    expect(byOperation.reduce((n, b) => n + b.attempted, 0)).toBe(3)
    expect(stats.byOperation.multiplication.attempted).toBe(0)
  })

  it('saves a continuous session ended early', async () => {
    const user = userEvent.setup()
    renderSession({ ...CONFIG, sessionLength: 'continuous' })

    await answer(user, 'right')
    await user.click(screen.getByRole('button', { name: 'End Session' }))
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'End Session',
      }),
    )

    expect(loadSessions()[0]).toMatchObject({
      sessionLength: 'continuous',
      attempted: 1,
    })
    expect(loadSessions()[0].completedAt).toBeDefined()
  })

  it('does not save a session that was ended before any answers', async () => {
    const user = userEvent.setup()
    renderSession({ ...CONFIG, sessionLength: 'continuous' })

    await user.click(screen.getByRole('button', { name: 'End Session' }))
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'End Session',
      }),
    )
    expect(loadSessions()).toEqual([])
  })

  it('keeps earlier sessions when a new one is played', async () => {
    const user = userEvent.setup()
    const first = renderSession({ ...CONFIG, sessionLength: 1 })
    await answer(user, 'right')
    first.unmount()

    renderSession({ ...CONFIG, sessionLength: 1 })
    await answer(user, 'wrong')

    expect(loadSessions()).toHaveLength(2)
    expect(loadAttempts()).toHaveLength(2)
  })

  it('carries on normally if the browser will not save', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    const user = userEvent.setup()
    renderSession()

    await answer(user, 'right')
    await answer(user, 'wrong')
    await answer(user, 'right')

    expect(screen.getByRole('heading', { name: 'Summary' })).toBeInTheDocument()
  })

  it('carries on normally if the browser is full', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    const user = userEvent.setup()
    renderSession({ ...CONFIG, sessionLength: 2 })

    await answer(user, 'right')
    await answer(user, 'right')

    expect(screen.getByRole('heading', { name: 'Summary' })).toBeInTheDocument()
  })
})
