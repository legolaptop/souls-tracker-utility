import { render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'

import { AppShell } from '@/app/shell/AppShell'

function makeRouter(initialEntry = '/') {
  return createMemoryRouter(
    [
      {
        path: '/',
        element: <AppShell />,
        children: [{ index: true, element: <div>Route Content</div> }],
      },
    ],
    { initialEntries: [initialEntry] },
  )
}

describe('AppShell', () => {
  it('renders static shell content', () => {
    render(<RouterProvider router={makeRouter()} />)

    expect(screen.getByRole('heading', { name: /souls tracker/i })).toBeVisible()
    expect(screen.getByText('Route Content')).toBeVisible()
  })

  it('renders primary navigation with all expected links', () => {
    render(<RouterProvider router={makeRouter()} />)

    const nav = screen.getByRole('navigation', { name: /primary navigation/i })
    expect(nav).toBeVisible()

    const expectedLinks = [
      'Dashboard',
      'Members',
      'Events',
      'Processing',
      'Review',
      'Progress',
      'Settings',
      'Help',
    ]

    for (const label of expectedLinks) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
    }
  })
})

