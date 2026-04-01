import { NavLink, Outlet } from 'react-router-dom'

export function AppShell() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>SOULS Tracker</h1>
          <p>Client-side guild scoring utility foundation</p>
        </div>
        <nav aria-label="Primary navigation">
          <NavLink to="/" end>
            Home
          </NavLink>
        </nav>
      </header>

      <main className="app-main" id="content">
        <Outlet />
      </main>
    </div>
  )
}
