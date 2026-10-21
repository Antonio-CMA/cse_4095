import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { Navigation } from './Navigation'

describe('Navigation', () => {
  it('lists the main destinations and marks the current page', () => {
    render(
      <MemoryRouter initialEntries={['/statistics']}>
        <Navigation />
      </MemoryRouter>,
    )

    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
    expect(screen.getAllByRole('link').map((l) => l.textContent)).toEqual([
      'Home',
      'Practice',
      'Statistics',
      'Settings',
    ])
    expect(screen.getByRole('link', { name: 'Statistics' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute(
      'aria-current',
    )
  })
})
