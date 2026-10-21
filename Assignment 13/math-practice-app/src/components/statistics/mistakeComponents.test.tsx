import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { createEmptyStatistics } from '../../services/statisticsService'
import { makePattern } from '../../test/mistakePatterns'
import type { MistakePattern } from '../../types/mistake'
import type { AppStatistics } from '../../types/statistics'
import { FrequentlyMissed } from './FrequentlyMissed'
import { MistakeDetails } from './MistakeDetails'
import { MistakeStatistics } from './MistakeStatistics'

const THRESHOLD = 3
const at = (day: number) => new Date(Date.UTC(2026, 2, day, 12)).toISOString()

function pattern(
  first: number,
  misses: number,
  extra: Partial<MistakePattern> = {},
  op: 'multiplication' | 'addition' = 'multiplication',
) {
  return makePattern(op, first, 7, 2, {
    incorrectCount: misses,
    lastIncorrectAt: at(1),
    ...extra,
  })
}

function stats(
  review = { attempted: 0, correct: 0, incorrect: 0 },
  misses: Partial<
    Record<'addition' | 'subtraction' | 'multiplication' | 'division', number>
  > = {},
): AppStatistics {
  const s = createEmptyStatistics()
  s.review = review
  for (const [op, n] of Object.entries(misses)) {
    s.byOperation[op as keyof AppStatistics['byOperation']] = {
      attempted: n!,
      correct: 0,
      incorrect: n!,
    }
  }
  return s
}

const valueOf = (container: HTMLElement, label: string) =>
  (
    within(container).getByText(label, { selector: 'dt' })
      .nextElementSibling as HTMLElement
  ).textContent

describe('MistakeStatistics', () => {
  const region = () => screen.getByRole('region', { name: 'Mistakes' })

  it('shows how many mistakes need practice and how many are mastered', () => {
    render(
      <MistakeStatistics
        statistics={stats()}
        masteryThreshold={THRESHOLD}
        patterns={[
          pattern(1, 1),
          pattern(2, 1, { similarCorrectCount: 2 }),
          pattern(3, 1, { mastered: true }),
          pattern(4, 1, { similarCorrectCount: 3 }),
        ]}
      />,
    )
    expect(valueOf(region(), 'Mistakes to practise')).toBe('2')
    expect(valueOf(region(), 'Mistakes mastered')).toBe('2')
  })

  it('shows the review practice totals', () => {
    render(
      <MistakeStatistics
        statistics={stats({ attempted: 12, correct: 9, incorrect: 3 })}
        masteryThreshold={THRESHOLD}
        patterns={[]}
      />,
    )
    expect(valueOf(region(), 'Similar questions practised')).toBe('12')
    expect(valueOf(region(), 'Review questions answered correctly')).toBe('9')
  })

  it('shows zeros, not blanks or NaN, when there is nothing yet', () => {
    render(
      <MistakeStatistics
        statistics={stats()}
        masteryThreshold={THRESHOLD}
        patterns={[]}
      />,
    )
    for (const label of [
      'Mistakes to practise',
      'Mistakes mastered',
      'Similar questions practised',
      'Review questions answered correctly',
    ]) {
      expect(valueOf(region(), label)).toBe('0')
    }
  })

  it('follows the mastery setting', () => {
    const patterns = [pattern(1, 1, { similarCorrectCount: 2 })]
    const { rerender } = render(
      <MistakeStatistics
        statistics={stats()}
        masteryThreshold={3}
        patterns={patterns}
      />,
    )
    expect(valueOf(region(), 'Mistakes mastered')).toBe('0')

    rerender(
      <MistakeStatistics
        statistics={stats()}
        masteryThreshold={2}
        patterns={patterns}
      />,
    )
    expect(valueOf(region(), 'Mistakes mastered')).toBe('1')
  })
})

