import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AppRoutes } from './AppRoutes'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

describe('AppRoutes', () => {
  it.each([
    ['/', 'Welcome to Math Practice!'],
    ['/practice/setup', 'Practice Setup'],
    ['/practice/session', 'Practice'],
    ['/practice/summary', 'Session Summary'],
    ['/statistics', 'Statistics'],
    ['/settings', 'Settings'],
  ])('renders %s', (path, heading) => {
    renderAt(path)
    expect(
      screen.getByRole('heading', { level: 1, name: heading }),
    ).toBeInTheDocument()
  })

  it('shows the fallback page for unknown routes', () => {
    renderAt('/does-not-exist')
    expect(
      screen.getByRole('heading', { level: 1, name: 'Page Not Found' }),
    ).toBeInTheDocument()
  })

  it('navigates from the home buttons to their pages', async () => {
    const user = userEvent.setup()
    renderAt('/')

    await user.click(screen.getByRole('link', { name: 'Start Practice' }))
    expect(
      screen.getByRole('heading', { level: 1, name: 'Practice Setup' }),
    ).toBeInTheDocument()
  })

  it('returns home from the fallback page', async () => {
    const user = userEvent.setup()
    renderAt('/nope')

    await user.click(screen.getByRole('link', { name: 'Go Home' }))
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Welcome to Math Practice!',
      }),
    ).toBeInTheDocument()
  })
})
