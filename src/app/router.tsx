import { createHashRouter } from 'react-router-dom'

import { AppShell } from '@/app/shell/AppShell'
import { HomePage } from '@/features/home/HomePage'

export const router = createHashRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
    ],
  },
])
