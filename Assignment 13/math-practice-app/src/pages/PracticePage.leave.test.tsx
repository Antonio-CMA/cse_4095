import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, Route, Routes, useNavigate } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AppProvider } from '../app/AppProvider'
import { loadAttempts, loadSessions } from '../services/practiceHistory'
import { STORAGE_KEYS } from '../services/storageService'
import { TestRouter } from '../test/TestRouter'
import type { PracticeConfig } from '../types/session'
import { PracticePage } from './PracticePage'

const CONFIG: PracticeConfig = {
  operations: ['addition'],
  difficulty: 1,
  sessionLength: 5,
  reviewMode: 'regular',
}
const CONTINUOUS: PracticeConfig = { ...CONFIG, sessionLength: 'continuous' }

function BackButton() {
  const navigate = useNavigate()
  return <button onClick={() => navigate(-1)}>Go Back</button>
}

/**
 * The practice page, with a link and a Back button that stay on screen like the
 * site's own navigation does. There is a page before it to go back to.
 */
function renderSession(config: PracticeConfig = CONFIG) {
  return render(
    <AppProvider>
      <TestRouter
        initialIndex={1}
        initialEntries={[
          '/practice/setup',
          { pathname: '/practice/session', state: config, key: 'visit-1' },
        ]}
      >
        <nav>
          <Link to="/statistics">View Statistics</Link>
          <BackButton />
        </nav>
        <Routes>
          <Route path="/practice/setup" element={<h1>Practice Setup</h1>} />
          <Route path="/practice/session" element={<PracticePage />} />
          <Route path="/practice/summary" element={<h1>Session Summary</h1>} />
          <Route path="/statistics" element={<h1>Statistics</h1>} />
        </Routes>
      </TestRouter>
    </AppProvider>,
  )
}

type User = ReturnType<typeof userEvent.setup>

async function answer(user: User, verdict: 'right' | 'wrong' = 'right') {
  const front = screen.getByRole('region', { name: 'Question' })
  await user.click(within(front).getAllByRole('button', { pressed: false })[0])
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  await user.click(
    screen.getByRole('button', {
      name: verdict === 'right' ? 'I Got It Right' : 'I Got It Wrong',
    }),
  )
}

const dialog = () => screen.queryByRole('alertdialog')
const onPracticePage = () =>
  screen.queryByRole('heading', { level: 1, name: 'Practice' }) !== null

describe('leaving a session in progress', () => {
  it('asks first when a link would take the student away', async () => {
    const user = userEvent.setup()
    renderSession()
    await answer(user)

    await user.click(screen.getByRole('link', { name: 'View Statistics' }))

    expect(dialog()).toBeInTheDocument()
    expect(
      within(dialog()!).getByRole('heading', { name: 'Leave this session?' }),
    ).toBeInTheDocument()
    expect(onPracticePage()).toBe(true)
    expect(screen.queryByRole('heading', { name: 'Statistics' })).toBeNull()
  })

  it('asks first when the browser Back button would take them away', async () => {
    const user = userEvent.setup()
    renderSession()
    await answer(user)

    await user.click(screen.getByRole('button', { name: 'Go Back' }))

    expect(dialog()).toBeInTheDocument()
    expect(onPracticePage()).toBe(true)
    expect(screen.queryByRole('heading', { name: 'Practice Setup' })).toBeNull()
  })

  it('says how many answers will be kept', async () => {
    const user = userEvent.setup()
    renderSession()
    await answer(user)
    await user.click(screen.getByRole('link', { name: 'View Statistics' }))
    expect(dialog()).toHaveTextContent(
      "You've answered 1 question so far. If you leave, the session ends and your answers are kept.",
    )
  })

  it('uses the plural for more answers', async () => {
    const user = userEvent.setup()
    renderSession()
    await answer(user)
    await answer(user, 'wrong')
    await user.click(screen.getByRole('link', { name: 'View Statistics' }))
    expect(dialog()).toHaveTextContent("You've answered 2 questions so far")
  })

  it('also asks before any question has been answered', async () => {
    const user = userEvent.setup()
    renderSession()
    await user.click(screen.getByRole('link', { name: 'View Statistics' }))
    expect(dialog()).toHaveTextContent(
      "You haven't answered any questions yet.",
    )
  })

  it('starts on the safe choice, so a stray Enter does not leave', async () => {
    const user = userEvent.setup()
    renderSession()
    await user.click(screen.getByRole('link', { name: 'View Statistics' }))
    expect(
      within(dialog()!).getByRole('button', { name: 'Keep Practicing' }),
    ).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(dialog()).toBeNull()
    expect(onPracticePage()).toBe(true)
  })
})

