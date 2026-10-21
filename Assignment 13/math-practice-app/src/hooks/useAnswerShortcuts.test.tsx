import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { isTypingTarget, useAnswerShortcuts } from './useAnswerShortcuts'

function Harness({
  enabled = true,
  count = 4,
  onSelect,
}: {
  enabled?: boolean
  count?: number
  onSelect: (index: number) => void
}) {
  useAnswerShortcuts({ enabled, count, onSelect })
  return (
    <div>
      <input aria-label="name" />
      <textarea aria-label="notes" />
      <select aria-label="pick">
        <option>a</option>
      </select>
      <div
        contentEditable
        suppressContentEditableWarning
        tabIndex={0}
        data-testid="editable"
      >
        text
      </div>
      <button>a button</button>
    </div>
  )
}

describe('useAnswerShortcuts', () => {
  it('chooses the answer for keys 1 to 4 (zero-based positions)', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<Harness onSelect={onSelect} />)

    await user.keyboard('1234')
    expect(onSelect.mock.calls.map((c) => c[0])).toEqual([0, 1, 2, 3])
  })

  it('ignores keys beyond the number of answers, and other keys', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<Harness count={3} onSelect={onSelect} />)

    await user.keyboard('4590abc ')
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('works with the number pad too (it reports the same digit)', () => {
    const onSelect = vi.fn()
    render(<Harness onSelect={onSelect} />)

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: '2', code: 'Numpad2' }),
    )
    expect(onSelect).toHaveBeenCalledWith(1)
  })

  it('does nothing while turned off', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<Harness enabled={false} onSelect={onSelect} />)

    await user.keyboard('123')
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('starts and stops listening as it is turned on and off', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const { rerender } = render(<Harness enabled={false} onSelect={onSelect} />)

    rerender(<Harness enabled onSelect={onSelect} />)
    await user.keyboard('1')
    expect(onSelect).toHaveBeenCalledTimes(1)

    rerender(<Harness enabled={false} onSelect={onSelect} />)
    await user.keyboard('2')
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('stops listening when the component goes away', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const { unmount } = render(<Harness onSelect={onSelect} />)
    unmount()

    await user.keyboard('1')
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('does not get in the way of typing in a field', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<Harness onSelect={onSelect} />)

    await user.click(screen.getByLabelText('name'))
    await user.keyboard('1234')
    expect(screen.getByLabelText('name')).toHaveValue('1234')

    await user.click(screen.getByLabelText('notes'))
    await user.keyboard('2')
    expect(screen.getByLabelText('notes')).toHaveValue('2')

    screen.getByLabelText('pick').focus()
    await user.keyboard('3')
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('does not get in the way of an editable area', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<Harness onSelect={onSelect} />)

    const editable = screen.getByTestId('editable')
    // jsdom does not compute isContentEditable, so state it as a browser would.
    Object.defineProperty(editable, 'isContentEditable', { value: true })
    editable.focus()
    await user.keyboard('1')
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('leaves browser shortcuts such as Ctrl+1 and Alt+2 alone', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<Harness onSelect={onSelect} />)

    await user.keyboard('{Control>}1{/Control}')
    await user.keyboard('{Alt>}2{/Alt}')
    await user.keyboard('{Meta>}3{/Meta}')
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('ignores a held-down key repeating', () => {
    const onSelect = vi.fn()
    render(<Harness onSelect={onSelect} />)

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: '1', repeat: true }),
    )
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('works while a button has focus', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<Harness onSelect={onSelect} />)

    screen.getByRole('button', { name: 'a button' }).focus()
    await user.keyboard('2')
    expect(onSelect).toHaveBeenCalledWith(1)
  })

  it('stops the key from also doing something else', () => {
    render(<Harness onSelect={() => {}} />)
    const event = new KeyboardEvent('keydown', { key: '1', cancelable: true })
    document.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })
})

describe('isTypingTarget', () => {
  it('is true for fields and false for everything else', () => {
    expect(isTypingTarget(document.createElement('input'))).toBe(true)
    expect(isTypingTarget(document.createElement('textarea'))).toBe(true)
    expect(isTypingTarget(document.createElement('select'))).toBe(true)
    expect(isTypingTarget(document.createElement('button'))).toBe(false)
    expect(isTypingTarget(document.createElement('div'))).toBe(false)
    expect(isTypingTarget(document.body)).toBe(false)
    expect(isTypingTarget(null)).toBe(false)
    expect(isTypingTarget(window)).toBe(false)
  })
})
