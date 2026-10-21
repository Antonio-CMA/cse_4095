import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { TestRouter } from '../test/TestRouter'
import { AppProvider } from './AppProvider'
import { AppRoutes } from './AppRoutes'

function renderAt(path: string) {
  return render(
    <AppProvider>
      <TestRouter initialEntries={[path]}>
        <AppRoutes />
      </TestRouter>
    </AppProvider>,
  )
}

describe('the privacy page in the app', () => {
  it('is a page of its own, with its own tab title', () => {
    renderAt('/privacy')
    expect(
      screen.getByRole('heading', { level: 1, name: 'Privacy' }),
    ).toBeInTheDocument()
    expect(document.title).toBe('Privacy – Math Practice')
  })

  it.each(['/', '/practice/setup', '/privacy', '/no-such-page'])(
    'is one link away at the bottom of %s',
    (path) => {
      renderAt(path)
      const footer = screen.getByRole('contentinfo')
      expect(
        within(footer).getByRole('link', { name: 'Privacy' }),
      ).toHaveAttribute('href', '/privacy')
    },
  )

  it('opens from the footer, and moves focus to its heading', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await user.click(
      within(screen.getByRole('contentinfo')).getByRole('link', {
        name: 'Privacy',
      }),
    )
    expect(
      screen.getByRole('heading', { level: 1, name: 'Privacy' }),
    ).toHaveFocus()
  })

  it('leads to the settings page, where progress can be erased', async () => {
    const user = userEvent.setup()
    renderAt('/privacy')
    await user.click(screen.getByRole('link', { name: 'Open Settings' }))
    expect(
      await screen.findByRole('button', { name: 'Clear All Application Data' }),
    ).toBeInTheDocument()
  })

  it('does not appear in the main menu (it is a footer link)', () => {
    renderAt('/')
    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(within(nav).queryByRole('link', { name: 'Privacy' })).toBeNull()
  })
})
