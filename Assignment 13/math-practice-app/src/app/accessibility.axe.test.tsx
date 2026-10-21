import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, type Mock } from 'vitest'
import type { InitialEntry } from 'react-router'
import { saveMistakePatterns } from '../services/mistakeService'
import { saveSession } from '../services/practiceHistory'
import { recordAttempt } from '../services/statisticsService'
import { reportStorageFailure } from '../services/storageFailures'
import { expectNoAccessibilityProblems } from '../test/axe'
import { makePattern } from '../test/mistakePatterns'
import { makeAttempt, makeResult } from '../test/sessionResult'
import { TestRouter } from '../test/TestRouter'
import type { DataProblem } from '../services/dataRepair'
import { AppProvider } from './AppProvider'
import { AppRoutes } from './AppRoutes'

/**
 * The automated accessibility check (axe) over every page and the states a
 * student can reach, including dialogs and error messages. It runs in jsdom, so
 * it cannot judge colour contrast or target sizes; those are checked by
 * `designContrast.test.ts` and `touchTargets.test.ts`, and by running axe in a
 * real browser (see the README).
 */

function renderApp(entry: InitialEntry, dataProblems?: DataProblem[]) {
  return render(
    <AppProvider dataProblems={dataProblems}>
      <TestRouter initialEntries={[entry]}>
        <AppRoutes />
      </TestRouter>
    </AppProvider>,
  )
}

type User = ReturnType<typeof userEvent.setup>

async function startSession(
  user: User,
  { length = '5 questions', operation = 'Addition' } = {},
) {
  await user.click(screen.getByRole('checkbox', { name: operation }))
  await user.click(screen.getByRole('radio', { name: length }))
  await user.click(screen.getByRole('button', { name: 'Start Session' }))
}

async function answerOne(user: User, verdict = 'I Got It Right') {
  const front = screen.getByRole('region', { name: 'Question' })
  await user.click(within(front).getAllByRole('button', { pressed: false })[0])
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  await user.click(screen.getByRole('button', { name: verdict }))
}

function seedPracticeData() {
  saveSession(makeResult([true, false, true]).session)
  recordAttempt(makeAttempt())
  recordAttempt(makeAttempt({ selfReportedCorrect: false }))
  saveMistakePatterns([makePattern('multiplication', 8, 7)])
}

describe('every page, with nothing saved', () => {
  it.each([
    ['home', '/'],
    ['practice setup', '/practice/setup'],
    ['statistics', '/statistics'],
    ['settings', '/settings'],
    ['privacy', '/privacy'],
    ['page not found', '/nowhere'],
  ])('%s has no accessibility problems', async (_name, path) => {
    const { container } = renderApp(path)
    // Statistics and settings load on demand: wait until the page is there.
    await screen.findByRole('heading', { level: 1 })
    await expectNoAccessibilityProblems(container)
  })
})

describe('pages with saved practice', () => {
  it('statistics, with sessions, totals and mistakes', async () => {
    seedPracticeData()
    const { container } = renderApp('/statistics')
    expect(
      await screen.findByRole('region', { name: 'Overall' }),
    ).toBeInTheDocument()
    await expectNoAccessibilityProblems(container)
  })

  it('statistics, with the reset confirmation open', async () => {
    seedPracticeData()
    const user = userEvent.setup()
    const { container } = renderApp('/statistics')
    await user.click(
      await screen.findByRole('button', { name: 'Reset Statistics' }),
    )
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    await expectNoAccessibilityProblems(container)
  })

  it('practice setup offering mistake review', async () => {
    seedPracticeData()
    const user = userEvent.setup()
    const { container } = renderApp('/practice/setup')
    await user.click(
      screen.getByRole('radio', { name: /Practice my mistakes/ }),
    )
    await expectNoAccessibilityProblems(container)
  })

  it('settings, with the clear-everything confirmation open', async () => {
    const user = userEvent.setup()
    const { container } = renderApp('/settings')
    await user.click(
      await screen.findByRole('button', { name: 'Clear All Application Data' }),
    )
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    await expectNoAccessibilityProblems(container)
  })
})

