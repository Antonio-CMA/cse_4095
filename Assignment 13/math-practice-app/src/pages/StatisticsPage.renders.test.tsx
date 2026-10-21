import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { AppProvider } from '../app/AppProvider'
import { saveMistakePatterns } from '../services/mistakeService'
import { recordAttempt } from '../services/statisticsService'
import { makePattern } from '../test/mistakePatterns'
import { makeAttempt } from '../test/sessionResult'
import * as questionText from '../utils/questionText'
import { StatisticsPage } from './StatisticsPage'

function seed(mistakes: number) {
  recordAttempt(makeAttempt({ selfReportedCorrect: false }))
  saveMistakePatterns(
    Array.from({ length: mistakes }, (_, i) =>
      makePattern('addition', 10 + i, 1, 1, { incorrectCount: 1 + (i % 5) }),
    ),
  )
}

function renderPage() {
  return render(
    <AppProvider>
      <MemoryRouter>
        <StatisticsPage />
      </MemoryRouter>
    </AppProvider>,
  )
}

describe('redrawing the statistics page', () => {
  it('does not work out the mistake lists again when only a dialog opens', async () => {
    seed(300)
    const user = userEvent.setup()
    const describeFact = vi.spyOn(questionText, 'formatSolution')
    renderPage()
    const callsToDrawPage = describeFact.mock.calls.length
    expect(callsToDrawPage).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'Reset Statistics' }))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Keep My Statistics' }))

    // Opening and closing the confirmation redraws the page, but the sections
    // that did not change are left as they are.
    expect(describeFact.mock.calls.length).toBe(callsToDrawPage)
  })

  it('draws only a page of a large number of mistakes', () => {
    seed(1000)
    renderPage()
    expect(
      document.querySelectorAll('.mistake-item').length,
    ).toBeLessThanOrEqual(50)
    expect(screen.getByText(/Showing 25 of \d+\./)).toBeInTheDocument()
  })
})
