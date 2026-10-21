import { NavLink } from 'react-router'

const NAV_ITEMS = [
  { to: '/', label: 'Home', end: true },
  { to: '/practice/setup', label: 'Practice', end: false },
  { to: '/statistics', label: 'Statistics', end: false },
  { to: '/settings', label: 'Settings', end: false },
]

export function Navigation() {
  return (
    <nav aria-label="Main" className="main-nav">
      <ul className="main-nav__list">
        {NAV_ITEMS.map(({ to, label, end }) => (
          <li key={to}>
            <NavLink to={to} end={end} className="main-nav__link">
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
