import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import {
  dismissStorageFailure,
  reportStorageFailure,
} from '../../services/storageFailures'
import { STORAGE_MESSAGES } from '../../utils/storageMessages'
import { StorageWarning } from './StorageWarning'

describe('StorageWarning', () => {
  it('shows nothing while saving works', () => {
    render(<StorageWarning />)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it.each([
    ['unavailable', /isn't letting us save/],
    ['quota', /no room left/],
    ['error', /stopped us from saving/],
  ] as const)('explains a %s failure in simple words', (reason, words) => {
    render(<StorageWarning />)
    act(() => reportStorageFailure(reason))
    expect(screen.getByRole('status')).toHaveTextContent(words)
    expect(screen.getByRole('status')).toHaveTextContent('keep practicing')
  })

  it('has a message for every kind of failure, free of jargon', () => {
    for (const message of Object.values(STORAGE_MESSAGES)) {
      expect(message).not.toMatch(
        /localStorage|quota|exception|DOMException|stack|undefined/i,
      )
    }
  })

  it('can be closed, and stays closed for the same problem', async () => {
    const user = userEvent.setup()
    render(<StorageWarning />)
    act(() => reportStorageFailure('quota'))

    await user.click(screen.getByRole('button', { name: 'Got It' }))
    expect(screen.queryByRole('status')).toBeNull()

    act(() => reportStorageFailure('quota'))
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('comes back for a different problem', async () => {
    render(<StorageWarning />)
    act(() => {
      reportStorageFailure('quota')
      dismissStorageFailure()
    })
    expect(screen.queryByRole('status')).toBeNull()

    act(() => reportStorageFailure('unavailable'))
    expect(screen.getByRole('status')).toHaveTextContent(
      /isn't letting us save/,
    )
  })

  it('appears if the problem happened before it was shown', () => {
    reportStorageFailure('error')
    render(<StorageWarning />)
    expect(screen.getByRole('status')).toHaveTextContent(
      /stopped us from saving/,
    )
  })
})
