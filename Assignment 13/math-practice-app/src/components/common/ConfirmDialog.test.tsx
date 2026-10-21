import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from './ConfirmDialog'

function renderDialog() {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  render(
    <ConfirmDialog
      title="End this session?"
      message="You have answered 3 questions."
      confirmLabel="End Session"
      cancelLabel="Keep Practicing"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />,
  )
  return { onConfirm, onCancel }
}

describe('ConfirmDialog', () => {
  it('is announced with its title and message', () => {
    renderDialog()
    const dialog = screen.getByRole('alertdialog', {
      name: 'End this session?',
    })
    expect(dialog).toHaveAccessibleDescription('You have answered 3 questions.')
  })

  it('starts with focus on the safe (cancel) button', () => {
    renderDialog()
    expect(
      screen.getByRole('button', { name: 'Keep Practicing' }),
    ).toHaveFocus()
  })

  it('confirms and cancels with the buttons', async () => {
    const user = userEvent.setup()
    const { onConfirm, onCancel } = renderDialog()

    await user.click(screen.getByRole('button', { name: 'End Session' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Keep Practicing' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('cancels when Escape is pressed', async () => {
    const user = userEvent.setup()
    const { onConfirm, onCancel } = renderDialog()

    await user.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('does not confirm on a stray Enter press', async () => {
    const user = userEvent.setup()
    const { onConfirm, onCancel } = renderDialog()

    await user.keyboard('{Enter}')
    expect(onConfirm).not.toHaveBeenCalled()
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