describe('FrequentlyMissed', () => {
  const region = () =>
    screen.getByRole('region', { name: 'Where you miss most' })

  it('names the operation you miss most', () => {
    render(
      <FrequentlyMissed
        statistics={stats(undefined, { addition: 2, division: 6 })}
        patterns={[]}
      />,
    )
    expect(within(region()).getByText('Division')).toBeInTheDocument()
    expect(within(region()).getByText('Missed 6 times')).toBeInTheDocument()
  })

  it('shows every operation when there is a tie', () => {
    render(
      <FrequentlyMissed
        statistics={stats(undefined, {
          addition: 3,
          subtraction: 3,
          division: 1,
        })}
        patterns={[]}
      />,
    )
    expect(
      within(region()).getByText('Addition and Subtraction'),
    ).toBeInTheDocument()
    expect(within(region()).getByText('3 times each')).toBeInTheDocument()
  })

  it('says "1 time" for a single miss', () => {
    render(
      <FrequentlyMissed
        statistics={stats(undefined, { division: 1 })}
        patterns={[]}
      />,
    )
    expect(within(region()).getByText('Missed 1 time')).toBeInTheDocument()
  })

  it('lists the number facts missed most, most first, with how often', () => {
    render(
      <FrequentlyMissed
        statistics={stats(undefined, { multiplication: 9 })}
        patterns={[pattern(8, 2), pattern(9, 5), pattern(6, 3)]}
      />,
    )
    const items = within(region()).getAllByRole('listitem')
    expect(items.map((li) => li.textContent)).toEqual([
      '9 × 7 = 63missed 5 times',
      '6 × 7 = 42missed 3 times',
      '8 × 7 = 56missed 2 times',
    ])
  })

  it('shows at most five facts', () => {
    const patterns = Array.from({ length: 9 }, (_, i) => pattern(i + 1, i + 1))
    render(
      <FrequentlyMissed
        statistics={stats(undefined, { multiplication: 5 })}
        patterns={patterns}
      />,
    )
    expect(within(region()).getAllByRole('listitem')).toHaveLength(5)
  })

  it('orders tied facts by how recently they were missed', () => {
    render(
      <FrequentlyMissed
        statistics={stats(undefined, { multiplication: 6 })}
        patterns={[
          pattern(1, 3, { lastIncorrectAt: at(1) }),
          pattern(2, 3, { lastIncorrectAt: at(9) }),
        ]}
      />,
    )
    const items = within(region()).getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('2 × 7 = 14')
  })

  it('shows a friendly empty message when nothing has been missed', () => {
    render(<FrequentlyMissed statistics={stats()} patterns={[]} />)
    expect(
      within(region()).getByRole('heading', { name: 'No mistakes yet' }),
    ).toBeInTheDocument()
    expect(within(region()).queryByRole('list')).toBeNull()
  })

  it('still shows the facts if only they exist, and the operation if only that exists', () => {
    const { unmount } = render(
      <FrequentlyMissed statistics={stats()} patterns={[pattern(8, 2)]} />,
    )
    expect(within(region()).queryByText('Operation you miss most')).toBeNull()
    expect(within(region()).getByText(/8 × 7 = 56/)).toBeInTheDocument()
    unmount()

    render(
      <FrequentlyMissed
        statistics={stats(undefined, { division: 2 })}
        patterns={[]}
      />,
    )
    expect(
      within(region()).getByText('Operation you miss most'),
    ).toBeInTheDocument()
    expect(
      within(region()).queryByText('Number facts you miss most'),
    ).toBeNull()
  })
})

