import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { loadMistakePatterns } from '../services/mistakeService'
import { loadAttempts, loadSessions } from '../services/practiceHistory'
import { loadSettings } from '../services/settingsService'
import { loadStatistics } from '../services/statisticsService'
import { STORAGE_KEYS } from '../services/storageService'
import { TestRouter } from '../test/TestRouter'
import { AppProvider } from './AppProvider'
import { AppRoutes } from './AppRoutes'

/** Statistics and settings load on demand, so wait for them to appear. */
const statsReady = () =>
  screen.findByRole('heading', { level: 1, name: 'Statistics' })
const settingsReady = () =>
  screen.findByRole('heading', { level: 1, name: 'Settings' })

type User = ReturnType<typeof userEvent.setup>

/** One run of the app, like opening the site. Unmount it to "close the tab". */
function openApp(path: string) {
  return render(
    <AppProvider>
      <TestRouter initialEntries={[path]}>
        <AppRoutes />
      </TestRouter>
    </AppProvider>,
  )
}

async function start(
  user: User,
  operations: string[],
  length: string,
  level?: string,
) {
  for (const operation of operations) {
    await user.click(screen.getByRole('checkbox', { name: operation }))
  }
  if (level) await user.click(screen.getByRole('radio', { name: level }))
  await user.click(screen.getByRole('radio', { name: length }))
  await user.click(screen.getByRole('button', { name: 'Start Session' }))
}

async function answer(user: User, verdict: 'right' | 'wrong' = 'right') {
  const front = screen.getByRole('region', { name: 'Question' })
  await user.click(within(front).getAllByRole('button', { pressed: false })[0])
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  await user.click(
    screen.getByRole('button', {
      name: verdict === 'right' ? 'I Got It Right' : 'I Got It Wrong',
    }),
  )
}

describe('a mixed-operation session', () => {
  it('draws from every chosen operation, and nothing else', async () => {
    const user = userEvent.setup()
    openApp('/practice/setup')
    await user.click(screen.getByRole('button', { name: 'Select all (mixed)' }))
    await user.click(screen.getByRole('radio', { name: '20 questions' }))
    await user.click(screen.getByRole('button', { name: 'Start Session' }))

    for (let i = 0; i < 20; i++) await answer(user)

    expect(
      screen.getByRole('heading', { name: 'Session Summary' }),
    ).toBeInTheDocument()
    const used = new Set(loadAttempts().map((a) => a.operation))
    // 20 draws from four operations: all of them turn up (the chance of missing
    // one is under 1%), and only ever the four.
    expect(used.size).toBeGreaterThanOrEqual(3)
    for (const operation of used) {
      expect([
        'addition',
        'subtraction',
        'multiplication',
        'division',
      ]).toContain(operation)
    }
    const practiced = screen.getByText('Operations practiced').nextSibling
    expect(practiced?.textContent).toMatch(
      /Addition.*Subtraction.*Multiplication.*Division/,
    )
  })

  it('stays within the operations that were picked', async () => {
    const user = userEvent.setup()
    openApp('/practice/setup')
    await start(user, ['Addition', 'Division'], '10 questions')

    for (let i = 0; i < 10; i++) await answer(user)
    for (const attempt of loadAttempts()) {
      expect(['addition', 'division']).toContain(attempt.operation)
    }
  })
})

describe('continuous practice', () => {
  it('goes on for as long as the student likes, until they end it', async () => {
    const user = userEvent.setup()
    openApp('/practice/setup')
    await start(user, ['Subtraction'], 'Continuous practice')

    for (let i = 0; i < 12; i++) await answer(user)
    // Past any fixed length: still practising, still counting.
    expect(screen.getByText('12 answered')).toBeInTheDocument()
    expect(screen.getByText('Question 13')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'End Session' }))
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'End Session',
      }),
    )

    expect(
      screen.getByRole('heading', { name: 'Session Summary' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Questions attempted').nextSibling,
    ).toHaveTextContent('12')
    expect(loadSessions()[0]).toMatchObject({
      sessionLength: 'continuous',
      attempted: 12,
    })
    expect(loadSessions()[0].completedAt).toBeDefined()
  })
})

