import { createHashRouter } from 'react-router-dom'

import { AppShell } from '@/app/shell/AppShell'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { EventSetupPage } from '@/features/events/EventSetupPage'
import { HelpPage } from '@/features/help/HelpPage'
import { MemberSetupPage } from '@/features/members/MemberSetupPage'
import { MemberProgressPage } from '@/features/progress/MemberProgressPage'
import { ReviewPage } from '@/features/review/ReviewPage'
import { ScoreProcessingPage } from '@/features/scoring/ScoreProcessingPage'
import { SettingsPage } from '@/features/settings/SettingsPage'

export const router = createHashRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'members', element: <MemberSetupPage /> },
      { path: 'events', element: <EventSetupPage /> },
      { path: 'processing', element: <ScoreProcessingPage /> },
      { path: 'review', element: <ReviewPage /> },
      { path: 'progress', element: <MemberProgressPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'help', element: <HelpPage /> },
    ],
  },
])
