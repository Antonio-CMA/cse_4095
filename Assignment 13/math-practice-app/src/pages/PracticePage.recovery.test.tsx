import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AppProvider } from '../app/AppProvider'
import { loadActiveSession } from '../services/activeSessionService'
import { saveMistakePatterns } from '../services/mistakeService'
import { loadAttempts } from '../services/practiceHistory'
import { loadStatistics } from '../services/statisticsService'
import { STORAGE_KEYS } from '../services/storageService'
import { makePattern } from '../test/mistakePatterns'
import { TestRouter } from '../test/TestRouter'
import type { PracticeConfig, SessionResult } from '../types/session'
import { PracticePage } from './PracticePage'

const CONFIG: PracticeConfig = {
  operations: ['multiplication'],
  difficulty: 2,
  sessionLength: 5,
  reviewMode: 'regular',
}
const CONTINUOUS: PracticeConfig = { ...CONFIG, sessionLength: 'continuous' }

function SummaryProbe() {
  const { state } = useLocation()
  return <pre data-testid="result">{JSON.stringify(state)}</pre>
}

/** Opens the practice page as the page visit `key`, as a refresh would. */
function renderSession(config: PracticeConfig = CONFIG, key = 'visit-1') {
  return render(
    <AppProvider>
      <TestRouter
        initialEntries={[{ pathname: '/practice/session', state: config, key }]}
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

type User = ReturnType<typeof userEvent.setup>

const problem = () => document.querySelector('.card__problem')?.textContent
const choices = () =>
  [...document.querySelectorAll('.answer-choice__value')].map(
    (el) => el.textContent,
  )
/** The question and its choices, which together identify a question. */
const questionOnScreen = () => `${problem()} | ${choices().join(',')}`

async function answer(user: User, verdict: 'right' | 'wrong') {
  const front = screen.getByRole('region', { name: 'Question' })
  await user.click(within(front).getAllByRole('button', { pressed: false })[0])
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  await user.click(
    screen.getByRole('button', {
      name: verdict === 'right' ? 'I Got It Right' : 'I Got It Wrong',
    }),
  )
}

function result(): SessionResult {
  return JSON.parse(screen.getByTestId('result').textContent ?? '')
}

describe('picking a session up again after a refresh', () => {
  it('carries on the same session: same question, same progress', async () => {
    const user = userEvent.setup()
    const first = renderSession()
    await answer(user, 'right')
    await answer(user, 'wrong')
    const waiting = questionOnScreen()
    first.unmount()

    renderSession()
    expect(screen.getByText('Question 3 of 5')).toBeInTheDocument()
    expect(screen.getByText('2 of 5 done')).toBeInTheDocument()
    expect(questionOnScreen()).toBe(waiting)
  })

  it('finishes with every answer from before and after the refresh', async () => {
    const user = userEvent.setup()
    const first = renderSession()
    await answer(user, 'right')
    await answer(user, 'wrong')
    first.unmount()

    renderSession()
    for (let i = 0; i < 3; i++) await answer(user, 'right')

    const { session, attempts } = result()
    expect(session).toMatchObject({ attempted: 5, correct: 4, incorrect: 1 })
    expect(attempts).toHaveLength(5)
    expect(attempts.every((a) => a.sessionId === session.id)).toBe(true)
  })

  it('does not count an answer twice', async () => {
    const user = userEvent.setup()
    const first = renderSession()
    await answer(user, 'right')
    await answer(user, 'wrong')
    first.unmount()
    renderSession()

    expect(loadAttempts()).toHaveLength(2)
    expect(loadStatistics()).toMatchObject({ attempted: 2, correct: 1 })
  })

  it('welcomes the student back, until they answer', async () => {
    const user = userEvent.setup()
    const first = renderSession()
    await answer(user, 'right')
    first.unmount()

    renderSession()
    expect(screen.getByText(/Welcome back!/)).toBeInTheDocument()
    await answer(user, 'right')
    expect(screen.queryByText(/Welcome back!/)).not.toBeInTheDocument()
  })

  it('does not welcome back a brand new session', () => {
    renderSession()
    expect(screen.queryByText(/Welcome back!/)).not.toBeInTheDocument()
  })

  it('keeps the same first question even before anything is answered', () => {
    const first = renderSession()
    const waiting = questionOnScreen()
    first.unmount()

    renderSession()
    expect(questionOnScreen()).toBe(waiting)
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument()
  })

  it('puts back the answer that had been picked', async () => {
    const user = userEvent.setup()
    const first = renderSession()
    await user.keyboard('2')
    const picked = choices()[1]
    first.unmount()

    renderSession()
    const front = screen.getByRole('region', { name: 'Question' })
    const pressed = within(front).getAllByRole('button', { pressed: true })
    expect(pressed).toHaveLength(1)
    expect(pressed[0]).toHaveTextContent(picked as string)
    expect(screen.getByRole('button', { name: 'Flip Card' })).toBeEnabled()
  })

  it('puts back a card that had been turned over, ready for a verdict', async () => {
    const user = userEvent.setup()
    const first = renderSession()
    await user.keyboard('3')
    const picked = choices()[2]
    await user.click(screen.getByRole('button', { name: 'Flip Card' }))
    first.unmount()

    renderSession()
    const back = screen.getByRole('region', { name: 'Answer' })
    expect(within(back).getByText('Your answer').nextSibling).toHaveTextContent(
      picked as string,
    )

    await user.click(screen.getByRole('button', { name: 'I Got It Right' }))
    expect(screen.getByText('Question 2 of 5')).toBeInTheDocument()
    expect(loadAttempts()).toHaveLength(1)
    expect(loadAttempts()[0].selectedAnswer).toBe(Number(picked))
  })

  it('does not carry a picked answer over to the next question', async () => {
    const user = userEvent.setup()
    const first = renderSession()
    await answer(user, 'right')
    first.unmount()

    renderSession()
    expect(screen.queryAllByRole('button', { pressed: true })).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Flip Card' })).toBeDisabled()
  })

  it('carries on counting in continuous practice', async () => {
    const user = userEvent.setup()
    const first = renderSession(CONTINUOUS)
    await answer(user, 'right')
    await answer(user, 'right')
    first.unmount()

    renderSession(CONTINUOUS)
    expect(screen.getByText('2 answered')).toBeInTheDocument()
    expect(screen.getByText('Question 3')).toBeInTheDocument()
  })

  it('carries on a mistake-review session', async () => {
    saveMistakePatterns([
      makePattern('multiplication', 8, 7, 2),
      makePattern('multiplication', 6, 9, 2),
    ])
    const review: PracticeConfig = { ...CONFIG, reviewMode: 'mistake-review' }
    const user = userEvent.setup()
    const first = renderSession(review)
    await answer(user, 'wrong')
    const waiting = questionOnScreen()
    first.unmount()

    renderSession(review)
    expect(screen.getByText('Question 2 of 5')).toBeInTheDocument()
    expect(questionOnScreen()).toBe(waiting)
    expect(loadActiveSession('visit-1')?.review).not.toBeNull()

    for (let i = 0; i < 4; i++) await answer(user, 'right')
    const { session, attempts } = result()
    expect(session.reviewMode).toBe('mistake-review')
    expect(attempts).toHaveLength(5)
    expect(attempts.every((a) => a.source === 'mistake-review')).toBe(true)
  })
})

describe('starting afresh instead', () => {
  it('a different page visit never picks up an old session', async () => {
    const user = userEvent.setup()
    const first = renderSession(CONFIG, 'visit-1')
    await answer(user, 'right')
    first.unmount()

    renderSession(CONFIG, 'visit-2')
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument()
    expect(screen.getByText('0 of 5 done')).toBeInTheDocument()
    expect(screen.queryByText(/Welcome back!/)).not.toBeInTheDocument()
  })

  it('the new session replaces the old bookmark', async () => {
    const user = userEvent.setup()
    const first = renderSession(CONFIG, 'visit-1')
    await answer(user, 'right')
    first.unmount()
    renderSession(CONFIG, 'visit-2')

    expect(loadActiveSession('visit-1')).toBeNull()
    expect(loadActiveSession('visit-2')).not.toBeNull()
  })

  it('ignores a damaged bookmark', () => {
    window.localStorage.setItem(
      STORAGE_KEYS.activeSession,
      JSON.stringify({ key: 'visit-1', session: 5 }),
    )
    renderSession()
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument()
    expect(screen.queryByText(/Welcome back!/)).not.toBeInTheDocument()
  })

  it('ignores a bookmark that is not even JSON', () => {
    window.localStorage.setItem(STORAGE_KEYS.activeSession, 'not json')
    renderSession()
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument()
  })
})

describe('forgetting the bookmark when the session is over', () => {
  it('keeps one while the session is running', async () => {
    const user = userEvent.setup()
    renderSession()
    await answer(user, 'right')
    expect(
      window.localStorage.getItem(STORAGE_KEYS.activeSession),
    ).not.toBeNull()
  })

  it('removes it when the last question is answered', async () => {
    const user = userEvent.setup()
    renderSession()
    for (let i = 0; i < 5; i++) await answer(user, 'right')

    expect(screen.getByTestId('result')).toBeInTheDocument()
    expect(window.localStorage.getItem(STORAGE_KEYS.activeSession)).toBeNull()
  })

  it('removes it when the student ends the session', async () => {
    const user = userEvent.setup()
    renderSession(CONTINUOUS)
    await answer(user, 'right')
    await user.click(screen.getByRole('button', { name: 'End Session' }))
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'End Session',
      }),
    )

    expect(screen.getByTestId('result')).toBeInTheDocument()
    expect(window.localStorage.getItem(STORAGE_KEYS.activeSession)).toBeNull()
  })

  it('a finished session is not brought back by a refresh', async () => {
    const user = userEvent.setup()
    const first = renderSession()
    for (let i = 0; i < 5; i++) await answer(user, 'right')
    first.unmount()

    renderSession()
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument()
    expect(screen.getByText('0 of 5 done')).toBeInTheDocument()
  })
})
