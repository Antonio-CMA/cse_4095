import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { PracticeConfig, SessionResult } from '../types/session'
import { PracticePage } from './PracticePage'

const CONFIG: PracticeConfig = {
  operations: ['addition', 'subtraction'],
  difficulty: 1,
  sessionLength: 3,
  reviewMode: 'regular',
}

function SummaryProbe() {
  const { state } = useLocation()
  return <pre data-testid="result">{JSON.stringify(state)}</pre>
}

function renderSession(state: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/practice/session', state }]}>
      <Routes>
        <Route path="/practice/session" element={<PracticePage />} />
        <Route path="/practice/setup" element={<h1>Practice Setup</h1>} />
        <Route path="/practice/summary" element={<SummaryProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

/** Answers the question on screen: pick the first choice, flip, give a verdict. */
async function answerQuestion(
  user: ReturnType<typeof userEvent.setup>,
  verdict: 'right' | 'wrong',
) {
  const front = screen.getByRole('region', { name: 'Question' })
  await user.click(within(front).getAllByRole('button', { pressed: false })[0])
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  await user.click(
    screen.getByRole('button', {
      name: verdict === 'right' ? 'I Got It Right' : 'I Got It Wrong',
    }),
  )
}

function summary(): SessionResult {
  return JSON.parse(screen.getByTestId('result').textContent ?? '')
}

describe('PracticePage setup data', () => {
  it.each([
    ['missing', undefined],
    ['not an object', 'addition'],
    ['no operations', { ...CONFIG, operations: [] }],
    ['an unknown difficulty', { ...CONFIG, difficulty: 9 }],
    ['an invalid length', { ...CONFIG, sessionLength: -1 }],
  ])('goes back to setup when the setup data is %s', (_label, state) => {
    renderSession(state)
    expect(
      screen.getByRole('heading', { name: 'Practice Setup' }),
    ).toBeInTheDocument()
  })

  it('shows the first question card for valid setup data', () => {
    renderSession(CONFIG)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Practice' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Question 1 of 3')).toBeInTheDocument()
    const front = screen.getByRole('region', { name: 'Question' })
    expect(
      within(front).getAllByRole('button', { pressed: false }),
    ).toHaveLength(4)
  })

  it('only asks the chosen kinds of question', async () => {
    const user = userEvent.setup()
    renderSession({
      ...CONFIG,
      operations: ['multiplication'],
      sessionLength: 5,
    })

    for (let i = 0; i < 4; i++) {
      expect(
        screen.getByRole('heading', { level: 2, name: /×.*= \?/ }),
      ).toBeInTheDocument()
      await answerQuestion(user, 'right')
    }
  })
})

describe('PracticePage progress', () => {
  it('shows a progress bar that advances after every answer', async () => {
    const user = userEvent.setup()
    renderSession(CONFIG)

    const bar = () =>
      screen.getByRole('progressbar', { name: 'Session progress' })
    expect(bar()).toHaveAttribute('value', '0')
    expect(bar()).toHaveAttribute('max', '3')
    expect(screen.getByText('0 of 3 done')).toBeInTheDocument()

    await answerQuestion(user, 'right')
    expect(bar()).toHaveAttribute('value', '1')
    expect(screen.getByText('1 of 3 done')).toBeInTheDocument()
    expect(screen.getByText('Question 2 of 3')).toBeInTheDocument()

    await answerQuestion(user, 'wrong')
    expect(bar()).toHaveAttribute('value', '2')
    expect(screen.getByText('Question 3 of 3')).toBeInTheDocument()
  })

  it('shows a fresh, unflipped card after each answer', async () => {
    const user = userEvent.setup()
    renderSession(CONFIG)

    await answerQuestion(user, 'right')

    expect(screen.getByRole('button', { name: 'Flip Card' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'I Got It Right' })).toBeNull()
    expect(screen.queryAllByRole('button', { pressed: true })).toHaveLength(0)
  })

  it('does not show a progress bar or End Session in a fixed-length session', () => {
    renderSession(CONFIG)
    expect(screen.queryByRole('button', { name: 'End Session' })).toBeNull()
  })
})

