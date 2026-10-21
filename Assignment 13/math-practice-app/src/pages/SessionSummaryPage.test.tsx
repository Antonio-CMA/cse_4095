import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import { makeResult } from '../test/sessionResult'
import { AppProvider } from '../app/AppProvider'
import { saveMistakePatterns } from '../services/mistakeService'
import { DEFAULT_SETTINGS, saveSettings } from '../services/settingsService'
import { makePattern } from '../test/mistakePatterns'
import { PracticeSetupPage } from './PracticeSetupPage'
import { SessionSummaryPage } from './SessionSummaryPage'

function SessionProbe() {
  const { state } = useLocation()
  return (
    <>
      <h1>Practice</h1>
      <pre data-testid="state">{JSON.stringify(state)}</pre>
    </>
  )
}

function renderSummary(state: unknown) {
  return render(
    <AppProvider>
      <MemoryRouter initialEntries={[{ pathname: '/practice/summary', state }]}>
        <Routes>
          <Route path="/practice/summary" element={<SessionSummaryPage />} />
          <Route path="/practice/setup" element={<PracticeSetupPage />} />
          <Route path="/practice/session" element={<SessionProbe />} />
          <Route path="/statistics" element={<h1>Statistics</h1>} />
          <Route path="/" element={<h1>Home</h1>} />
        </Routes>
      </MemoryRouter>
    </AppProvider>,
  )
}

describe('SessionSummaryPage and mistake review', () => {
  it('offers Practice Mistakes once there are mistakes to review', async () => {
    saveMistakePatterns([makePattern('multiplication', 8, 7)])
    const user = userEvent.setup()
    renderSummary(makeResult([false, true]))

    const link = screen.getByRole('link', { name: 'Practice Mistakes' })
    await user.click(link)

    expect(
      JSON.parse(screen.getByTestId('state').textContent ?? ''),
    ).toMatchObject({
      reviewMode: 'mistake-review',
    })
  })

  it('keeps Practice Mistakes unavailable when every mistake is mastered', () => {
    saveMistakePatterns([
      makePattern('multiplication', 8, 7, 2, { mastered: true }),
    ])
    renderSummary(makeResult([false]))
    expect(
      screen.getByRole('button', { name: 'Practice Mistakes' }),
    ).toBeDisabled()
  })

  it('Practice Again after a review session reviews again', async () => {
    saveMistakePatterns([makePattern('multiplication', 8, 7)])
    const user = userEvent.setup()
    renderSummary(makeResult([true], { reviewMode: 'mistake-review' }))

    await user.click(screen.getByRole('link', { name: 'Practice Again' }))
    expect(
      JSON.parse(screen.getByTestId('state').textContent ?? ''),
    ).toMatchObject({
      reviewMode: 'mistake-review',
    })
  })

  it('Practice Again after a regular session stays regular', async () => {
    const user = userEvent.setup()
    renderSummary(makeResult([true], { reviewMode: 'regular' }))

    await user.click(screen.getByRole('link', { name: 'Practice Again' }))
    expect(
      JSON.parse(screen.getByTestId('state').textContent ?? ''),
    ).toMatchObject({
      reviewMode: 'regular',
    })
  })

  it('treats a session saved before review existed as regular', async () => {
    const user = userEvent.setup()
    renderSummary(makeResult([true]))

    await user.click(screen.getByRole('link', { name: 'Practice Again' }))
    expect(
      JSON.parse(screen.getByTestId('state').textContent ?? ''),
    ).toMatchObject({
      reviewMode: 'regular',
    })
  })

  it('counts the review questions in the summary', () => {
    const result = makeResult([true, true, false])
    result.attempts[0] = { ...result.attempts[0], source: 'mistake-review' }
    result.attempts[1] = { ...result.attempts[1], source: 'mistake-review' }
    renderSummary(result)
    expect(
      screen.getByText('Mistake-review questions').nextSibling,
    ).toHaveTextContent('2')
  })
})

