import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'

import './Sidebar.css'

const LINKS = [
  { to: '/score-sheet', label: 'Score Sheet' },
  { to: '/stats', label: 'Stats' },
]

function Sidebar({ open, onOpen, onClose }) {
  useEffect(() => {
    if (!open) return

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open, onClose])

  return (
    <>
      <button
        type="button"
        className="hamburger"
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="sidebar"
        onClick={onOpen}
      >
        <span className="hamburger-bar" />
        <span className="hamburger-bar" />
        <span className="hamburger-bar" />
      </button>

      <div
        className={`sidebar-backdrop ${open ? 'is-open' : ''}`}
        onClick={onClose}
      />

      <nav
        id="sidebar"
        className={`sidebar ${open ? 'is-open' : ''}`}
        aria-hidden={!open}
      >
        <div className="sidebar-header">
          <span className="sidebar-title">Family Games</span>
          <button
            type="button"
            className="sidebar-close"
            aria-label="Close menu"
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        <ul className="sidebar-links">
          {LINKS.map(({ to, label }) => (
            <li key={to}>
              <NavLink to={to} end onClick={onClose}>
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  )
}

export default Sidebar
