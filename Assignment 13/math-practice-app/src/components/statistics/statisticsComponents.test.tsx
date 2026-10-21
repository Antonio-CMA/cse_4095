import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AccuracyValue } from '../common/AccuracyValue'
import { EmptyState } from '../common/EmptyState'
import { makeAttempt, makeResult } from '../../test/sessionResult'
import {
  createEmptyStatistics,
  statisticsFromAttempts,
} from '../../services/statisticsService'
import { DifficultyBreakdown } from './DifficultyBreakdown'
import { OperationBreakdown } from './OperationBreakdown'
import { RecentSessions } from './RecentSessions'
import { StatCard } from './StatCard'
import { StatisticsOverview } from './StatisticsOverview'

/** The value shown next to a label inside some container. */
function valueOf(container: HTMLElement, label: string) {
  const term = within(container).getByText(label, { selector: 'dt' })
  return (term.nextElementSibling as HTMLElement).textContent
}

describe('AccuracyValue', () => {
  it('shows a percentage', () => {
    render(<AccuracyValue accuracy={67} />)
    expect(screen.getByText('67%')).toBeInTheDocument()
  })

  it('shows a dash with a spoken explanation when there is no accuracy', () => {
    const { container } = render(<AccuracyValue accuracy={null} />)
    expect(container).toHaveTextContent('No questions answered')
    expect(container).not.toHaveTextContent('NaN')
    expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent(
      '—',
    )
  })

  it('accepts a different spoken explanation', () => {
    render(<AccuracyValue accuracy={null} emptyLabel="Nothing yet" />)
    expect(screen.getByText('Nothing yet')).toBeInTheDocument()
  })

  it('shows 0% as a real value, not as empty', () => {
    render(<AccuracyValue accuracy={0} />)
    expect(screen.getByText('0%')).toBeInTheDocument()
  })
})

describe('EmptyState', () => {
  it('shows a title, a message and anything passed in', () => {
    render(
      <EmptyState title="Nothing here" message="Come back later.">
        <button>Do something</button>
      </EmptyState>,
    )
    expect(
      screen.getByRole('heading', { name: 'Nothing here' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Come back later.')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Do something' }),
    ).toBeInTheDocument()
  })
})

describe('StatCard', () => {
  it('shows attempted, correct, incorrect and accuracy', () => {
    render(
      <StatCard
        title="Addition"
        counts={{ attempted: 8, correct: 6, incorrect: 2 }}
      />,
    )
    const card = screen.getByRole('article', { name: 'Addition' })
    expect(valueOf(card, 'Attempted')).toBe('8')
    expect(valueOf(card, 'Correct')).toBe('6')
    expect(valueOf(card, 'Incorrect')).toBe('2')
    expect(valueOf(card, 'Accuracy')).toBe('75%')
  })

  it('shows zeros and a dash rather than NaN when nothing was attempted', () => {
    render(
      <StatCard
        title="Division"
        counts={{ attempted: 0, correct: 0, incorrect: 0 }}
      />,
    )
    const card = screen.getByRole('article', { name: 'Division' })
    expect(valueOf(card, 'Attempted')).toBe('0')
    expect(card).not.toHaveTextContent('NaN')
    expect(valueOf(card, 'Accuracy')).toContain('No questions answered')
  })
})

describe('StatisticsOverview', () => {
  it('shows the overall totals and accuracy', () => {
    const stats = statisticsFromAttempts([
      makeAttempt({ selfReportedCorrect: true }),
      makeAttempt({ selfReportedCorrect: true }),
      makeAttempt({ selfReportedCorrect: true }),
      makeAttempt({ selfReportedCorrect: false }),
    ])
    render(<StatisticsOverview statistics={stats} />)

    const overall = screen.getByRole('region', { name: 'Overall' })
    expect(valueOf(overall, 'Questions attempted')).toBe('4')
    expect(valueOf(overall, 'Correct')).toBe('3')
    expect(valueOf(overall, 'Incorrect')).toBe('1')
    expect(valueOf(overall, 'Accuracy')).toBe('75%')
  })

  it('handles zero attempts without dividing by zero', () => {
    render(<StatisticsOverview statistics={createEmptyStatistics()} />)
    const overall = screen.getByRole('region', { name: 'Overall' })
    expect(valueOf(overall, 'Questions attempted')).toBe('0')
    expect(overall).not.toHaveTextContent('NaN')
  })
})

