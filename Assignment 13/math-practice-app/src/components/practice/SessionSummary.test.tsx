import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { makeAttempt, makeResult } from '../../test/sessionResult'
import { SessionSummary } from './SessionSummary'

/** The value shown next to a label, e.g. valueOf('Correct') → '3'. */
function valueOf(label: string) {
  const term = screen.getByText(label, { selector: 'dt' })
  return within(term.parentElement as HTMLElement).getByText(
    (_, el) => el?.tagName === 'DD',
  )
}

describe('SessionSummary', () => {
  it('shows the totals and accuracy', () => {
    render(<SessionSummary result={makeResult([true, true, false, true])} />)

    expect(valueOf('Questions attempted')).toHaveTextContent('4')
    expect(valueOf('Correct')).toHaveTextContent('3')
    expect(valueOf('Incorrect')).toHaveTextContent('1')
    expect(valueOf('Accuracy')).toHaveTextContent('75%')
  })

  it('shows the operations practiced and the level', () => {
    render(
      <SessionSummary
        result={makeResult([true], {
          operations: ['division', 'addition', 'multiplication'],
          difficulty: 3,
        })}
      />,
    )

    expect(valueOf('Operations practiced')).toHaveTextContent(
      'Addition, Multiplication and Division',
    )
    expect(valueOf('Level')).toHaveTextContent('Level 3: Intermediate')
  })

  it('counts mistake-review questions', () => {
    const result = makeResult([true, false, true])
    result.attempts[0] = makeAttempt({ source: 'mistake-review' })
    result.attempts[2] = makeAttempt({ source: 'mistake-review' })

    render(<SessionSummary result={result} />)
    expect(valueOf('Mistake-review questions')).toHaveTextContent('2')
  })

  it('shows zero mistake-review questions for regular practice', () => {
    render(<SessionSummary result={makeResult([true, false])} />)
    expect(valueOf('Mistake-review questions')).toHaveTextContent('0')
  })

  it('handles a perfect and a completely wrong session', () => {
    const { unmount } = render(
      <SessionSummary result={makeResult([true, true])} />,
    )
    expect(valueOf('Accuracy')).toHaveTextContent('100%')
    unmount()

    render(<SessionSummary result={makeResult([false, false])} />)
    expect(valueOf('Accuracy')).toHaveTextContent('0%')
    expect(valueOf('Correct')).toHaveTextContent('0')
  })

  it('does not show NaN when nothing was answered', () => {
    render(<SessionSummary result={makeResult([])} />)

    expect(valueOf('Questions attempted')).toHaveTextContent('0')
    expect(valueOf('Accuracy')).toHaveTextContent('No questions answered')
    expect(valueOf('Accuracy')).not.toHaveTextContent('NaN')
  })
})
