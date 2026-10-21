import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { Navigation } from './Navigation'

export function Header() {
  const { pathname } = useLocation()
  const navId = useId()
  const toggleRef = useRef<HTMLButtonElement>(null)

  // The menu is open for one page only: moving to another page closes it.
  const [openOn, setOpenOn] = useState<string | null>(null)
  const isOpen = openOn === pathname
  const close = () => setOpenOn(null)

  // Escape closes the menu from anywhere in it, and puts focus back on the
  // button so keyboard users do not lose their place.
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpenOn(null)
      toggleRef.current?.focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  const toggle = () => setOpenOn(isOpen ? null : pathname)

  return (
    <header className="app-header">
      <Link to="/" className="app-header__title">
        Math Practice
      </Link>
      {/* Only shown on small screens; wider screens always show the links. */}
      <button
        ref={toggleRef}
        type="button"
        className="nav-toggle"
        aria-expanded={isOpen}
        aria-controls={navId}
        onClick={toggle}
      >
        <span aria-hidden="true" className="nav-toggle__icon" />
        Menu
      </button>
      <Navigation id={navId} isOpen={isOpen} onNavigate={close} />
    </header>
  )
}
