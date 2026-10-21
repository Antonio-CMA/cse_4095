import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AppProvider } from '../app/AppProvider'
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
} from '../services/settingsService'
import { PracticeSetupPage } from './PracticeSetupPage'

function SessionProbe() {
  const { state } = useLocation()
  return <pre data-testid="config">{JSON.stringify(state)}</pre>
}

function renderSetup(state?: unknown) {
  return render(
    <AppProvider>
      <MemoryRouter initialEntries={[{ pathname: '/practice/setup', state }]}>
        <Routes>
          <Route path="/practice/setup" element={<PracticeSetupPage />} />
          <Route path="/practice/session" element={<SessionProbe />} />
        </Routes>
      </MemoryRouter>
    </AppProvider>,
  )
}

describe('PracticeSetupPage with saved default settings', () => {
  const saved = {
    ...DEFAULT_SETTINGS,
    defaultOperations: ['multiplication' as const, 'division' as const],
    defaultDifficulty: 3 as const,
    defaultSessionLength: 20,
  }

  it('starts from the default operations, level and session length', () => {
    saveSettings(saved)
    renderSetup()

    expect(
      screen.getByRole('checkbox', { name: 'Multiplication' }),
    ).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Division' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Addition' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'Intermediate' })).toBeChecked()
    expect(screen.getByRole('radio', { name: '20 questions' })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Start Session' })).toBeEnabled()
  })

  it('can start a session straight away with the defaults', async () => {
    saveSettings(saved)
    const user = userEvent.setup()
    renderSetup()

    await user.click(screen.getByRole('button', { name: 'Start Session' }))
    expect(JSON.parse(screen.getByTestId('config').textContent ?? '')).toEqual({
      operations: ['multiplication', 'division'],
      difficulty: 3,
      sessionLength: 20,
      reviewMode: 'regular',
    })
  })

  it('lets a single session differ without changing the saved defaults', async () => {
    saveSettings(saved)
    const user = userEvent.setup()
    renderSetup()

    await user.click(screen.getByRole('checkbox', { name: 'Division' }))
    await user.click(screen.getByRole('radio', { name: 'Easy' }))
    await user.click(screen.getByRole('radio', { name: '5 questions' }))
    await user.click(screen.getByRole('button', { name: 'Start Session' }))

    expect(JSON.parse(screen.getByTestId('config').textContent ?? '')).toEqual({
      operations: ['multiplication'],
      difficulty: 2,
      sessionLength: 5,
      reviewMode: 'regular',
    })
    expect(loadSettings().settings).toMatchObject({
      defaultOperations: ['multiplication', 'division'],
      defaultDifficulty: 3,
      defaultSessionLength: 20,
    })
  })

  it('allows a continuous default', () => {
    saveSettings({ ...saved, defaultSessionLength: 'continuous' })
    renderSetup()
    expect(
      screen.getByRole('radio', { name: 'Continuous practice' }),
    ).toBeChecked()
  })

  it('ignores the defaults when a previous session setup is passed in', () => {
    saveSettings(saved)
    renderSetup({
      operations: ['addition'],
      difficulty: 1,
      sessionLength: 5,
      reviewMode: 'regular',
    })
    expect(screen.getByRole('checkbox', { name: 'Addition' })).toBeChecked()
    expect(
      screen.getByRole('checkbox', { name: 'Multiplication' }),
    ).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'Beginner' })).toBeChecked()
  })
})

describe('PracticeSetupPage starting values', () => {
  it('uses the previous session setup when one is passed in', () => {
    renderSetup({
      operations: ['subtraction', 'division'],
      difficulty: 4,
      sessionLength: 'continuous',
      reviewMode: 'regular',
    })

    expect(screen.getByRole('checkbox', { name: 'Subtraction' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Division' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Addition' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'Advanced' })).toBeChecked()
    expect(
      screen.getByRole('radio', { name: 'Continuous practice' }),
    ).toBeChecked()
    expect(screen.getByRole('button', { name: 'Start Session' })).toBeEnabled()
  })

  it('falls back to regular practice if mistake review is not available', () => {
    renderSetup({
      operations: ['addition'],
      difficulty: 1,
      sessionLength: 10,
      reviewMode: 'mistake-review',
    })
    expect(
      screen.getByRole('radio', { name: 'Regular practice' }),
    ).toBeChecked()
  })

  it('ignores unusable state and uses the defaults', () => {
    renderSetup({ operations: [], difficulty: 99 })

    expect(
      screen
        .getAllByRole('checkbox')
        .some((c) => (c as HTMLInputElement).checked),
    ).toBe(false)
    expect(screen.getByRole('radio', { name: 'Beginner' })).toBeChecked()
    expect(screen.getByRole('radio', { name: '10 questions' })).toBeChecked()
  })
})

describe('PracticeSetupPage', () => {
  it('disables Start Session and explains why until an operation is chosen', async () => {
    const user = userEvent.setup()
    renderSetup()

    const start = screen.getByRole('button', { name: 'Start Session' })
    expect(start).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent(
      /pick at least one operation/i,
    )

    await user.click(screen.getByRole('checkbox', { name: 'Addition' }))
    expect(start).toBeEnabled()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('starts with Beginner difficulty and 10 questions selected', () => {
    renderSetup()
    expect(screen.getByRole('radio', { name: 'Beginner' })).toBeChecked()
    expect(screen.getByRole('radio', { name: '10 questions' })).toBeChecked()
  })

  it('passes the chosen configuration to the practice session', async () => {
    const user = userEvent.setup()
    renderSetup()

    await user.click(screen.getByRole('checkbox', { name: 'Multiplication' }))
    await user.click(screen.getByRole('checkbox', { name: 'Division' }))
    await user.click(screen.getByRole('radio', { name: 'Intermediate' }))
    await user.click(screen.getByRole('radio', { name: '20 questions' }))
    await user.click(screen.getByRole('button', { name: 'Start Session' }))

    expect(JSON.parse(screen.getByTestId('config').textContent ?? '')).toEqual({
      operations: ['multiplication', 'division'],
      difficulty: 3,
      sessionLength: 20,
      reviewMode: 'regular',
    })
  })

  it('offers mistake review but keeps it disabled when there is nothing to review', () => {
    renderSetup()
    expect(
      screen.getByRole('radio', { name: 'Regular practice' }),
    ).toBeChecked()
    expect(
      screen.getByRole('radio', { name: 'Practice my mistakes' }),
    ).toBeDisabled()
  })
})
