import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { makePattern } from '../../test/mistakePatterns'
import type { MistakePattern } from '../../types/mistake'
import { MistakeDetails, MISTAKES_PER_PAGE } from './MistakeDetails'

const THRESHOLD = 3

/** `count` different mistakes; the first is the most missed, the last the least. */
function mistakes(count: number, overrides: Partial<MistakePattern> = {}) {
  return Array.from({ length: count }, (_, i) =>
    makePattern('addition', 10 + i, 1, 1, {
      incorrectCount: count - i,
      ...overrides,
    }),
  )
}

const activeList = () =>
  screen.getByRole('list', { name: 'Mistakes to practise' })

describe('a long list of mistakes is shown a page at a time', () => {
  it('shows the first page, and says how many more there are', () => {
    render(
      <MistakeDetails patterns={mistakes(60)} masteryThreshold={THRESHOLD} />,
    )

    expect(within(activeList()).getAllByRole('listitem')).toHaveLength(
      MISTAKES_PER_PAGE,
    )
    expect(screen.getByText('Showing 25 of 60.')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Show 25 more' }),
    ).toBeInTheDocument()
  })

  it('adds a page each time, then names the smaller last page', async () => {
    const user = userEvent.setup()
    render(
      <MistakeDetails patterns={mistakes(60)} masteryThreshold={THRESHOLD} />,
    )

    await user.click(screen.getByRole('button', { name: 'Show 25 more' }))
    expect(within(activeList()).getAllByRole('listitem')).toHaveLength(50)
    expect(screen.getByText('Showing 50 of 60.')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Show 10 more' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show 10 more' }))
    expect(within(activeList()).getAllByRole('listitem')).toHaveLength(60)
  })

  it('stops offering more once everything is showing', async () => {
    const user = userEvent.setup()
    render(
      <MistakeDetails patterns={mistakes(30)} masteryThreshold={THRESHOLD} />,
    )

    await user.click(screen.getByRole('button', { name: 'Show 5 more' }))
    expect(screen.queryByRole('button', { name: /Show .* more/ })).toBeNull()
    expect(screen.getByText('Showing all 30.')).toBeInTheDocument()
  })

  it('keeps keyboard focus on the page when the button goes away', async () => {
    const user = userEvent.setup()
    render(
      <MistakeDetails patterns={mistakes(30)} masteryThreshold={THRESHOLD} />,
    )

    await user.tab() // the "Show 5 more" button, after the details are skipped
    const button = screen.getByRole('button', { name: 'Show 5 more' })
    button.focus()
    await user.keyboard('{Enter}')

    expect(screen.getByText('Showing all 30.')).toHaveFocus()
  })

  it('keeps focus on the button while there is more to show', async () => {
    const user = userEvent.setup()
    render(
      <MistakeDetails patterns={mistakes(80)} masteryThreshold={THRESHOLD} />,
    )

    const button = screen.getByRole('button', { name: 'Show 25 more' })
    button.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('button', { name: 'Show 25 more' })).toHaveFocus()
  })

  it('announces the new count politely', () => {
    render(
      <MistakeDetails patterns={mistakes(60)} masteryThreshold={THRESHOLD} />,
    )
    expect(screen.getByText('Showing 25 of 60.')).toHaveAttribute(
      'role',
      'status',
    )
  })

  it('keeps the most missed first, across pages', async () => {
    const user = userEvent.setup()
    render(
      <MistakeDetails patterns={mistakes(40)} masteryThreshold={THRESHOLD} />,
    )
    await user.click(screen.getByRole('button', { name: 'Show 15 more' }))

    const misses = within(activeList())
      .getAllByRole('listitem')
      .map((item) =>
        Number(/Missed (\d+) time/.exec(item.textContent ?? '')?.[1]),
      )
    expect(misses).toEqual([...misses].sort((a, b) => b - a))
    expect(misses[0]).toBe(40)
    expect(misses).toHaveLength(40)
  })

  it('adds nothing extra for a short list', () => {
    render(
      <MistakeDetails
        patterns={mistakes(MISTAKES_PER_PAGE)}
        masteryThreshold={THRESHOLD}
      />,
    )
    expect(within(activeList()).getAllByRole('listitem')).toHaveLength(25)
    expect(screen.queryByText(/Showing/)).toBeNull()
    expect(screen.queryByRole('button', { name: /more/ })).toBeNull()
  })

  it('pages the mastered mistakes on their own', async () => {
    const user = userEvent.setup()
    const patterns = [
      ...mistakes(30),
      ...mistakes(40, { mastered: true, firstOperand: 0 }).map((p, i) => ({
        ...p,
        id: `mastered-${i}`,
        firstOperand: 200 + i,
        correctAnswer: 201 + i,
      })),
    ]
    render(<MistakeDetails patterns={patterns} masteryThreshold={THRESHOLD} />)

    const mastered = screen.getByRole('list', {
      name: 'Mastered mistakes',
      hidden: true,
    })
    expect(
      within(mastered).getAllByRole('listitem', { hidden: true }),
    ).toHaveLength(25)
    expect(within(activeList()).getAllByRole('listitem')).toHaveLength(25)

    // Each list has its own button and count.
    expect(screen.getByText('Showing 25 of 30.')).toBeInTheDocument()
    expect(
      screen.getByText('Showing 25 of 40.', { exact: true }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Show 5 more' }))
    expect(within(activeList()).getAllByRole('listitem')).toHaveLength(30)
    expect(
      within(mastered).getAllByRole('listitem', { hidden: true }),
    ).toHaveLength(25)
  })

  it('starts the first page again when the mistakes change', () => {
    const { rerender } = render(
      <MistakeDetails patterns={mistakes(60)} masteryThreshold={THRESHOLD} />,
    )
    rerender(
      <MistakeDetails patterns={mistakes(10)} masteryThreshold={THRESHOLD} />,
    )
    expect(within(activeList()).getAllByRole('listitem')).toHaveLength(10)
    expect(screen.queryByText(/Showing/)).toBeNull()
  })
})
