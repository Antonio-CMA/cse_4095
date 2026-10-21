import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import type { DifficultyLevel } from '../../types/question'
import { DifficultySelector } from './DifficultySelector'

function Harness({ initial = 1 }: { initial?: DifficultyLevel }) {
  const [value, setValue] = useState<DifficultyLevel>(initial)
  return <DifficultySelector value={value} onChange={setValue} />
}

describe('DifficultySelector', () => {
  it('shows the four levels with descriptions, with one selected', () => {
    render(<Harness initial={2} />)

    const names = ['Beginner', 'Easy', 'Intermediate', 'Advanced']
    for (const name of names) {
      expect(screen.getByRole('radio', { name })).toBeInTheDocument()
    }
    expect(screen.getByRole('radio', { name: 'Easy' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Beginner' })).not.toBeChecked()
    expect(
      screen.getByRole('radio', { name: 'Beginner' }),
    ).toHaveAccessibleDescription(/small numbers up to 10/i)
  })

  it('allows only one level at a time', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('radio', { name: 'Advanced' }))
    expect(screen.getByRole('radio', { name: 'Advanced' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Beginner' })).not.toBeChecked()
  })
})
