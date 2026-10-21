import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { HomePage } from './HomePage'

describe('HomePage', () => {
  it('links to practice, statistics, and settings', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('link', { name: 'Start Practice' }),
    ).toHaveAttribute('href', '/practice/setup')
    expect(
      screen.getByRole('link', { name: 'View Statistics' }),
    ).toHaveAttribute('href', '/statistics')
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute(
      'href',
      '/settings',
    )
  })
})
