import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { AppProvider } from '../app/AppProvider'
import { recordPracticeAttempt } from '../services/attemptRecorder'
import { loadMistakePatterns } from '../services/mistakeService'
import {
  loadAttempts,
  loadSessions,
  saveSession,
} from '../services/practiceHistory'
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
} from '../services/settingsService'
import { loadStatistics, recordAttempt } from '../services/statisticsService'
import { makeAttempt, makeResult } from '../test/sessionResult'
import { StatisticsPage } from './StatisticsPage'

function renderPage() {
  return render(
    <AppProvider>
      <MemoryRouter initialEntries={['/statistics']}>
        <Routes>
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="/practice/setup" element={<h1>Practice Setup</h1>} />
        </Routes>
      </MemoryRouter>
    </AppProvider>,
  )
}

function seedPractice() {
  // 5 answers: 3 correct, 2 incorrect, across operations and levels.
  recordAttempt(
    makeAttempt({
      operation: 'addition',
      difficulty: 1,
      selfReportedCorrect: true,
    }),
  )
  recordAttempt(
    makeAttempt({
      operation: 'addition',
      difficulty: 1,
      selfReportedCorrect: true,
    }),
  )
  recordAttempt(
    makeAttempt({
      operation: 'multiplication',
      difficulty: 3,
      selfReportedCorrect: false,
    }),
  )
  recordAttempt(
    makeAttempt({
      operation: 'division',
      difficulty: 3,
      selfReportedCorrect: true,
    }),
  )
  recordAttempt(
    makeAttempt({
      operation: 'division',
      difficulty: 4,
      selfReportedCorrect: false,
    }),
  )
  saveSession(
    makeResult([true, true], {
      id: 's-old',
      startedAt: '2026-01-01T10:00:00.000Z',
      operations: ['addition'],
      difficulty: 1,
    }).session,
  )
  saveSession(
    makeResult([false, true, true], {
      id: 's-new',
      startedAt: '2026-02-01T10:00:00.000Z',
      operations: ['multiplication', 'division'],
      difficulty: 3,
    }).session,
  )
}

function valueOf(container: HTMLElement, label: string) {
  const term = within(container).getByText(label, { selector: 'dt' })
  return (term.nextElementSibling as HTMLElement).textContent
}

