import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import type { ReviewMode } from '../../types/session'
import { ReviewModeSelector } from './ReviewModeSelector'

function Harness({ activeMistakeCount }: { activeMistakeCount: number }) {
  const [value, setValue] = useState<ReviewMode>('regular')
  return (
    <ReviewModeSelector
      value={value}
      onChange={setValue}
      activeMistakeCount={activeMistakeCount}
    />
  )
}

describe('ReviewModeSelector', () => {
  it('disables mistake review and explains why when there are no mistakes', () => {
    render(<Harness activeMistakeCount={0} />)

    const review = screen.getByRole('radio', { name: 'Practice my mistakes' })
    expect(review).toBeDisabled()
    expect(review).toHaveAccessibleDescription(/nothing to review yet/i)
    expect(
      screen.getByRole('radio', { name: 'Regular practice' }),
    ).toBeChecked()
  })

  it('enables mistake review and shows the count when there are mistakes', async () => {
    const user = userEvent.setup()
    render(<Harness activeMistakeCount={3} />)

    const review = screen.getByRole('radio', { name: 'Practice my mistakes' })
    expect(review).toBeEnabled()
    expect(review).toHaveAccessibleDescription('Review 3 questions you missed.')

    await user.click(review)
    expect(review).toBeChecked()
  })

  it('uses the singular for a single mistake', () => {
    render(<Harness activeMistakeCount={1} />)
    expect(
      screen.getByRole('radio', { name: 'Practice my mistakes' }),
    ).toHaveAccessibleDescription('Review 1 question you missed.')
  })
})
