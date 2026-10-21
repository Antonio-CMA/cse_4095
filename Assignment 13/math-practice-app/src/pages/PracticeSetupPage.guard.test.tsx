import { fireEvent, render, screen } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AppProvider } from '../app/AppProvider'
import { TestRouter } from '../test/TestRouter'
import { PracticeSetupPage } from './PracticeSetupPage'

function renderSetup() {
  return render(
    <AppProvider>
      <TestRouter initialEntries={['/practice/setup']}>
        <Routes>
          <Route path="/practice/setup" element={<PracticeSetupPage />} />
          <Route path="/practice/session" element={<h1>Practice</h1>} />
        </Routes>
      </TestRouter>
    </AppProvider>,
  )
}

describe('starting with nothing chosen', () => {
  it('explains what is missing and will not start', () => {
    renderSetup()
    expect(screen.getByRole('button', { name: 'Start Session' })).toBeDisabled()
    expect(
      screen.getByText('Pick at least one operation to start.'),
    ).toBeVisible()
  })

  it('does not start even if the form is submitted another way', () => {
    renderSetup()
    fireEvent.submit(
      screen.getByRole('button', { name: 'Start Session' }).closest('form')!,
    )
    expect(
      screen.getByRole('heading', { name: 'Practice Setup' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Practice' })).toBeNull()
  })
})
