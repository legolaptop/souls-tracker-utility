import { render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'

import { AppShell } from '@/app/shell/AppShell'

describe('AppShell', () => {
  it('renders static shell content', () => {
    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: <AppShell />,
          children: [{ index: true, element: <div>Route Content</div> }],
        },
      ],
      { initialEntries: ['/'] },
    )

    render(<RouterProvider router={router} />)

    expect(screen.getByRole('heading', { name: /souls tracker/i })).toBeVisible()
    expect(screen.getByText('Route Content')).toBeVisible()
  })
})
