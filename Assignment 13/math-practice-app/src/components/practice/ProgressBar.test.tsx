import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProgressBar } from './ProgressBar'

describe('ProgressBar', () => {
  it('exposes its value and range to assistive technology', () => {
    render(<ProgressBar value={3} max={10} label="Session progress" />)

    const bar = screen.getByRole('progressbar', { name: 'Session progress' })
    expect(bar).toHaveAttribute('value', '3')
    expect(bar).toHaveAttribute('max', '10')
  })

  it('updates when the value changes', () => {
    const { rerender } = render(
      <ProgressBar value={0} max={5} label="Session progress" />,
    )
    rerender(<ProgressBar value={4} max={5} label="Session progress" />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '4')
  })
})
