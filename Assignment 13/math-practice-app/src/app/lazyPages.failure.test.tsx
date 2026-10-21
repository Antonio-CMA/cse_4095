import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TestRouter } from '../test/TestRouter'
import { AppProvider } from './AppProvider'
import { AppRoutes } from './AppRoutes'
import { preloadSecondaryPages } from './lazyPages'

// The settings page cannot be downloaded (a dropped connection, say).
vi.mock('../pages/SettingsPage', () => {
  throw new Error('Failed to fetch dynamically imported module')
})

function renderAt(path: string) {
  return render(
    <AppProvider>
      <TestRouter initialEntries={[path]}>
        <AppRoutes />
      </TestRouter>
    </AppProvider>,
  )
}

describe('a page that cannot be downloaded', () => {
  it('shows the friendly error message, not a blank page or the cause', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderAt('/settings')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Something unexpected happened')
    expect(document.body.textContent).not.toMatch(
      /dynamically imported|Failed to fetch/,
    )
    expect(screen.getByRole('link', { name: 'Go Home' })).toHaveAttribute(
      'href',
      '/',
    )
  })

  it('leaves the rest of the app working', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const user = userEvent.setup()
    renderAt('/settings')
    await screen.findByRole('alert')

    const nav = screen.getByRole('navigation', { name: 'Main' })
    await user.click(nav.querySelector('a[href="/practice/setup"]')!)
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Practice Setup' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('does not stop the background fetch from carrying on with the others', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const outcome =
      (await preloadSecondaryPages()) as PromiseSettledResult<unknown>[]
    expect(outcome.map((o) => o.status)).toEqual(['fulfilled', 'rejected'])
  })
})