describe('PracticePage finishing a fixed-length session', () => {
  it('sends the totals and every attempt to the summary page', async () => {
    const user = userEvent.setup()
    renderSession(CONFIG)

    await answerQuestion(user, 'right')
    await answerQuestion(user, 'wrong')
    await answerQuestion(user, 'right')

    const { session, attempts } = summary()
    expect(session).toMatchObject({
      sessionLength: 3,
      difficulty: 1,
      operations: ['addition', 'subtraction'],
      attempted: 3,
      correct: 2,
      incorrect: 1,
    })
    expect(session.completedAt).toEqual(expect.any(String))
    expect(attempts.map((a) => a.selfReportedCorrect)).toEqual([
      true,
      false,
      true,
    ])
    expect(new Set(attempts.map((a) => a.questionId)).size).toBe(3)
    expect(attempts.every((a) => a.sessionId === session.id)).toBe(true)
  })

  it('records the answer that was selected', async () => {
    const user = userEvent.setup()
    renderSession({ ...CONFIG, sessionLength: 1 })

    const front = screen.getByRole('region', { name: 'Question' })
    const choice = within(front).getAllByRole('button', { pressed: false })[2]
    const chosenValue = Number(choice.textContent?.replace('✓', ''))
    await user.click(choice)
    await user.click(screen.getByRole('button', { name: 'Flip Card' }))
    await user.click(screen.getByRole('button', { name: 'I Got It Wrong' }))

    expect(summary().attempts[0].selectedAnswer).toBe(chosenValue)
  })
})

describe('PracticePage continuous practice', () => {
  const continuous = { ...CONFIG, sessionLength: 'continuous' as const }

  it('has no fixed total or progress bar, just a running count', async () => {
    const user = userEvent.setup()
    renderSession(continuous)

    expect(screen.getByText('Question 1')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).toBeNull()
    expect(screen.getByText('0 answered')).toBeInTheDocument()

    await answerQuestion(user, 'right')
    expect(screen.getByText('1 answered')).toBeInTheDocument()
    expect(screen.getByText('Question 2')).toBeInTheDocument()
  })

  it('keeps going past any fixed length', async () => {
    const user = userEvent.setup()
    renderSession(continuous)

    for (let i = 0; i < 25; i++) await answerQuestion(user, 'right')
    expect(screen.getByText('25 answered')).toBeInTheDocument()
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('asks before ending, and carries on if cancelled', async () => {
    const user = userEvent.setup()
    renderSession(continuous)
    await answerQuestion(user, 'right')

    await user.click(screen.getByRole('button', { name: 'End Session' }))
    const dialog = screen.getByRole('alertdialog', {
      name: 'End this session?',
    })
    expect(dialog).toHaveAccessibleDescription(/answered 1 question so far/i)

    await user.click(screen.getByRole('button', { name: 'Keep Practicing' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(screen.getByText('Question 2')).toBeInTheDocument()
  })

  it('ends the session and sends a summary after confirming', async () => {
    const user = userEvent.setup()
    renderSession(continuous)
    await answerQuestion(user, 'right')
    await answerQuestion(user, 'wrong')
    await answerQuestion(user, 'right')

    await user.click(screen.getByRole('button', { name: 'End Session' }))
    const dialog = screen.getByRole('alertdialog')
    await user.click(
      within(dialog).getByRole('button', { name: 'End Session' }),
    )

    const { session, attempts } = summary()
    expect(session).toMatchObject({
      sessionLength: 'continuous',
      attempted: 3,
      correct: 2,
      incorrect: 1,
    })
    expect(session.completedAt).toEqual(expect.any(String))
    expect(attempts).toHaveLength(3)
  })

  it('can be ended before answering anything', async () => {
    const user = userEvent.setup()
    renderSession(continuous)

    await user.click(screen.getByRole('button', { name: 'End Session' }))
    expect(screen.getByRole('alertdialog')).toHaveAccessibleDescription(
      /haven't answered any questions yet/i,
    )
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'End Session',
      }),
    )
    expect(summary().session.attempted).toBe(0)
  })
})
