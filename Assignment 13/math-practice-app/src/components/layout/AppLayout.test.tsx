import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { AppLayout } from './AppLayout'

function renderLayout(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<h1>Home page</h1>} />
          <Route path="statistics" element={<h1>Statistics page</h1>} />
          <Route path="settings" element={<p>No heading here</p>} />
          <Route path="*" element={<h1>Missing</h1>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  document.title = 'something else'
})

describe('AppLayout page titles', () => {
  it('sets the tab title for the first page', () => {
    renderLayout('/statistics')
    expect(document.title).toBe('Statistics – Math Practice')
  })

  it('updates the tab title when moving between pages', async () => {
    const user = userEvent.setup()
    renderLayout('/')
    expect(document.title).toBe('Math Practice')

    await user.click(screen.getByRole('link', { name: 'Statistics' }))
    expect(document.title).toBe('Statistics – Math Practice')

    await user.click(screen.getByRole('link', { name: 'Home' }))
    expect(document.title).toBe('Math Practice')
  })

  it('has a title for pages that do not exist', () => {
    renderLayout('/nowhere')
    expect(document.title).toBe('Page Not Found – Math Practice')
  })
})

describe('AppLayout focus on page change', () => {
  it('leaves focus alone on the very first page (so the skip link stays first)', () => {
    renderLayout('/')
    expect(document.body).toHaveFocus()
  })

  it('moves focus to the new page heading after navigating', async () => {
    const user = userEvent.setup()
    renderLayout('/')

    await user.click(screen.getByRole('link', { name: 'Statistics' }))
    expect(
      screen.getByRole('heading', { name: 'Statistics page' }),
    ).toHaveFocus()
  })

  it('makes the heading focusable by the app, but not by tabbing', async () => {
    const user = userEvent.setup()
    renderLayout('/')
    await user.click(screen.getByRole('link', { name: 'Statistics' }))

    expect(
      screen.getByRole('heading', { name: 'Statistics page' }),
    ).toHaveAttribute('tabindex', '-1')
  })

  it('falls back to the main area for a page with no heading', async () => {
    const user = userEvent.setup()
    renderLayout('/')

    await user.click(screen.getByRole('link', { name: 'Settings' }))
    expect(screen.getByRole('main')).toHaveFocus()
  })

  it('moves focus again on every further navigation', async () => {
    const user = userEvent.setup()
    renderLayout('/')

    await user.click(screen.getByRole('link', { name: 'Statistics' }))
    await user.click(screen.getByRole('link', { name: 'Home' }))
    expect(screen.getByRole('heading', { name: 'Home page' })).toHaveFocus()
  })
})

describe('AppLayout skip link', () => {
  it('is the first thing to tab to, and points at the main content', async () => {
    const user = userEvent.setup()
    renderLayout('/')

    await user.tab()
    const skip = screen.getByRole('link', { name: 'Skip to main content' })
    expect(skip).toHaveFocus()
    expect(skip).toHaveAttribute('href', '#main-content')
    expect(document.getElementById('main-content')).toBe(
      screen.getByRole('main'),
    )
  })
})