describe('a wrong answer becomes a mistake to practise', () => {
  it('creates exactly one mistake pattern, describing that question', async () => {
    const user = userEvent.setup()
    openApp('/practice/setup')
    await start(user, ['Multiplication'], '5 questions', 'Intermediate')

    await answer(user, 'wrong')
    for (let i = 0; i < 4; i++) await answer(user, 'right')

    const [missed] = loadAttempts().filter((a) => !a.selfReportedCorrect)
    const patterns = loadMistakePatterns()
    expect(patterns).toHaveLength(1)
    expect(patterns[0]).toMatchObject({
      operation: 'multiplication',
      firstOperand: missed.firstOperand,
      secondOperand: missed.secondOperand,
      correctAnswer: missed.correctAnswer,
      difficulty: 3, // Intermediate
      incorrectCount: 1,
      similarCorrectCount: 0,
      mastered: false,
    })
  })

  it('shows it on the statistics page and offers to practise it', async () => {
    const user = userEvent.setup()
    openApp('/practice/setup')
    await start(user, ['Multiplication'], '5 questions')
    await answer(user, 'wrong')
    for (let i = 0; i < 4; i++) await answer(user, 'right')

    expect(
      screen.getByRole('link', { name: 'Practice Mistakes' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'View Statistics' }))
    await statsReady()

    const list = screen.getByRole('list', { name: 'Mistakes to practise' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(1)
  })

  it('does not create one for a right answer', async () => {
    const user = userEvent.setup()
    openApp('/practice/setup')
    await start(user, ['Addition'], '5 questions')
    for (let i = 0; i < 5; i++) await answer(user, 'right')
    expect(loadMistakePatterns()).toEqual([])
  })

  it('counts a repeat of the same mistake instead of adding another', async () => {
    const user = userEvent.setup()
    openApp('/practice/setup')
    // Level 1 multiplication is only 0–5 × 0–5: repeats come up quickly.
    await start(user, ['Multiplication'], '20 questions', 'Beginner')
    for (let i = 0; i < 20; i++) await answer(user, 'wrong')

    const patterns = loadMistakePatterns()
    const distinctFacts = new Set(
      loadAttempts().map((a) => `${a.firstOperand}×${a.secondOperand}`),
    )
    expect(patterns).toHaveLength(distinctFacts.size)
    expect(patterns.reduce((total, p) => total + p.incorrectCount, 0)).toBe(20)
  })
})

describe('everything is still there after a browser refresh', () => {
  it('keeps practice history, statistics and mistakes', async () => {
    const user = userEvent.setup()
    const first = openApp('/practice/setup')
    await start(user, ['Division'], '5 questions')
    await answer(user, 'wrong')
    await answer(user, 'right')
    await answer(user, 'right')
    await answer(user, 'wrong')
    await answer(user, 'right')
    first.unmount() // the tab is closed...

    openApp('/statistics') // ...and the site is opened again.

    await statsReady()
    const overall = screen.getByRole('region', { name: 'Overall' })
    expect(
      within(overall).getByText('Questions attempted').nextSibling,
    ).toHaveTextContent('5')
    expect(within(overall).getByText('Correct').nextSibling).toHaveTextContent(
      '3',
    )
    expect(
      within(
        screen.getByRole('region', { name: 'Recent sessions' }),
      ).getAllByRole('listitem'),
    ).toHaveLength(1)
    expect(
      within(
        screen.getByRole('list', { name: 'Mistakes to practise' }),
      ).getAllByRole('listitem'),
    ).toHaveLength(2)

    expect(loadStatistics()).toMatchObject({ attempted: 5, correct: 3 })
  })

  it('keeps the settings, and starts setup from them', async () => {
    const user = userEvent.setup()
    const first = openApp('/settings')
    await settingsReady()
    await user.click(screen.getByRole('checkbox', { name: 'Card animation' }))
    await user.click(screen.getByRole('radio', { name: 'Continuous practice' }))
    await user.click(screen.getByRole('radio', { name: 'Advanced' }))
    first.unmount()

    openApp('/settings')

    await settingsReady()
    expect(
      screen.getByRole('checkbox', { name: 'Card animation' }),
    ).not.toBeChecked()
    expect(loadSettings().settings).toMatchObject({
      cardAnimationEnabled: false,
      defaultSessionLength: 'continuous',
      defaultDifficulty: 4,
    })
  })

  it('applies a saved setting to the next practice session', async () => {
    const user = userEvent.setup()
    const first = openApp('/settings')
    await settingsReady()
    await user.click(screen.getByRole('checkbox', { name: 'Card animation' }))
    first.unmount()

    const second = openApp('/practice/setup')
    await start(user, ['Addition'], '5 questions')
    expect(document.querySelector('.flip-card')).toHaveClass(
      'flip-card--static',
    )
    second.unmount()
  })
})

describe('resetting statistics', () => {
  it('erases history, totals and mistakes, but not the settings', async () => {
    const user = userEvent.setup()
    const settings = openApp('/settings')
    await settingsReady()
    await user.click(screen.getByRole('checkbox', { name: 'Sound effects' }))
    settings.unmount()

    const session = openApp('/practice/setup')
    await start(user, ['Addition'], '5 questions')
    await answer(user, 'wrong')
    for (let i = 0; i < 4; i++) await answer(user, 'right')
    session.unmount()
    expect(loadMistakePatterns()).toHaveLength(1)

    openApp('/statistics')

    await statsReady()
    await user.click(screen.getByRole('button', { name: 'Reset Statistics' }))
    await user.click(
      screen.getByRole('button', { name: 'Yes, Erase Everything' }),
    )

    expect(
      screen.getByRole('heading', { name: 'No practice yet' }),
    ).toBeInTheDocument()
    expect(loadSessions()).toEqual([])
    expect(loadAttempts()).toEqual([])
    expect(loadMistakePatterns()).toEqual([])
    expect(loadStatistics().attempted).toBe(0)
    expect(loadSettings().settings.soundEnabled).toBe(false)
    expect(window.localStorage.getItem(STORAGE_KEYS.activeSession)).toBeNull()
  })

  it('stays erased after a refresh', async () => {
    const user = userEvent.setup()
    const session = openApp('/practice/setup')
    await start(user, ['Addition'], '5 questions')
    for (let i = 0; i < 5; i++) await answer(user, 'right')
    session.unmount()

    const stats = openApp('/statistics')

    await statsReady()
    await user.click(screen.getByRole('button', { name: 'Reset Statistics' }))
    await user.click(
      screen.getByRole('button', { name: 'Yes, Erase Everything' }),
    )
    stats.unmount()

    openApp('/statistics')

    await statsReady()
    expect(
      screen.getByRole('heading', { name: 'No practice yet' }),
    ).toBeInTheDocument()
  })

  it('can be cancelled without losing anything', async () => {
    const user = userEvent.setup()
    const session = openApp('/practice/setup')
    await start(user, ['Addition'], '5 questions')
    for (let i = 0; i < 5; i++) await answer(user, 'right')
    session.unmount()

    openApp('/statistics')

    await statsReady()
    await user.click(screen.getByRole('button', { name: 'Reset Statistics' }))
    await user.click(screen.getByRole('button', { name: 'Keep My Statistics' }))
    expect(loadAttempts()).toHaveLength(5)
  })
})
