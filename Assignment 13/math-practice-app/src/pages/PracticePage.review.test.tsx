import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router'
import { TestRouter } from '../test/TestRouter'
import { describe, expect, it } from 'vitest'
import { AppProvider } from '../app/AppProvider'
import {
  loadMistakePatterns,
  saveMistakePatterns,
} from '../services/mistakeService'
import { loadAttempts } from '../services/practiceHistory'
import { DEFAULT_SETTINGS, saveSettings } from '../services/settingsService'
import { makePattern } from '../test/mistakePatterns'
import type { PracticeConfig, SessionResult } from '../types/session'
import { PracticePage } from './PracticePage'

const REVIEW: PracticeConfig = {
  operations: ['addition', 'subtraction', 'multiplication', 'division'],
  difficulty: 1,
  sessionLength: 10,
  reviewMode: 'mistake-review',
}

function SummaryProbe() {
  const { state } = useLocation()
  return <pre data-testid="result">{JSON.stringify(state)}</pre>
}

function renderSession(config: PracticeConfig = REVIEW) {
  return render(
    <AppProvider>
      <TestRouter
        initialEntries={[{ pathname: '/practice/session', state: config }]}
      >
        <Routes>
          <Route path="/practice/session" element={<PracticePage />} />
          <Route path="/practice/setup" element={<h1>Practice Setup</h1>} />
          <Route path="/practice/summary" element={<SummaryProbe />} />
        </Routes>
      </TestRouter>
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

const summary = (): SessionResult =>
  JSON.parse(screen.getByTestId('result').textContent ?? '')

describe('review sessions', () => {
  it('goes back to setup when there is nothing to review', () => {
    renderSession()
    expect(
      screen.getByRole('heading', { name: 'Practice Setup' }),
    ).toBeInTheDocument()
  })

  it('goes back to setup when every mistake is already mastered', () => {
    saveMistakePatterns([
      makePattern('multiplication', 8, 7, 2, { mastered: true }),
    ])
    renderSession()
    expect(
      screen.getByRole('heading', { name: 'Practice Setup' }),
    ).toBeInTheDocument()
  })

  it('asks questions similar to the mistake, not the identical question', async () => {
    saveMistakePatterns([makePattern('multiplication', 8, 7, 2)])
    const user = userEvent.setup()
    renderSession({ ...REVIEW, sessionLength: 'continuous' })

    for (let i = 0; i < 2; i++) {
      const heading = screen.getByRole('heading', { level: 2 }).textContent
      expect(heading).not.toBe('8 × 7 = ?')
      await answer(user, 'wrong') // wrong keeps the pattern active
    }
  })

  it('saves every review answer with the pattern it came from', async () => {
    const a = makePattern('multiplication', 8, 7, 2)
    const b = makePattern('addition', 14, 9, 2)
    saveMistakePatterns([a, b])
    const user = userEvent.setup()
    renderSession({ ...REVIEW, sessionLength: 8 })

    for (let i = 0; i < 8; i++) await answer(user, 'wrong')

    const attempts = loadAttempts()
    expect(attempts).toHaveLength(8)
    for (const attempt of attempts) {
      expect(attempt.source).toBe('mistake-review')
      expect([a.id, b.id]).toContain(attempt.mistakePatternId)
    }
    // Both mistakes were mixed into the one session.
    expect(new Set(attempts.map((x) => x.mistakePatternId)).size).toBe(2)
  })

  it('credits right answers to the pattern, and does not start new patterns', async () => {
    const pattern = makePattern('multiplication', 8, 7, 2)
    saveMistakePatterns([pattern])
    const user = userEvent.setup()
    renderSession({ ...REVIEW, sessionLength: 'continuous' })

    await answer(user, 'right')
    await answer(user, 'right')

    const patterns = loadMistakePatterns()
    expect(patterns).toHaveLength(1)
    expect(patterns[0]).toMatchObject({
      id: pattern.id,
      similarCorrectCount: 2,
      mastered: false,
    })
  })

  it('counts a wrong review answer as another miss on the same pattern', async () => {
    const pattern = makePattern('multiplication', 8, 7, 2, {
      similarCorrectCount: 2,
    })
    saveMistakePatterns([pattern])
    const user = userEvent.setup()
    renderSession({ ...REVIEW, sessionLength: 'continuous' })

    await answer(user, 'wrong')

    const patterns = loadMistakePatterns()
    expect(patterns).toHaveLength(1)
    expect(patterns[0]).toMatchObject({
      incorrectCount: 2,
      similarCorrectCount: 0,
    })
  })

  it('masters a pattern after three right answers, then ends the session early', async () => {
    const pattern = makePattern('multiplication', 8, 7, 2)
    saveMistakePatterns([pattern])
    const user = userEvent.setup()
    renderSession({ ...REVIEW, sessionLength: 10 })

    await answer(user, 'right')
    await answer(user, 'right')
    expect(screen.queryByTestId('result')).toBeNull() // two answers: still going
    await answer(user, 'right')

    expect(loadMistakePatterns()[0]).toMatchObject({
      similarCorrectCount: 3,
      mastered: true,
    })
    const { session, attempts } = summary()
    expect(session).toMatchObject({
      attempted: 3,
      correct: 3,
      reviewMode: 'mistake-review',
    })
    expect(session.completedAt).toEqual(expect.any(String))
    expect(attempts.every((x) => x.source === 'mistake-review')).toBe(true)
  })

  it('follows the mastery setting when deciding the pattern is mastered', async () => {
    saveSettings({ ...DEFAULT_SETTINGS, masteryThreshold: 1 })
    saveMistakePatterns([makePattern('multiplication', 8, 7, 2)])
    const user = userEvent.setup()
    renderSession({ ...REVIEW, sessionLength: 10 })

    await answer(user, 'right')

    expect(loadMistakePatterns()[0].mastered).toBe(true)
    expect(summary().session.attempted).toBe(1)
  })

  it('keeps going while other mistakes still need practice', async () => {
    saveMistakePatterns([
      makePattern('multiplication', 8, 7, 2),
      makePattern('addition', 14, 9, 2),
    ])
    const user = userEvent.setup()
    renderSession({ ...REVIEW, sessionLength: 'continuous' })

    for (let i = 0; i < 4; i++) await answer(user, 'right')
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('ends when the session length is reached, as usual', async () => {
    saveMistakePatterns([makePattern('multiplication', 8, 7, 2)])
    const user = userEvent.setup()
    renderSession({ ...REVIEW, sessionLength: 2 })

    await answer(user, 'wrong')
    await answer(user, 'wrong')

    expect(summary().session).toMatchObject({ attempted: 2, incorrect: 2 })
  })

  it('describes the session by the mistakes it was made from', async () => {
    saveMistakePatterns([
      makePattern('multiplication', 8, 7, 3),
      makePattern('division', 56, 7, 3),
    ])
    const user = userEvent.setup()
    renderSession({ ...REVIEW, sessionLength: 1 })

    await answer(user, 'wrong')

    expect(summary().session).toMatchObject({
      operations: ['multiplication', 'division'],
      difficulty: 3,
    })
  })

  it('counts review answers in the statistics like any other', async () => {
    saveMistakePatterns([makePattern('multiplication', 8, 7, 2)])
    const user = userEvent.setup()
    renderSession({ ...REVIEW, sessionLength: 2 })

    await answer(user, 'right')
    await answer(user, 'wrong')

    const stats = JSON.parse(
      window.localStorage.getItem('mathPractice.statistics') ?? '{}',
    )
    expect(stats).toMatchObject({ attempted: 2, correct: 1, incorrect: 1 })
  })
})
