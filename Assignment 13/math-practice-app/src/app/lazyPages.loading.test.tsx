import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TestRouter } from '../test/TestRouter'
import { AppProvider } from './AppProvider'
import { AppRoutes } from './AppRoutes'
import { preloadSecondaryPages } from './lazyPages'

// Make the statistics page slow to arrive, as it would be on a poor connection.
vi.mock('../pages/StatisticsPage', async (importOriginal) => {
  await new Promise((resolve) => setTimeout(resolve, 150))
  return importOriginal()
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

describe('pages that load on demand', () => {
  it('say so, and keep the menu, when opened directly while still on the way', async () => {
    renderAt('/statistics')

    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Loading…')
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Statistics' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Loading…')).toBeNull()
  })

  it('keep the current page on screen while the next one arrives, with no flash', async () => {
    const user = userEvent.setup()
    renderAt('/practice/setup')
    expect(
      screen.getByRole('heading', { level: 1, name: 'Practice Setup' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Statistics' }))
    // The new page is still on its way: the old one has not been taken away.
    expect(screen.queryByText('Loading…')).toBeNull()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Statistics' }),
    ).toBeInTheDocument()
  })

  it('move focus to the new heading once they appear', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await user.click(screen.getByRole('link', { name: 'Statistics' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Statistics' }),
    ).toHaveFocus()
  })

  it('can be fetched ahead of time, so opening them later is instant', async () => {
    const outcome =
      (await preloadSecondaryPages()) as PromiseSettledResult<unknown>[]
    expect(outcome.map((o) => o.status)).toEqual(['fulfilled', 'fulfilled'])
  })
})
