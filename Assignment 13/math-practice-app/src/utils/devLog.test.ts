import { describe, expect, it, vi } from 'vitest'
import { logDevError } from './devLog'

describe('logDevError', () => {
  it('writes the message to the console, marked as from this app', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    logDevError('Something odd happened.')
    expect(error).toHaveBeenCalledWith(
      '[Math Practice] Something odd happened.',
    )
  })

  it('includes the details for the developer', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const details = { operation: 'division', level: 3 }
    logDevError('Could not make a question.', details)
    expect(error).toHaveBeenCalledWith(
      '[Math Practice] Could not make a question.',
      details,
    )
  })

  it('stays silent in a built copy of the app', () => {
    vi.stubEnv('DEV', false)
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    logDevError('Not for students.', { secret: true })
    expect(error).not.toHaveBeenCalled()
    vi.unstubAllEnvs()
  })
})