describe('MistakeDetails', () => {
  const region = () => screen.getByRole('region', { name: 'Your mistakes' })

  it('shows a friendly message when there are no mistakes', () => {
    render(<MistakeDetails patterns={[]} masteryThreshold={THRESHOLD} />)
    expect(within(region()).getByText(/No mistakes yet/)).toBeInTheDocument()
  })

  it('lists the active mistakes with level, miss count and last-missed date', () => {
    render(
      <MistakeDetails
        masteryThreshold={THRESHOLD}
        patterns={[pattern(8, 4, { lastIncorrectAt: at(5) })]}
      />,
    )
    const item = within(
      screen.getByRole('list', { name: 'Mistakes to practise' }),
    ).getByRole('listitem')

    expect(item).toHaveTextContent('8 × 7 = 56')
    expect(item).toHaveTextContent('Level 2: Easy')
    expect(item).toHaveTextContent('Missed 4 times')
    expect(item).toHaveTextContent(/Last missed .*2026/)
    expect(item.querySelector('time')).toHaveAttribute('datetime', at(5))
  })

  it('says "Missed 1 time" for a single miss', () => {
    render(
      <MistakeDetails
        patterns={[pattern(8, 1)]}
        masteryThreshold={THRESHOLD}
      />,
    )
    expect(within(region()).getByText(/Missed 1 time\b/)).toBeInTheDocument()
  })

  it('shows mastery progress towards the threshold', () => {
    render(
      <MistakeDetails
        masteryThreshold={THRESHOLD}
        patterns={[pattern(8, 2, { similarCorrectCount: 1 })]}
      />,
    )
    const bar = screen.getByRole('progressbar', {
      name: 'Review progress for 8 × 7 = 56',
    })
    expect(bar).toHaveAttribute('value', '1')
    expect(bar).toHaveAttribute('max', '3')
    expect(screen.getByText('1 of 3 right in review')).toBeInTheDocument()
  })

  it('shows no progress for a mistake that has not been reviewed', () => {
    render(
      <MistakeDetails
        patterns={[pattern(8, 2)]}
        masteryThreshold={THRESHOLD}
      />,
    )
    expect(screen.getByText('0 of 3 right in review')).toBeInTheDocument()
  })

  it('lists the most missed mistake first', () => {
    render(
      <MistakeDetails
        masteryThreshold={THRESHOLD}
        patterns={[pattern(1, 2), pattern(2, 7), pattern(3, 4)]}
      />,
    )
    const items = within(
      screen.getByRole('list', { name: 'Mistakes to practise' }),
    ).getAllByRole('listitem')
    expect(
      items.map((li) => li.querySelector('.mistake-item__fact')?.textContent),
    ).toEqual(['2 × 7 = 14', '3 × 7 = 21', '1 × 7 = 7'])
  })

  it('keeps mastered mistakes out of the main list, in a section of their own', async () => {
    const user = userEvent.setup()
    render(
      <MistakeDetails
        masteryThreshold={THRESHOLD}
        patterns={[
          pattern(1, 2),
          pattern(2, 9, { mastered: true }),
          pattern(3, 3, { similarCorrectCount: 3 }),
        ]}
      />,
    )

    const active = screen.getByRole('list', { name: 'Mistakes to practise' })
    expect(within(active).getAllByRole('listitem')).toHaveLength(1)

    const summary = screen.getByText('Mastered mistakes (2)')
    const details = summary.closest('details') as HTMLDetailsElement
    expect(details.open).toBe(false)

    await user.click(summary)
    expect(details.open).toBe(true)
    const mastered = within(details).getByRole('list', {
      name: 'Mastered mistakes',
    })
    const items = within(mastered).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('2 × 7 = 14') // most missed first
    expect(items[0]).toHaveTextContent('Mastered ✓')
    expect(within(items[0]).queryByRole('progressbar')).toBeNull()
  })

  it('congratulates the student when every mistake is mastered', () => {
    render(
      <MistakeDetails
        patterns={[pattern(1, 2, { mastered: true })]}
        masteryThreshold={THRESHOLD}
      />,
    )
    expect(
      within(region()).getByText(/mastered every mistake/i),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('list', { name: 'Mistakes to practise' }),
    ).toBeNull()
    expect(screen.getByText('Mastered mistakes (1)')).toBeInTheDocument()
  })

  it('has no mastered section when nothing is mastered', () => {
    render(
      <MistakeDetails
        patterns={[pattern(1, 2)]}
        masteryThreshold={THRESHOLD}
      />,
    )
    expect(screen.queryByText(/Mastered mistakes/)).toBeNull()
  })

  it('moves a mistake to the mastered section when the setting is lowered', () => {
    const patterns = [pattern(1, 2, { similarCorrectCount: 2 })]
    const { rerender } = render(
      <MistakeDetails patterns={patterns} masteryThreshold={3} />,
    )
    expect(screen.queryByText(/Mastered mistakes/)).toBeNull()

    rerender(<MistakeDetails patterns={patterns} masteryThreshold={2} />)
    expect(screen.getByText('Mastered mistakes (1)')).toBeInTheDocument()
  })

  it('works for every operation', () => {
    render(
      <MistakeDetails
        masteryThreshold={THRESHOLD}
        patterns={[
          makePattern('addition', 4, 5, 1, { incorrectCount: 1 }),
          makePattern('division', 56, 7, 3, { incorrectCount: 1 }),
        ]}
      />,
    )
    expect(within(region()).getByText('4 + 5 = 9')).toBeInTheDocument()
    expect(within(region()).getByText('56 ÷ 7 = 8')).toBeInTheDocument()
  })
})
