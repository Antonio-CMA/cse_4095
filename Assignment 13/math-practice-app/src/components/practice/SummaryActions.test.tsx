import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { PracticeConfig } from '../../types/session'
import { SummaryActions } from './SummaryActions'

const CONFIG: PracticeConfig = {
  operations: ['multiplication', 'division'],
  difficulty: 3,
  sessionLength: 20,
  reviewMode: 'regular',
}

function Where({ label }: { label: string }) {
  const { state } = useLocation()
  return (
    <>
      <p>{label}</p>
      <pre data-testid="state">{JSON.stringify(state)}</pre>
    </>
  )
}

function renderActions(activeMistakeCount = 0) {
  return render(
    <MemoryRouter initialEntries={['/practice/summary']}>
      <Routes>
        <Route
          path="/practice/summary"
          element={
            <SummaryActions
              config={CONFIG}
              activeMistakeCount={activeMistakeCount}
            />
          }
        />
        <Route path="/practice/session" element={<Where label="session" />} />
        <Route path="/practice/setup" element={<Where label="setup" />} />
        <Route path="/statistics" element={<Where label="statistics" />} />
        <Route path="/settings" element={<Where label="settings" />} />
        <Route path="/" element={<Where label="home" />} />
      </Routes>
    </MemoryRouter>,
  )
}

const stateShown = () =>
  JSON.parse(screen.getByTestId('state').textContent ?? '')

describe('SummaryActions', () => {
  it('offers all five actions', () => {
    renderActions()
    for (const name of [
      'Practice Again',
      'Practice Mistakes',
      'Change Settings',
      'View Statistics',
      'Return Home',
    ]) {
      expect(screen.getByText(name)).toBeInTheDocument()
    }
  })

  it('Practice Again restarts with the same setup', async () => {
    const user = userEvent.setup()
    renderActions()

    await user.click(screen.getByRole('link', { name: 'Practice Again' }))
    expect(screen.getByText('session')).toBeInTheDocument()
    expect(stateShown()).toEqual(CONFIG)
  })

  it('keeps the settings choices hidden until Change Settings is opened', async () => {
    const user = userEvent.setup()
    renderActions()

    const toggle = screen.getByRole('button', { name: 'Change Settings' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(
      screen.queryByRole('link', { name: 'Practice Setup' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'App Settings' }),
    ).not.toBeInTheDocument()

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('link', { name: 'Practice Setup' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'App Settings' })).toBeVisible()

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(
      screen.queryByRole('link', { name: 'Practice Setup' }),
    ).not.toBeInTheDocument()
  })

  it('Practice Setup opens setup carrying the previous choices', async () => {
    const user = userEvent.setup()
    renderActions()

    await user.click(screen.getByRole('button', { name: 'Change Settings' }))
    await user.click(screen.getByRole('link', { name: 'Practice Setup' }))
    expect(screen.getByText('setup')).toBeInTheDocument()
    expect(stateShown()).toEqual(CONFIG)
  })

  it('App Settings opens the Settings page', async () => {
    const user = userEvent.setup()
    renderActions()

    await user.click(screen.getByRole('button', { name: 'Change Settings' }))
    await user.click(screen.getByRole('link', { name: 'App Settings' }))
    expect(screen.getByText('settings')).toBeInTheDocument()
  })

  it('View Statistics and Return Home go to their pages', async () => {
    const user = userEvent.setup()
    const { unmount } = renderActions()
    await user.click(screen.getByRole('link', { name: 'View Statistics' }))
    expect(screen.getByText('statistics')).toBeInTheDocument()
    unmount()

    renderActions()
    await user.click(screen.getByRole('link', { name: 'Return Home' }))
    expect(screen.getByText('home')).toBeInTheDocument()
  })

  it('disables Practice Mistakes and says why when there are no mistakes', () => {
    renderActions(0)

    const button = screen.getByRole('button', { name: 'Practice Mistakes' })
    expect(button).toBeDisabled()
    expect(button).toHaveAccessibleDescription('No mistakes to review yet.')
    expect(
      screen.queryByRole('link', { name: 'Practice Mistakes' }),
    ).not.toBeInTheDocument()
  })

  it('starts a mistake-review session when there are mistakes to review', async () => {
    const user = userEvent.setup()
    renderActions(3)

    await user.click(screen.getByRole('link', { name: 'Practice Mistakes' }))
    expect(screen.getByText('session')).toBeInTheDocument()
    expect(stateShown()).toEqual({ ...CONFIG, reviewMode: 'mistake-review' })
  })
})
