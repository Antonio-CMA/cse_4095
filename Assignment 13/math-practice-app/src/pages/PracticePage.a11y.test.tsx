import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { AppProvider } from '../app/AppProvider'
import { DEFAULT_SETTINGS, saveSettings } from '../services/settingsService'
import type { PracticeConfig } from '../types/session'
import { PracticePage } from './PracticePage'
import { SettingsPage } from './SettingsPage'

const FIXED: PracticeConfig = {
  operations: ['multiplication'],
  difficulty: 2,
  sessionLength: 5,
  reviewMode: 'regular',
}
const CONTINUOUS: PracticeConfig = { ...FIXED, sessionLength: 'continuous' }

function renderSession(config: PracticeConfig = FIXED) {
  return render(
    <AppProvider>
      <MemoryRouter
        initialEntries={[{ pathname: '/practice/session', state: config }]}
      >
        <Routes>
          <Route path="/practice/session" element={<PracticePage />} />
          <Route path="/practice/summary" element={<h1>Summary</h1>} />
        </Routes>
      </MemoryRouter>
    </AppProvider>,
  )
}

/** The page-level live region (the one that is not inside the card). */
function progressRegion() {
  return screen
    .getAllByRole('status')
    .find((el) => !el.closest('.flip-card')) as HTMLElement
}

const original = window.matchMedia
function setReducedMotion(reduce: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia
}
afterEach(() => {
  window.matchMedia = original
})

describe('practice page announcements', () => {
  it('announces the question, in words, with progress', () => {
    renderSession()
    expect(progressRegion().textContent).toMatch(
      /^Question 1 of 5\. \d+ (plus|minus|times|divided by) \d+ equals what\? 0 of 5 answered\.$/,
    )
  })

  it('is a polite live region that screen readers do not interrupt with', () => {
    renderSession()
    expect(progressRegion()).toHaveAttribute('aria-live', 'polite')
    expect(progressRegion()).toHaveClass('visually-hidden')
  })

  it('announces the next question, and the progress, after each answer', async () => {
    const user = userEvent.setup()
    renderSession()

    await user.keyboard('1')
    await user.click(screen.getByRole('button', { name: 'Flip Card' }))
    await user.click(screen.getByRole('button', { name: 'I Got It Right' }))

    expect(progressRegion().textContent).toMatch(
      /^Question 2 of 5\. .* 1 of 5 answered\.$/,
    )
  })

  it('counts answers without a total in continuous practice', async () => {
    const user = userEvent.setup()
    renderSession(CONTINUOUS)
    expect(progressRegion().textContent).toMatch(
      /^Question 1\. .* 0 answered\.$/,
    )

    await user.keyboard('2')
    await user.click(screen.getByRole('button', { name: 'Flip Card' }))
    await user.click(screen.getByRole('button', { name: 'I Got It Wrong' }))

    expect(progressRegion().textContent).toMatch(
      /^Question 2\. .* 1 answered\.$/,
    )
  })

  it('never reads out the maths symbols in the announcement', () => {
    renderSession()
    expect(progressRegion().textContent).not.toMatch(/[×÷−+=]/)
  })

  it('has a progress bar with a spoken name', () => {
    renderSession()
    expect(
      screen.getByRole('progressbar', { name: 'Session progress' }),
    ).toBeInTheDocument()
  })
})

