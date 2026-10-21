import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { saveMistakePatterns } from '../services/mistakeService'
import { STORAGE_KEYS } from '../services/storageService'
import { makePattern } from '../test/mistakePatterns'
import { TestRouter } from '../test/TestRouter'
import type { InitialEntry } from 'react-router'
import { SETUP_NOTICE_MESSAGES } from '../utils/setupNotice'
import { AppProvider } from './AppProvider'
import { AppRoutes } from './AppRoutes'

function renderAt(entry: InitialEntry) {
  return render(
    <AppProvider>
      <TestRouter initialEntries={[entry]}>
        <AppRoutes />
      </TestRouter>
    </AppProvider>,
  )
}

/** The explanation shown at the top of setup (the form has its own status too). */
const notice = () =>
  screen
    .getAllByRole('status')
    .find((el) => el.classList.contains('stats-message')) as HTMLElement

const setupHeading = () =>
  screen.getByRole('heading', { level: 1, name: 'Practice Setup' })

describe('explaining a missing session', () => {
  it('sends a practice page with no session back to setup, and says why', () => {
    renderAt('/practice/session')
    expect(setupHeading()).toBeInTheDocument()
    expect(notice()).toHaveTextContent(SETUP_NOTICE_MESSAGES['no-session'])
  })

  it('does the same for setup data that makes no sense', () => {
    renderAt({
      pathname: '/practice/session',
      state: { operations: [], difficulty: 9 },
    })
    expect(notice()).toHaveTextContent(SETUP_NOTICE_MESSAGES['no-session'])
  })

  it('sends a summary with no results back to setup, and says why', () => {
    renderAt('/practice/summary')
    expect(setupHeading()).toBeInTheDocument()
    expect(notice()).toHaveTextContent(SETUP_NOTICE_MESSAGES['no-results'])
  })

  it('says so when a review was asked for but there are no mistakes', () => {
    renderAt({
      pathname: '/practice/session',
      state: {
        operations: ['addition'],
        difficulty: 1,
        sessionLength: 5,
        reviewMode: 'mistake-review',
      },
    })
    expect(setupHeading()).toBeInTheDocument()
    expect(notice()).toHaveTextContent(SETUP_NOTICE_MESSAGES['no-mistakes'])
  })

  it('does not show it when setup is opened normally', () => {
    renderAt('/practice/setup')
    expect(setupHeading()).toBeInTheDocument()
    expect(screen.queryByText(/We couldn't find/)).toBeNull()
  })

  it('still lets the student choose and start straight away', async () => {
    const user = userEvent.setup()
    renderAt('/practice/session')

    await user.click(screen.getByRole('checkbox', { name: 'Addition' }))
    await user.click(screen.getByRole('button', { name: 'Start Session' }))
    expect(
      screen.getByRole('heading', { level: 1, name: 'Practice' }),
    ).toBeInTheDocument()
  })

  it('a review with mistakes available is not turned away', () => {
    saveMistakePatterns([makePattern('addition', 4, 5, 1)])
    renderAt({
      pathname: '/practice/session',
      state: {
        operations: ['addition'],
        difficulty: 1,
        sessionLength: 5,
        reviewMode: 'mistake-review',
      },
    })
    expect(
      screen.getByRole('heading', { level: 1, name: 'Practice' }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/no mistakes to review/)).toBeNull()
  })
})

describe('telling the student when progress cannot be saved', () => {
  it('warns, in simple words, while practice carries on', async () => {
    const user = userEvent.setup()
    renderAt('/practice/setup')
    await user.click(screen.getByRole('checkbox', { name: 'Addition' }))
    await user.click(screen.getByRole('radio', { name: '5 questions' }))
    await user.click(screen.getByRole('button', { name: 'Start Session' }))
    expect(screen.queryByText(/no room left/)).toBeNull()

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    const front = screen.getByRole('region', { name: 'Question' })
    await user.click(
      within(front).getAllByRole('button', { pressed: false })[0],
    )
    await user.click(screen.getByRole('button', { name: 'Flip Card' }))
    await user.click(screen.getByRole('button', { name: 'I Got It Right' }))

    expect(screen.getByText(/no room left on this device/)).toBeInTheDocument()
    // The session carries on regardless.
    expect(screen.getByText('Question 2 of 5')).toBeInTheDocument()
    expect(window.localStorage.getItem(STORAGE_KEYS.attempts)).toBeNull()
  })

  it('can be closed, and does not come back after every answer', async () => {
    const user = userEvent.setup()
    renderAt('/practice/setup')
    await user.click(screen.getByRole('checkbox', { name: 'Addition' }))
    await user.click(screen.getByRole('radio', { name: '5 questions' }))
    await user.click(screen.getByRole('button', { name: 'Start Session' }))

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    const answer = async () => {
      const front = screen.getByRole('region', { name: 'Question' })
      await user.click(
        within(front).getAllByRole('button', { pressed: false })[0],
      )
      await user.click(screen.getByRole('button', { name: 'Flip Card' }))
      await user.click(screen.getByRole('button', { name: 'I Got It Right' }))
    }

    await answer()
    expect(screen.getByText(/isn't letting us save/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Got It' }))
    await answer()
    expect(screen.queryByText(/isn't letting us save/)).toBeNull()
  })
})