describe('SessionSummaryPage', () => {
  it('shows the results of the session', () => {
    renderSummary(makeResult([true, true, false, true, false]))

    expect(
      screen.getByRole('heading', { level: 1, name: 'Session Summary' }),
    ).toBeInTheDocument()
    expect(screen.getByText("Here's how you did.")).toBeInTheDocument()
    expect(
      screen.getByText('Questions attempted').nextSibling,
    ).toHaveTextContent('5')
    expect(screen.getByText('Correct').nextSibling).toHaveTextContent('3')
    expect(screen.getByText('Incorrect').nextSibling).toHaveTextContent('2')
    expect(screen.getByText('Accuracy').nextSibling).toHaveTextContent('60%')
  })

  it('has a friendly message when no questions were answered', () => {
    renderSummary(makeResult([]))
    expect(
      screen.getByText('You ended before answering any questions.'),
    ).toBeInTheDocument()
  })

  it('encourages the child to match how the session went', () => {
    const { unmount } = renderSummary(makeResult([true, true, true]))
    expect(screen.getByText(/Perfect score/)).toHaveClass('feedback')
    unmount()

    renderSummary(makeResult([false, false]))
    expect(screen.getByText(/Every try helps you learn/)).toBeInTheDocument()
  })

  it('has no encouragement when nothing was answered', () => {
    renderSummary(makeResult([]))
    expect(document.querySelector('.feedback')).toBeNull()
  })

  it('leaves out the encouragement when messages are turned off', () => {
    saveSettings({ ...DEFAULT_SETTINGS, feedbackEnabled: false })
    renderSummary(makeResult([true, true]))
    expect(screen.queryByText(/Perfect score/)).not.toBeInTheDocument()
    expect(document.querySelector('.feedback')).toBeNull()
  })

  it.each([
    ['missing', undefined],
    ['not a session', { hello: 'world' }],
    ['inconsistent', { ...makeResult([true]), attempts: [] }],
  ])('goes to setup when the results are %s', (_label, state) => {
    renderSummary(state)
    expect(
      screen.getByRole('heading', { name: 'Practice Setup' }),
    ).toBeInTheDocument()
  })

  it('Practice Again starts a new session with the same setup', async () => {
    const user = userEvent.setup()
    renderSummary(
      makeResult([true], {
        operations: ['division'],
        difficulty: 4,
        sessionLength: 'continuous',
      }),
    )

    await user.click(screen.getByRole('link', { name: 'Practice Again' }))
    expect(JSON.parse(screen.getByTestId('state').textContent ?? '')).toEqual({
      operations: ['division'],
      difficulty: 4,
      sessionLength: 'continuous',
      reviewMode: 'regular',
    })
  })

  it('Change Settings → Practice Setup opens setup with the previous choices filled in', async () => {
    const user = userEvent.setup()
    renderSummary(
      makeResult([true], {
        operations: ['subtraction', 'multiplication'],
        difficulty: 3,
        sessionLength: 20,
      }),
    )

    await user.click(screen.getByRole('button', { name: 'Change Settings' }))
    await user.click(screen.getByRole('link', { name: 'Practice Setup' }))

    expect(screen.getByRole('checkbox', { name: 'Subtraction' })).toBeChecked()
    expect(
      screen.getByRole('checkbox', { name: 'Multiplication' }),
    ).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Addition' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'Intermediate' })).toBeChecked()
    expect(screen.getByRole('radio', { name: '20 questions' })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Start Session' })).toBeEnabled()
  })

  it('View Statistics and Return Home navigate away', async () => {
    const user = userEvent.setup()
    const { unmount } = renderSummary(makeResult([true]))
    await user.click(screen.getByRole('link', { name: 'View Statistics' }))
    expect(
      screen.getByRole('heading', { name: 'Statistics' }),
    ).toBeInTheDocument()
    unmount()

    renderSummary(makeResult([true]))
    await user.click(screen.getByRole('link', { name: 'Return Home' }))
    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument()
  })

  it('shows Practice Mistakes as unavailable while no mistakes are tracked', () => {
    renderSummary(makeResult([false]))
    expect(
      screen.getByRole('button', { name: 'Practice Mistakes' }),
    ).toBeDisabled()
  })
})