describe('choosing to carry on', () => {
  it('Keep Practicing closes the prompt and the session goes on untouched', async () => {
    const user = userEvent.setup()
    renderSession()
    await answer(user)
    const question = document.querySelector('.card__problem')?.textContent

    await user.click(screen.getByRole('link', { name: 'View Statistics' }))
    await user.click(screen.getByRole('button', { name: 'Keep Practicing' }))

    expect(dialog()).toBeNull()
    expect(screen.getByText('Question 2 of 5')).toBeInTheDocument()
    expect(document.querySelector('.card__problem')?.textContent).toBe(question)

    await answer(user)
    expect(screen.getByText('Question 3 of 5')).toBeInTheDocument()
  })

  it('Escape does the same as Keep Practicing', async () => {
    const user = userEvent.setup()
    renderSession()
    await user.click(screen.getByRole('link', { name: 'View Statistics' }))
    await user.keyboard('{Escape}')

    expect(dialog()).toBeNull()
    expect(onPracticePage()).toBe(true)
  })

  it('asks again the next time they try to leave', async () => {
    const user = userEvent.setup()
    renderSession()
    await user.click(screen.getByRole('link', { name: 'View Statistics' }))
    await user.click(screen.getByRole('button', { name: 'Keep Practicing' }))

    await user.click(screen.getByRole('link', { name: 'View Statistics' }))
    expect(dialog()).toBeInTheDocument()
  })

  it('does not let the number keys choose answers behind the prompt', async () => {
    const user = userEvent.setup()
    renderSession()
    await user.click(screen.getByRole('link', { name: 'View Statistics' }))
    await user.keyboard('1')
    await user.click(screen.getByRole('button', { name: 'Keep Practicing' }))

    expect(screen.queryAllByRole('button', { pressed: true })).toHaveLength(0)
  })

  it('keeps the session bookmarked while the prompt is up', async () => {
    const user = userEvent.setup()
    renderSession()
    await answer(user)
    await user.click(screen.getByRole('link', { name: 'View Statistics' }))
    expect(
      window.localStorage.getItem(STORAGE_KEYS.activeSession),
    ).not.toBeNull()
  })
})

describe('choosing to end the session and leave', () => {
  it('goes where the link was heading, not to the summary', async () => {
    const user = userEvent.setup()
    renderSession()
    await answer(user)

    await user.click(screen.getByRole('link', { name: 'View Statistics' }))
    await user.click(
      screen.getByRole('button', { name: 'End Session and Leave' }),
    )

    expect(
      screen.getByRole('heading', { name: 'Statistics' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Session Summary' }),
    ).toBeNull()
    expect(dialog()).toBeNull()
  })

  it('goes back when it was the Back button', async () => {
    const user = userEvent.setup()
    renderSession()
    await answer(user)

    await user.click(screen.getByRole('button', { name: 'Go Back' }))
    await user.click(
      screen.getByRole('button', { name: 'End Session and Leave' }),
    )

    expect(
      screen.getByRole('heading', { name: 'Practice Setup' }),
    ).toBeInTheDocument()
  })

  it('keeps every answer and marks the session as finished', async () => {
    const user = userEvent.setup()
    renderSession()
    await answer(user, 'right')
    await answer(user, 'wrong')

    await user.click(screen.getByRole('link', { name: 'View Statistics' }))
    await user.click(
      screen.getByRole('button', { name: 'End Session and Leave' }),
    )

    expect(loadAttempts()).toHaveLength(2)
    const [session] = loadSessions()
    expect(session).toMatchObject({ attempted: 2, correct: 1, incorrect: 1 })
    expect(session.completedAt).toBeDefined()
  })

  it('forgets the bookmark, so Back does not bring the session back', async () => {
    const user = userEvent.setup()
    renderSession()
    await answer(user)

    await user.click(screen.getByRole('link', { name: 'View Statistics' }))
    await user.click(
      screen.getByRole('button', { name: 'End Session and Leave' }),
    )

    expect(window.localStorage.getItem(STORAGE_KEYS.activeSession)).toBeNull()
  })

  it('works before any question is answered too', async () => {
    const user = userEvent.setup()
    renderSession()
    await user.click(screen.getByRole('link', { name: 'View Statistics' }))
    await user.click(
      screen.getByRole('button', { name: 'End Session and Leave' }),
    )

    expect(
      screen.getByRole('heading', { name: 'Statistics' }),
    ).toBeInTheDocument()
    expect(loadSessions()).toEqual([])
  })
})

describe('no warnings once the session is over', () => {
  it('finishing the last question goes straight to the summary', async () => {
    const user = userEvent.setup()
    renderSession()
    for (let i = 0; i < 5; i++) await answer(user)

    expect(
      screen.getByRole('heading', { name: 'Session Summary' }),
    ).toBeInTheDocument()
    expect(dialog()).toBeNull()
  })

  it('leaving the summary page is not questioned', async () => {
    const user = userEvent.setup()
    renderSession()
    for (let i = 0; i < 5; i++) await answer(user)

    await user.click(screen.getByRole('link', { name: 'View Statistics' }))
    expect(dialog()).toBeNull()
    expect(
      screen.getByRole('heading', { name: 'Statistics' }),
    ).toBeInTheDocument()
  })

  it('the End Session button still goes to the summary, without a second prompt', async () => {
    const user = userEvent.setup()
    renderSession(CONTINUOUS)
    await answer(user)

    await user.click(screen.getByRole('button', { name: 'End Session' }))
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'End Session',
      }),
    )

    expect(
      screen.getByRole('heading', { name: 'Session Summary' }),
    ).toBeInTheDocument()
    expect(dialog()).toBeNull()

    await user.click(screen.getByRole('link', { name: 'View Statistics' }))
    expect(dialog()).toBeNull()
  })

  it('shows the leave prompt instead of the End Session one if both are open', async () => {
    const user = userEvent.setup()
    renderSession(CONTINUOUS)
    await user.click(screen.getByRole('button', { name: 'End Session' }))
    await user.click(screen.getByRole('link', { name: 'View Statistics' }))

    expect(screen.getAllByRole('alertdialog')).toHaveLength(1)
    expect(dialog()).toHaveTextContent('Leave this session?')
  })
})
