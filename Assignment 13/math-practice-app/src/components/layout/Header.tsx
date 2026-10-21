import { Link } from 'react-router'
import { Navigation } from './Navigation'

export function Header() {
  return (
    <header className="app-header">
      <Link to="/" className="app-header__title">
        Math Practice
      </Link>
      <Navigation />
    </header>
  )
}
