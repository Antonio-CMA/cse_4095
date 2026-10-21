import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AppProvider } from '../app/AppProvider'
import { DEFAULT_SETTINGS, saveSettings } from '../services/settingsService'
import type { PracticeConfig } from '../types/session'
import { PracticePage } from './PracticePage'

const CONFIG: PracticeConfig = {
  operations: ['addition'],
  difficulty: 2,
  // Continuous, so these tests can keep answering without the session ending.
  sessionLength: 'continuous',
  reviewMode: 'regular',
}

function renderSession() {
  return render(
    <AppProvider>
      <MemoryRouter
        initialEntries={[{ pathname: '/practice/session', state: CONFIG }]}
      >
        <Routes>
          <Route path="/practice/session" element={<PracticePage />} />
        </Routes>
      </MemoryRouter>
    </AppProvider>,
  )
}

/** Picks the first answer on the front, which may or may not be right. */
async function flipFirstChoice(user: ReturnType<typeof userEvent.setup>) {
  const front = screen.getByRole('region', { name: 'Question' })
  const choice = within(front).getAllByRole('button', { pressed: false })[0]
  const chosen = Number(
    choice.querySelector('.answer-choice__value')?.textContent,
  )
  await user.click(choice)
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  return chosen
}

describe('practice uses the saved settings', () => {
  it('flips with an animation by default', () => {
    renderSession()
    expect(document.querySelector('.flip-card')).not.toHaveClass(
      'flip-card--static',
    )
  })

  it('switches sides without animation when card animation is off', () => {
    saveSettings({ ...DEFAULT_SETTINGS, cardAnimationEnabled: false })
    renderSession()
    expect(document.querySelector('.flip-card')).toHaveClass(
      'flip-card--static',
    )
  })

  it('explains a missed question when explanations are on', async () => {
    const user = userEvent.setup()
    renderSession()

    // Find which choice is wrong by reading the solved answer after flipping.
    // Keep drawing questions until the first choice is a wrong one.
    for (let attempts = 0; attempts < 40; attempts++) {
      const chosen = await flipFirstChoice(user)
      const correct = Number(
        within(screen.getByRole('region', { name: 'Answer' })).getByText(
          'Correct answer',
        ).nextElementSibling?.textContent,
      )
      if (chosen !== correct) {
        expect(
          screen.getByText(/Adding \d+ and \d+ together makes/),
        ).toBeInTheDocument()
        return
      }
      await user.click(screen.getByRole('button', { name: 'I Got It Right' }))
    }
    throw new Error('Never drew a question where the first choice was wrong')
  })

  it('does not explain anything when explanations are off', async () => {
    saveSettings({ ...DEFAULT_SETTINGS, showExplanations: false })
    const user = userEvent.setup()
    renderSession()

    for (let attempts = 0; attempts < 4; attempts++) {
      await flipFirstChoice(user)
      expect(screen.queryByText(/together makes/)).not.toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'I Got It Right' }))
    }
  })
})
