import { NavLink } from 'react-router'

const NAV_ITEMS = [
  { to: '/', label: 'Home', end: true },
  { to: '/practice/setup', label: 'Practice', end: false },
  { to: '/statistics', label: 'Statistics', end: false },
  { to: '/settings', label: 'Settings', end: false },
]

interface NavigationProps {
  /** Lets the Menu button point at this navigation. */
  id?: string
  /** On small screens the links are hidden until the menu is opened. */
  isOpen?: boolean
  /** Called when a link is chosen, so the menu can close behind it. */
  onNavigate?: () => void
}

export function Navigation({
  id,
  isOpen = false,
  onNavigate,
}: NavigationProps) {
  return (
    <nav
      id={id}
      aria-label="Main"
      className={`main-nav${isOpen ? ' main-nav--open' : ''}`}
    >
      <ul className="main-nav__list">
        {NAV_ITEMS.map(({ to, label, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className="main-nav__link"
              onClick={onNavigate}
            >
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