describe('using only the keyboard', () => {
  it('answers a whole question: choose with a number key, flip and give a verdict with Enter', async () => {
    const user = userEvent.setup()
    renderSession(CONTINUOUS)

    // Number key chooses; Tab to the Flip button and press Enter.
    await user.keyboard('3')
    const flip = screen.getByRole('button', { name: 'Flip Card' })
    flip.focus()
    await user.keyboard('{Enter}')

    // Focus moved to the answer side, so Tab reaches the verdict buttons.
    expect(screen.getByRole('region', { name: 'Answer' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'I Got It Right' })).toHaveFocus()
    await user.keyboard(' ')

    expect(screen.getByText('Question 2')).toBeInTheDocument()
  })

  it('can choose an answer with Tab and Space instead of the number keys', async () => {
    const user = userEvent.setup()
    renderSession(CONTINUOUS)

    const front = screen.getByRole('region', { name: 'Question' })
    const first = within(front).getAllByRole('button', { pressed: false })[0]
    first.focus()
    await user.keyboard(' ')
    expect(first).toHaveAttribute('aria-pressed', 'true')
  })

  it('reaches every control in a sensible order', async () => {
    const user = userEvent.setup()
    renderSession(CONTINUOUS)

    // First End Session, then the four answers in order (Flip Card is
    // disabled until an answer is chosen, so Tab skips it).
    await user.tab()
    expect(screen.getByRole('button', { name: 'End Session' })).toHaveFocus()

    for (const key of ['1', '2', '3', '4']) {
      await user.tab()
      expect(document.activeElement).toHaveAttribute('aria-keyshortcuts', key)
    }
    // (That the hidden answer side cannot be tabbed to relies on the browser
    // honouring `inert`, which jsdom does not; it is checked in a real browser.)
  })

  it('reaches the Flip Card button once an answer has been chosen', async () => {
    const user = userEvent.setup()
    renderSession(CONTINUOUS)

    await user.keyboard('2')
    await user.tab() // End Session
    for (let i = 0; i < 4; i++) await user.tab() // the four answers
    await user.tab()
    expect(screen.getByRole('button', { name: 'Flip Card' })).toHaveFocus()
  })

  it('leaves the number keys for the dialog while End Session is being confirmed', async () => {
    const user = userEvent.setup()
    renderSession(CONTINUOUS)

    await user.click(screen.getByRole('button', { name: 'End Session' }))
    await user.keyboard('2')

    const front = screen.getByRole('region', { name: 'Question' })
    expect(
      within(front).queryAllByRole('button', { pressed: true }),
    ).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: 'Keep Practicing' }))
    await user.keyboard('2')
    expect(
      within(front).queryAllByRole('button', { pressed: true }),
    ).toHaveLength(1)
  })

  it('has the End Session dialog start on the safe button and close with Escape', async () => {
    const user = userEvent.setup()
    renderSession(CONTINUOUS)

    await user.click(screen.getByRole('button', { name: 'End Session' }))
    expect(
      screen.getByRole('button', { name: 'Keep Practicing' }),
    ).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })
})

describe('reduced motion', () => {
  it('flips with an animation when motion is welcome', () => {
    setReducedMotion(false)
    renderSession()
    expect(document.querySelector('.flip-card')).not.toHaveClass(
      'flip-card--static',
    )
  })

  it('switches sides instantly when the device asks for less motion', () => {
    setReducedMotion(true)
    renderSession()
    expect(document.querySelector('.flip-card')).toHaveClass(
      'flip-card--static',
    )
  })

  it('still changes the card clearly: the answer side appears and takes focus', async () => {
    setReducedMotion(true)
    const user = userEvent.setup()
    renderSession()

    await user.keyboard('1')
    await user.click(screen.getByRole('button', { name: 'Flip Card' }))

    expect(screen.getByRole('region', { name: 'Answer' })).toHaveFocus()
    expect(screen.getByRole('button', { name: 'I Got It Right' })).toBeVisible()
    expect(screen.getByText(/Answer revealed/)).toBeInTheDocument()
  })

  it('respects the card animation setting too', () => {
    setReducedMotion(false)
    saveSettings({ ...DEFAULT_SETTINGS, cardAnimationEnabled: false })
    renderSession()
    expect(document.querySelector('.flip-card')).toHaveClass(
      'flip-card--static',
    )
  })

  it('stays off if either the setting or the device says so', () => {
    setReducedMotion(true)
    saveSettings({ ...DEFAULT_SETTINGS, cardAnimationEnabled: true })
    renderSession()
    expect(document.querySelector('.flip-card')).toHaveClass(
      'flip-card--static',
    )
  })
})

describe('settings page and reduced motion', () => {
  function renderSettings() {
    return render(
      <AppProvider>
        <MemoryRouter initialEntries={['/settings']}>
          <Routes>
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </MemoryRouter>
      </AppProvider>,
    )
  }

  it('explains that cards switch instantly when the device asks for less motion', () => {
    setReducedMotion(true)
    renderSettings()
    expect(screen.getByText(/set to reduce motion/i)).toBeInTheDocument()
  })

  it('says nothing about it otherwise', () => {
    setReducedMotion(false)
    renderSettings()
    expect(screen.queryByText(/set to reduce motion/i)).toBeNull()
  })
})
