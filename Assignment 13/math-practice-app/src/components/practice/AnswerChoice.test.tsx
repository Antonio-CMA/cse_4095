import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AnswerChoice } from './AnswerChoice'

describe('AnswerChoice', () => {
  it('shows the value as a button that reports its selected state', () => {
    const { rerender } = render(
      <AnswerChoice value={56} selected={false} onSelect={() => {}} />,
    )
    expect(screen.getByRole('button', { name: '56' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )

    rerender(<AnswerChoice value={56} selected onSelect={() => {}} />)
    expect(screen.getByRole('button', { name: '56' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('calls onSelect with its value when clicked', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<AnswerChoice value={42} selected={false} onSelect={onSelect} />)

    await user.click(screen.getByRole('button', { name: '42' }))
    expect(onSelect).toHaveBeenCalledWith(42)
  })

  it('can be chosen with the keyboard', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<AnswerChoice value={7} selected={false} onSelect={onSelect} />)

    await user.tab()
    await user.keyboard('{Enter}')
    expect(onSelect).toHaveBeenCalledWith(7)
  })

  it('does nothing when disabled', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <AnswerChoice value={7} selected={false} disabled onSelect={onSelect} />,
    )

    await user.click(screen.getByRole('button', { name: '7' }))
    expect(onSelect).not.toHaveBeenCalled()
  })
})