describe('a practice session', () => {
  it('the question card, before and after choosing an answer', async () => {
    const user = userEvent.setup()
    const { container } = renderApp('/practice/setup')
    await startSession(user)

    await expectNoAccessibilityProblems(container)
    await user.keyboard('2')
    await expectNoAccessibilityProblems(container)
  })

  it('the answer side, and the message after giving a verdict', async () => {
    const user = userEvent.setup()
    const { container } = renderApp('/practice/setup')
    await startSession(user)

    await user.keyboard('1')
    await user.click(screen.getByRole('button', { name: 'Flip Card' }))
    await expectNoAccessibilityProblems(container)

    await user.click(screen.getByRole('button', { name: 'I Got It Wrong' }))
    await expectNoAccessibilityProblems(container)
  })

  it('the End Session confirmation', async () => {
    const user = userEvent.setup()
    const { container } = renderApp('/practice/setup')
    await startSession(user, { length: 'Continuous practice' })
    await user.click(screen.getByRole('button', { name: 'End Session' }))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    await expectNoAccessibilityProblems(container)
  })

  it('the leave-this-session confirmation', async () => {
    const user = userEvent.setup()
    const { container } = renderApp('/practice/setup')
    await startSession(user)
    await user.click(screen.getByRole('link', { name: 'Statistics' }))
    expect(screen.getByRole('alertdialog')).toHaveTextContent(
      'Leave this session?',
    )
    await expectNoAccessibilityProblems(container)
  })

  it('a session picked up again after a refresh', async () => {
    const user = userEvent.setup()
    const first = renderApp({
      pathname: '/practice/session',
      state: {
        operations: ['addition'],
        difficulty: 1,
        sessionLength: 5,
        reviewMode: 'regular',
      },
      key: 'visit-1',
    })
    await answerOne(user)
    first.unmount()

    const { container } = renderApp({
      pathname: '/practice/session',
      state: {
        operations: ['addition'],
        difficulty: 1,
        sessionLength: 5,
        reviewMode: 'regular',
      },
      key: 'visit-1',
    })
    expect(screen.getByText(/Welcome back/)).toBeInTheDocument()
    await expectNoAccessibilityProblems(container)
  })

  it('the session summary', async () => {
    const user = userEvent.setup()
    const { container } = renderApp('/practice/setup')
    await startSession(user)
    for (let i = 0; i < 5; i++) await answerOne(user)

    expect(
      screen.getByRole('heading', { name: 'Session Summary' }),
    ).toBeInTheDocument()
    await expectNoAccessibilityProblems(container)
  })
})

describe('the page frame', () => {
  it('with the small-screen menu open', async () => {
    const user = userEvent.setup()
    const { container } = renderApp('/')
    await user.click(screen.getByRole('button', { name: 'Menu' }))
    await expectNoAccessibilityProblems(container)
  })
})

describe('messages and errors', () => {
  it('the notice about repaired data', async () => {
    const { container } = renderApp('/', [
      { category: 'attempts', action: 'reset', dropped: 0 },
      { category: 'settings', action: 'repaired', dropped: 1 },
    ])
    expect(screen.getByText('We fixed some saved data.')).toBeInTheDocument()
    await expectNoAccessibilityProblems(container)
  })

  it('the warning that progress cannot be saved', async () => {
    const { container } = renderApp('/')
    act(() => reportStorageFailure('unavailable'))
    expect(screen.getByText(/isn't letting us save/)).toBeInTheDocument()
    await expectNoAccessibilityProblems(container)
  })

  it('the explanation after being sent back to setup', async () => {
    const { container } = renderApp('/practice/session')
    expect(
      screen.getByText(/We couldn't find a practice session/),
    ).toBeVisible()
    await expectNoAccessibilityProblems(container)
  })

  it('the message shown when a page breaks', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const generator = await import('../services/questionGenerator')
    vi.spyOn(generator, 'generateNextQuestion').mockImplementation(() => {
      throw new Error('boom')
    })
    const user = userEvent.setup()
    const { container } = renderApp('/practice/setup')
    await user.click(screen.getByRole('checkbox', { name: 'Addition' }))
    await user.click(screen.getByRole('button', { name: 'Start Session' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Something unexpected happened',
    )
    await expectNoAccessibilityProblems(container)
    expect(
      (generator.generateNextQuestion as Mock).mock.calls.length,
    ).toBeGreaterThan(0)
  })
})

describe('the checker itself', () => {
  it('really does catch a problem (so a pass means something)', async () => {
    const { container } = render(
      <main>
        <h1>Page</h1>
        <img src="x.png" />
        <button />
      </main>,
    )
    await expect(expectNoAccessibilityProblems(container)).rejects.toThrow(
      /image-alt|button-name/,
    )
  })
})
