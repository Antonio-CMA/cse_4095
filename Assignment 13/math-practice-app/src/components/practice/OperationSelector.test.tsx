import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { MathOperation } from '../../types/question'
import { OperationSelector } from './OperationSelector'

function Harness({
  initial = [],
  onChange,
}: {
  initial?: MathOperation[]
  onChange?: (ops: MathOperation[]) => void
}) {
  const [value, setValue] = useState<MathOperation[]>(initial)
  return (
    <OperationSelector
      value={value}
      onChange={(ops) => {
        setValue(ops)
        onChange?.(ops)
      }}
    />
  )
}

describe('OperationSelector', () => {
  it('offers all four operations, unselected by default', () => {
    render(<Harness />)
    for (const name of [
      'Addition',
      'Subtraction',
      'Multiplication',
      'Division',
    ]) {
      expect(screen.getByRole('checkbox', { name })).not.toBeChecked()
    }
  })

  it('allows more than one operation and keeps a canonical order', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)

    await user.click(screen.getByRole('checkbox', { name: 'Division' }))
    await user.click(screen.getByRole('checkbox', { name: 'Addition' }))

    expect(onChange).toHaveBeenLastCalledWith(['addition', 'division'])
    expect(screen.getByRole('checkbox', { name: 'Addition' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Division' })).toBeChecked()
  })

  it('can deselect an operation', async () => {
    const user = userEvent.setup()
    render(<Harness initial={['addition']} />)

    await user.click(screen.getByRole('checkbox', { name: 'Addition' }))
    expect(screen.getByRole('checkbox', { name: 'Addition' })).not.toBeChecked()
  })

  it('selects and clears every operation with the shortcut button', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Select all (mixed)' }))
    expect(
      screen
        .getAllByRole('checkbox')
        .every((c) => (c as HTMLInputElement).checked),
    ).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Clear all' }))
    expect(
      screen
        .getAllByRole('checkbox')
        .some((c) => (c as HTMLInputElement).checked),
    ).toBe(false)
  })

  it('can be operated with the keyboard', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.tab()
    expect(screen.getByRole('checkbox', { name: 'Addition' })).toHaveFocus()
    await user.keyboard(' ')
    expect(screen.getByRole('checkbox', { name: 'Addition' })).toBeChecked()
  })
})