describe('StatisticsPage with no practice yet', () => {
  it('shows a friendly empty state with a way to start', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(
      screen.getByRole('heading', { level: 1, name: 'Statistics' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'No practice yet' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Start Practice' }))
    expect(
      screen.getByRole('heading', { name: 'Practice Setup' }),
    ).toBeInTheDocument()
  })

  it('has nothing to reset, so it offers no reset button', () => {
    renderPage()
    expect(
      screen.queryByRole('button', { name: 'Reset Statistics' }),
    ).toBeNull()
    expect(document.body).not.toHaveTextContent('NaN')
  })
})

describe('StatisticsPage with practice history', () => {
  it('shows the overall totals and accuracy', () => {
    seedPractice()
    renderPage()

    const overall = screen.getByRole('region', { name: 'Overall' })
    expect(valueOf(overall, 'Questions attempted')).toBe('5')
    expect(valueOf(overall, 'Correct')).toBe('3')
    expect(valueOf(overall, 'Incorrect')).toBe('2')
    expect(valueOf(overall, 'Accuracy')).toBe('60%')
    expect(
      screen.queryByRole('heading', { name: 'No practice yet' }),
    ).toBeNull()
  })

  it('breaks the totals down by operation', () => {
    seedPractice()
    renderPage()

    const section = screen.getByRole('region', { name: 'By operation' })
    const addition = within(section).getByRole('article', { name: 'Addition' })
    expect(valueOf(addition, 'Attempted')).toBe('2')
    expect(valueOf(addition, 'Accuracy')).toBe('100%')
    const division = within(section).getByRole('article', { name: 'Division' })
    expect(valueOf(division, 'Accuracy')).toBe('50%')
    const subtraction = within(section).getByRole('article', {
      name: 'Subtraction',
    })
    expect(valueOf(subtraction, 'Attempted')).toBe('0')
  })

  it('breaks the totals down by level', () => {
    seedPractice()
    renderPage()

    const section = screen.getByRole('region', { name: 'By level' })
    const intermediate = within(section).getByRole('article', {
      name: 'Level 3: Intermediate',
    })
    expect(valueOf(intermediate, 'Attempted')).toBe('2')
    expect(valueOf(intermediate, 'Accuracy')).toBe('50%')
    const advanced = within(section).getByRole('article', {
      name: 'Level 4: Advanced',
    })
    expect(valueOf(advanced, 'Incorrect')).toBe('1')
  })

  it('lists recent sessions, newest first', () => {
    seedPractice()
    renderPage()

    const section = screen.getByRole('region', { name: 'Recent sessions' })
    const items = within(section).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Multiplication and Division')
    expect(items[1]).toHaveTextContent('Addition')
  })

  it('only lists the ten most recent sessions', () => {
    for (let i = 0; i < 12; i++) {
      saveSession(
        makeResult([true], {
          id: `s${i}`,
          startedAt: new Date(Date.UTC(2026, 0, 1 + i)).toISOString(),
        }).session,
      )
    }
    recordAttempt(makeAttempt())
    renderPage()

    const section = screen.getByRole('region', { name: 'Recent sessions' })
    expect(within(section).getAllByRole('listitem')).toHaveLength(10)
  })

  it('still shows the totals after old detailed records are gone', () => {
    seedPractice()
    // Statistics are separate running totals, so they do not depend on the
    // detailed answers still being saved.
    window.localStorage.removeItem('mathPractice.attempts')
    renderPage()

    expect(
      valueOf(
        screen.getByRole('region', { name: 'Overall' }),
        'Questions attempted',
      ),
    ).toBe('5')
  })
})

describe('StatisticsPage mistake sections', () => {
  function seedMistakes() {
    recordPracticeAttempt(
      makeAttempt({
        operation: 'multiplication',
        firstOperand: 8,
        secondOperand: 7,
        correctAnswer: 56,
        difficulty: 2,
        selfReportedCorrect: false,
      }),
    )
    recordPracticeAttempt(
      makeAttempt({
        operation: 'multiplication',
        firstOperand: 8,
        secondOperand: 7,
        correctAnswer: 56,
        difficulty: 2,
        selfReportedCorrect: false,
      }),
    )
    recordPracticeAttempt(
      makeAttempt({
        operation: 'division',
        firstOperand: 56,
        secondOperand: 7,
        correctAnswer: 8,
        difficulty: 2,
        selfReportedCorrect: false,
      }),
    )
    const id = 'multiplication:8:7:L2'
    for (const correct of [true, true]) {
      recordPracticeAttempt(
        makeAttempt({
          source: 'mistake-review',
          mistakePatternId: id,
          operation: 'multiplication',
          firstOperand: 7,
          secondOperand: 8,
          correctAnswer: 56,
          difficulty: 2,
          selfReportedCorrect: correct,
        }),
      )
    }
  }

  it('shows the mistake counts and the review practice totals', () => {
    seedMistakes()
    renderPage()

    const section = screen.getByRole('region', { name: 'Mistakes' })
    expect(valueOf(section, 'Mistakes to practise')).toBe('2')
    expect(valueOf(section, 'Mistakes mastered')).toBe('0')
    expect(valueOf(section, 'Similar questions practised')).toBe('2')
    expect(valueOf(section, 'Review questions answered correctly')).toBe('2')
  })

  it('shows where the student misses most', () => {
    seedMistakes()
    renderPage()

    const section = screen.getByRole('region', { name: 'Where you miss most' })
    // multiplication: 2 misses, division: 1
    expect(within(section).getByText('Multiplication')).toBeInTheDocument()
    const facts = within(section).getAllByRole('listitem')
    expect(facts[0]).toHaveTextContent('8 × 7 = 56')
    expect(facts[0]).toHaveTextContent('missed 2 times')
    expect(facts[1]).toHaveTextContent('56 ÷ 7 = 8')
  })

  it('lists the mistakes with their review progress', () => {
    seedMistakes()
    renderPage()

    const list = screen.getByRole('list', { name: 'Mistakes to practise' })
    const first = within(list).getAllByRole('listitem')[0]
    expect(first).toHaveTextContent('8 × 7 = 56')
    expect(first).toHaveTextContent('Missed 2 times')
    expect(first).toHaveTextContent('2 of 3 right in review')
  })

  it('moves a mistake to the mastered section after enough review answers', () => {
    seedMistakes()
    recordPracticeAttempt(
      makeAttempt({
        source: 'mistake-review',
        mistakePatternId: 'multiplication:8:7:L2',
        operation: 'multiplication',
        firstOperand: 6,
        secondOperand: 8,
        correctAnswer: 48,
        difficulty: 2,
        selfReportedCorrect: true,
      }),
    )
    renderPage()

    expect(
      valueOf(
        screen.getByRole('region', { name: 'Mistakes' }),
        'Mistakes mastered',
      ),
    ).toBe('1')
    expect(screen.getByText('Mastered mistakes (1)')).toBeInTheDocument()
    expect(
      within(
        screen.getByRole('list', { name: 'Mistakes to practise' }),
      ).getAllByRole('listitem'),
    ).toHaveLength(1)
  })

  it('follows the mastery setting from the Settings page', () => {
    seedMistakes()
    saveSettings({ ...DEFAULT_SETTINGS, masteryThreshold: 2 })
    renderPage()

    expect(
      valueOf(
        screen.getByRole('region', { name: 'Mistakes' }),
        'Mistakes mastered',
      ),
    ).toBe('1')
  })

  it('shows friendly messages instead of mistake data when nothing has been missed', () => {
    recordPracticeAttempt(makeAttempt({ selfReportedCorrect: true }))
    renderPage()

    const section = screen.getByRole('region', { name: 'Mistakes' })
    expect(valueOf(section, 'Mistakes to practise')).toBe('0')
    expect(
      within(
        screen.getByRole('region', { name: 'Where you miss most' }),
      ).getByRole('heading', {
        name: 'No mistakes yet',
      }),
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole('region', { name: 'Your mistakes' })).getByText(
        /No mistakes yet/,
      ),
    ).toBeInTheDocument()
  })

  it('clears the mistake sections when the statistics are reset', async () => {
    seedMistakes()
    const user = userEvent.setup()
    renderPage()
    expect(
      screen.getByRole('list', { name: 'Mistakes to practise' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reset Statistics' }))
    await user.click(
      screen.getByRole('button', { name: 'Yes, Erase Everything' }),
    )

    expect(screen.queryByRole('region', { name: 'Mistakes' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Your mistakes' })).toBeNull()
    expect(loadMistakePatterns()).toEqual([])
    expect(
      screen.getByRole('heading', { name: 'No practice yet' }),
    ).toBeInTheDocument()
  })
})

describe('Resetting statistics', () => {
  const question =
    'Are you sure you want to erase all practice history and statistics?'

  it('asks for confirmation first, using the wording from the specification', async () => {
    seedPractice()
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Reset Statistics' }))

    const dialog = screen.getByRole('alertdialog', {
      name: 'Reset statistics?',
    })
    expect(dialog).toHaveAccessibleDescription(question)
    expect(
      within(dialog).getByRole('button', { name: 'Keep My Statistics' }),
    ).toHaveFocus()
    // Nothing has been erased yet.
    expect(loadStatistics().attempted).toBe(5)
  })

  it('keeps everything if the student cancels', async () => {
    seedPractice()
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Reset Statistics' }))
    await user.click(screen.getByRole('button', { name: 'Keep My Statistics' }))

    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(
      screen.getByRole('button', { name: 'Reset Statistics' }),
    ).toBeInTheDocument()
    expect(loadStatistics().attempted).toBe(5)
    expect(loadSessions()).toHaveLength(2)
  })

  it('does not erase anything if Escape is pressed', async () => {
    seedPractice()
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Reset Statistics' }))
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(loadStatistics().attempted).toBe(5)
  })

  it('needs an explicit confirmation to erase everything', async () => {
    seedPractice()
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Reset Statistics' }))
    await user.click(
      screen.getByRole('button', { name: 'Yes, Erase Everything' }),
    )

    expect(loadStatistics().attempted).toBe(0)
    expect(loadAttempts()).toEqual([])
    expect(loadSessions()).toEqual([])
  })

  it('refreshes the page after erasing, and says it was done', async () => {
    seedPractice()
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Reset Statistics' }))
    await user.click(
      screen.getByRole('button', { name: 'Yes, Erase Everything' }),
    )

    expect(
      screen.getByRole('heading', { name: 'No practice yet' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      'All practice history and statistics have been erased.',
    )
    expect(screen.queryByRole('region', { name: 'Overall' })).toBeNull()
    expect(
      screen.queryByRole('button', { name: 'Reset Statistics' }),
    ).toBeNull()
  })

  it('leaves the settings as they were', async () => {
    seedPractice()
    saveSettings({
      ...DEFAULT_SETTINGS,
      soundEnabled: false,
      masteryThreshold: 6,
    })
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Reset Statistics' }))
    await user.click(
      screen.getByRole('button', { name: 'Yes, Erase Everything' }),
    )

    expect(loadSettings().settings).toMatchObject({
      soundEnabled: false,
      masteryThreshold: 6,
    })
  })

  it('lets practice start counting again after a reset', async () => {
    seedPractice()
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Reset Statistics' }))
    await user.click(
      screen.getByRole('button', { name: 'Yes, Erase Everything' }),
    )

    recordAttempt(makeAttempt())
    expect(loadStatistics().attempted).toBe(1)
  })

  it('tells the student if the browser would not let the data be erased', async () => {
    seedPractice()
    const user = userEvent.setup()
    renderPage()
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })

    await user.click(screen.getByRole('button', { name: 'Reset Statistics' }))
    await user.click(
      screen.getByRole('button', { name: 'Yes, Erase Everything' }),
    )

    expect(screen.getByRole('status')).toHaveTextContent(
      "We couldn't erase everything",
    )
    // The data is still there, so it is still shown.
    expect(
      valueOf(
        screen.getByRole('region', { name: 'Overall' }),
        'Questions attempted',
      ),
    ).toBe('5')
  })
})
