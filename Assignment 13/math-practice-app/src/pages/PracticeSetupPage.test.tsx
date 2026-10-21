import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import { PracticeSetupPage } from './PracticeSetupPage'

function SessionProbe() {
  const { state } = useLocation()
  return <pre data-testid="config">{JSON.stringify(state)}</pre>
}

function renderSetup() {
  return render(
    <MemoryRouter initialEntries={['/practice/setup']}>
      <Routes>
        <Route path="/practice/setup" element={<PracticeSetupPage />} />
        <Route path="/practice/session" element={<SessionProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

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