describe('OperationBreakdown', () => {
  it('has one card per operation with its own numbers', () => {
    const stats = statisticsFromAttempts([
      makeAttempt({ operation: 'addition', selfReportedCorrect: true }),
      makeAttempt({ operation: 'addition', selfReportedCorrect: false }),
      makeAttempt({ operation: 'division', selfReportedCorrect: true }),
    ])
    render(<OperationBreakdown statistics={stats} />)

    const section = screen.getByRole('region', { name: 'By operation' })
    expect(within(section).getAllByRole('article')).toHaveLength(4)
    expect(
      within(section)
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(['Addition', 'Subtraction', 'Multiplication', 'Division'])

    const addition = within(section).getByRole('article', { name: 'Addition' })
    expect(valueOf(addition, 'Attempted')).toBe('2')
    expect(valueOf(addition, 'Accuracy')).toBe('50%')
    const division = within(section).getByRole('article', { name: 'Division' })
    expect(valueOf(division, 'Accuracy')).toBe('100%')
    const subtraction = within(section).getByRole('article', {
      name: 'Subtraction',
    })
    expect(valueOf(subtraction, 'Attempted')).toBe('0')
  })
})

describe('DifficultyBreakdown', () => {
  it('has one clearly labelled card per level', () => {
    const stats = statisticsFromAttempts([
      makeAttempt({ difficulty: 2, selfReportedCorrect: true }),
      makeAttempt({ difficulty: 4, selfReportedCorrect: false }),
    ])
    render(<DifficultyBreakdown statistics={stats} />)

    const section = screen.getByRole('region', { name: 'By level' })
    expect(
      within(section)
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent),
    ).toEqual([
      'Level 1: Beginner',
      'Level 2: Easy',
      'Level 3: Intermediate',
      'Level 4: Advanced',
    ])
    const easy = within(section).getByRole('article', { name: 'Level 2: Easy' })
    expect(valueOf(easy, 'Correct')).toBe('1')
    const advanced = within(section).getByRole('article', {
      name: 'Level 4: Advanced',
    })
    expect(valueOf(advanced, 'Incorrect')).toBe('1')
    const beginner = within(section).getByRole('article', {
      name: 'Level 1: Beginner',
    })
    expect(valueOf(beginner, 'Attempted')).toBe('0')
  })
})

describe('RecentSessions', () => {
  const sessions = [
    makeResult([true, true, false], {
      id: 'newer',
      startedAt: '2026-03-02T09:30:00.000Z',
      operations: ['multiplication', 'division'],
      difficulty: 3,
    }).session,
    makeResult([true, false], {
      id: 'older',
      startedAt: '2026-03-01T09:30:00.000Z',
      operations: ['addition'],
      difficulty: 1,
    }).session,
  ]

  it('lists each session with its operations, level and results', () => {
    render(<RecentSessions sessions={sessions} />)

    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)

    expect(items[0]).toHaveTextContent('Multiplication and Division')
    expect(items[0]).toHaveTextContent('Level 3: Intermediate')
    expect(valueOf(items[0], 'Attempted')).toBe('3')
    expect(valueOf(items[0], 'Correct')).toBe('2')
    expect(valueOf(items[0], 'Incorrect')).toBe('1')
    expect(valueOf(items[0], 'Accuracy')).toBe('67%')

    expect(items[1]).toHaveTextContent('Addition')
    expect(valueOf(items[1], 'Accuracy')).toBe('50%')
  })

  it('shows the date and time of each session', () => {
    render(<RecentSessions sessions={sessions} />)
    const times = document.querySelectorAll('time')
    expect(times).toHaveLength(2)
    expect(times[0]).toHaveAttribute('datetime', '2026-03-02T09:30:00.000Z')
    expect(times[0].textContent).toMatch(/2026/)
  })

  it('keeps the order it was given (newest first)', () => {
    render(<RecentSessions sessions={sessions} />)
    const dates = [...document.querySelectorAll('time')].map((t) =>
      t.getAttribute('datetime'),
    )
    expect(dates).toEqual([
      '2026-03-02T09:30:00.000Z',
      '2026-03-01T09:30:00.000Z',
    ])
  })

  it('shows a friendly message when there are no sessions', () => {
    render(<RecentSessions sessions={[]} />)
    expect(screen.getByText(/No sessions yet/)).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('handles a session where nothing was answered', () => {
    render(
      <RecentSessions sessions={[makeResult([], { id: 'empty' }).session]} />,
    )
    const item = screen.getByRole('listitem')
    expect(valueOf(item, 'Accuracy')).toContain('No questions answered')
    expect(item).not.toHaveTextContent('NaN')
  })
})
