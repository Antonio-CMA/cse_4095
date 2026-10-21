import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { TestRouter } from '../test/TestRouter'
import { describe, expect, it } from 'vitest'
import { AppProvider } from '../app/AppProvider'
import { DEFAULT_SETTINGS, saveSettings } from '../services/settingsService'
import type { PracticeConfig } from '../types/session'
import { RIGHT_MESSAGES, WRONG_MESSAGES } from '../utils/feedback'
import { PracticePage } from './PracticePage'

const CONFIG: PracticeConfig = {
  operations: ['addition'],
  difficulty: 1,
  // Continuous, so the session never ends while these tests keep answering.
  sessionLength: 'continuous',
  reviewMode: 'regular',
}

function renderSession() {
  return render(
    <AppProvider>
      <TestRouter
        initialEntries={[{ pathname: '/practice/session', state: CONFIG }]}
      >
        <Routes>
          <Route path="/practice/session" element={<PracticePage />} />
        </Routes>
      </TestRouter>
    </AppProvider>,
  )
}

const visibleFeedback = () => document.querySelector('.feedback')

function pageAnnouncement() {
  return (
    screen
      .getAllByRole('status')
      .find((el) => !el.closest('.flip-card')) as HTMLElement
  ).textContent
}

async function answer(
  user: ReturnType<typeof userEvent.setup>,
  verdict: 'I Got It Right' | 'I Got It Wrong',
) {
  await user.keyboard('1')
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  await user.click(screen.getByRole('button', { name: verdict }))
}

describe('friendly feedback while practising', () => {
  it('shows nothing before the first answer', () => {
    renderSession()
    expect(visibleFeedback()).toBeNull()
  })

  it('praises a right answer', async () => {
    const user = userEvent.setup()
    renderSession()
    await answer(user, 'I Got It Right')

    const text = visibleFeedback()?.textContent ?? ''
    expect(RIGHT_MESSAGES.some((m) => text.includes(m))).toBe(true)
    expect(visibleFeedback()).toHaveClass('feedback--right')
  })

  it('encourages after a missed answer, without blame', async () => {
    const user = userEvent.setup()
    renderSession()
    await answer(user, 'I Got It Wrong')

    const text = visibleFeedback()?.textContent ?? ''
    expect(WRONG_MESSAGES.some((m) => text.includes(m))).toBe(true)
    expect(visibleFeedback()).toHaveClass('feedback--wrong')
  })

  it('changes the message each time', async () => {
    const user = userEvent.setup()
    renderSession()

    let previous = ''
    for (let i = 0; i < 6; i++) {
      await answer(user, 'I Got It Right')
      const text = visibleFeedback()?.textContent ?? ''
      expect(text).not.toBe(previous)
      previous = text
    }
  })

  it('is read out by screen readers, but not twice', async () => {
    const user = userEvent.setup()
    renderSession()
    await answer(user, 'I Got It Right')

    const text = visibleFeedback()?.textContent ?? ''
    const message = RIGHT_MESSAGES.find((m) => text.includes(m)) as string
    expect(pageAnnouncement()).toMatch(new RegExp(`^${message} Question 2\\.`))
    expect(visibleFeedback()).toHaveAttribute('aria-hidden', 'true')
  })

  it('shows and announces nothing when the messages are turned off', async () => {
    saveSettings({ ...DEFAULT_SETTINGS, feedbackEnabled: false })
    const user = userEvent.setup()
    renderSession()
    await answer(user, 'I Got It Wrong')

    expect(visibleFeedback()).toBeNull()
    expect(pageAnnouncement()).toMatch(/^Question 2\./)
  })
})
