import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'
import { AppProvider } from './AppProvider'

describe('App', () => {
  it('opens on the home page, using the real browser router', async () => {
    render(
      <AppProvider>
        <App />
      </AppProvider>,
    )
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Welcome to Math Practice!',
      }),
    ).toBeInTheDocument()

    // Navigation goes through the browser's own address and history.
    const nav = screen.getByRole('navigation', { name: 'Main' })
    await userEvent
      .setup()
      .click(within(nav).getByRole('link', { name: 'Settings' }))
    expect(window.location.pathname).toBe('/settings')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Settings' }),
    ).toBeInTheDocument()
  })
})
