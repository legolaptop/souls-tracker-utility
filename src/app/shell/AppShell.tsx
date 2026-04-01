import { NavLink, Outlet } from 'react-router-dom'

interface NavItem {
  to: string
  label: string
  end?: boolean
}

const NAV_LINKS: NavItem[] = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/members', label: 'Members' },
  { to: '/events', label: 'Events' },
  { to: '/processing', label: 'Processing' },
  { to: '/review', label: 'Review' },
  { to: '/progress', label: 'Progress' },
  { to: '/settings', label: 'Settings' },
  { to: '/help', label: 'Help' },
]

export function AppShell() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__brand">
          <h1>SOULS Tracker</h1>
          <p>Client-side guild scoring utility</p>
        </div>
      </header>

      <div className="app-body">
        <nav className="app-nav" aria-label="Primary navigation">
          <ul className="nav-list">
            {NAV_LINKS.map(({ to, label, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    'nav-link' + (isActive ? ' nav-link--active' : '')
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <main className="app-main" id="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
