import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import type { SessionLength } from '../../types/session'
import { SessionLengthSelector } from './SessionLengthSelector'

function Harness({ initial = 10 }: { initial?: SessionLength }) {
  const [value, setValue] = useState<SessionLength>(initial)
  return <SessionLengthSelector value={value} onChange={setValue} />
}

describe('SessionLengthSelector', () => {
  it('offers 5, 10, 20 and continuous practice', () => {
    render(<Harness />)
    for (const name of [
      '5 questions',
      '10 questions',
      '20 questions',
      'Continuous practice',
    ]) {
      expect(screen.getByRole('radio', { name })).toBeInTheDocument()
    }
    expect(screen.getByRole('radio', { name: '10 questions' })).toBeChecked()
  })

  it('changes the selected length', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('radio', { name: 'Continuous practice' }))
    expect(
      screen.getByRole('radio', { name: 'Continuous practice' }),
    ).toBeChecked()
    expect(
      screen.getByRole('radio', { name: '10 questions' }),
    ).not.toBeChecked()
  })
})
