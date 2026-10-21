import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ErrorMessage } from './ErrorMessage'

afterEach(() => vi.unstubAllEnvs())

describe('the safe way home when the site is hosted below a folder', () => {
  it('goes to the site root by default', () => {
    render(<ErrorMessage>x</ErrorMessage>)
    expect(screen.getByRole('link', { name: 'Go Home' })).toHaveAttribute(
      'href',
      '/',
    )
  })

  it("goes to the app's own home, not the top of the web server", () => {
    vi.stubEnv('BASE_URL', '/math-practice/')
    render(<ErrorMessage>x</ErrorMessage>)
    expect(screen.getByRole('link', { name: 'Go Home' })).toHaveAttribute(
      'href',
      '/math-practice/',
    )
  })
})
