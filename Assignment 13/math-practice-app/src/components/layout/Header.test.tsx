import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import { Header } from './Header'

function renderHeader(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Header />
      <Routes>
        <Route path="*" element={<p>A page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

const menuButton = () => screen.getByRole('button', { name: 'Menu' })

describe('Header menu button', () => {
  it('starts closed, and says which navigation it controls', () => {
    renderHeader()
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false')

    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(menuButton()).toHaveAttribute('aria-controls', nav.id)
    expect(nav).not.toHaveClass('main-nav--open')
  })

  it('opens and closes the navigation', async () => {
    const user = userEvent.setup()
    renderHeader()

    await user.click(menuButton())
    expect(menuButton()).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('navigation', { name: 'Main' })).toHaveClass(
      'main-nav--open',
    )

    await user.click(menuButton())
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false')
  })

  it('works from the keyboard', async () => {
    const user = userEvent.setup()
    renderHeader()

    await user.tab() // Math Practice
    await user.tab() // Menu
    expect(menuButton()).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(menuButton()).toHaveAttribute('aria-expanded', 'true')

    await user.tab()
    expect(screen.getByRole('link', { name: 'Home' })).toHaveFocus()
  })

  it('closes with Escape and returns focus to the button', async () => {
    const user = userEvent.setup()
    renderHeader()

    await user.click(menuButton())
    await user.click(screen.getByRole('link', { name: 'Home' }))
    await user.click(menuButton())
    screen.getByRole('link', { name: 'Settings' }).focus()
    await user.keyboard('{Escape}')

    expect(menuButton()).toHaveAttribute('aria-expanded', 'false')
    expect(menuButton()).toHaveFocus()
  })

  it('does nothing on Escape while closed', async () => {
    const user = userEvent.setup()
    renderHeader()
    screen.getByRole('link', { name: 'Home' }).focus()
    await user.keyboard('{Escape}')
    expect(screen.getByRole('link', { name: 'Home' })).toHaveFocus()
  })

  it('closes after choosing a page', async () => {
    const user = userEvent.setup()
    renderHeader()

    await user.click(menuButton())
    await user.click(screen.getByRole('link', { name: 'Statistics' }))
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes after choosing the page you are already on', async () => {
    const user = userEvent.setup()
    renderHeader('/statistics')

    await user.click(menuButton())
    await user.click(screen.getByRole('link', { name: 'Statistics' }))
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false')
  })

  it('stays closed when you arrive on another page, and opens again', async () => {
    const user = userEvent.setup()
    renderHeader()

    await user.click(menuButton())
    await user.click(screen.getByRole('link', { name: 'Settings' }))
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false')

    await user.click(menuButton())
    expect(menuButton()).toHaveAttribute('aria-expanded', 'true')
  })

  it('keeps every link in the navigation, open or not', () => {
    renderHeader()
    expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual(
      ['Math Practice', 'Home', 'Practice', 'Statistics', 'Settings'],
    )
  })
})
