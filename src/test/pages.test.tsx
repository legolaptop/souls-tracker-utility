import { render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'

import { AppShell } from '@/app/shell/AppShell'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { EventSetupPage } from '@/features/events/EventSetupPage'
import { HelpPage } from '@/features/help/HelpPage'
import { MemberSetupPage } from '@/features/members/MemberSetupPage'
import { MemberProgressPage } from '@/features/progress/MemberProgressPage'
import { ReviewPage } from '@/features/review/ReviewPage'
import { ScoreProcessingPage } from '@/features/scoring/ScoreProcessingPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { MOCK_MEMBERS, MOCK_SCORE_RECORDS, MOCK_SOURCE_VIDEOS } from '@/shared/mocks'

function renderInShell(page: React.ReactElement) {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <AppShell />,
        children: [{ index: true, element: page }],
      },
    ],
    { initialEntries: ['/'] },
  )
  return render(<RouterProvider router={router} />)
}

describe('DashboardPage', () => {
  it('renders stat cards with mock counts', () => {
    renderInShell(<DashboardPage />)

    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeVisible()
    expect(screen.getByText('Guild Members')).toBeInTheDocument()
    expect(screen.getByText('Events Recorded')).toBeInTheDocument()
    expect(screen.getByText('Score Records')).toBeInTheDocument()
  })

  it('shows manage events link', () => {
    renderInShell(<DashboardPage />)
    expect(screen.getByRole('link', { name: /manage events/i })).toBeInTheDocument()
  })
})

describe('MemberSetupPage', () => {
  it('renders roster table with mock members', () => {
    renderInShell(<MemberSetupPage />)

    expect(screen.getByRole('heading', { name: /member setup/i })).toBeVisible()
    for (const member of MOCK_MEMBERS) {
      expect(screen.getByText(member.displayName)).toBeInTheDocument()
    }
  })

  it('has a disabled Add Member button', () => {
    renderInShell(<MemberSetupPage />)
    const btn = screen.getByRole('button', { name: /\+ add member/i })
    expect(btn).toBeDisabled()
  })
})

describe('EventSetupPage', () => {
  it('renders event table with mock videos', () => {
    renderInShell(<EventSetupPage />)

    expect(screen.getByRole('heading', { name: /event setup/i })).toBeVisible()
    for (const video of MOCK_SOURCE_VIDEOS) {
      expect(screen.getByText(video.label)).toBeInTheDocument()
    }
  })
})

describe('ScoreProcessingPage', () => {
  it('renders event selector and mimic options', () => {
    renderInShell(<ScoreProcessingPage />)

    expect(screen.getByRole('heading', { name: /score processing/i })).toBeVisible()
    expect(screen.getByLabelText(/source event/i)).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /mimic colour/i })).toBeInTheDocument()
  })

  it('start button is disabled when no event is selected', () => {
    renderInShell(<ScoreProcessingPage />)
    expect(screen.getByRole('button', { name: /sample frames/i })).toBeDisabled()
  })
})

describe('ReviewPage', () => {
  it('renders score records table', () => {
    renderInShell(<ReviewPage />)

    expect(screen.getByRole('heading', { name: /score review/i })).toBeVisible()
    const table = screen.getByRole('table', { name: /score records/i })
    expect(table).toBeInTheDocument()
    expect(screen.getAllByRole('row').length).toBeGreaterThan(MOCK_SCORE_RECORDS.length)
  })
})

describe('MemberProgressPage', () => {
  it('renders member progress table', () => {
    renderInShell(<MemberProgressPage />)

    expect(screen.getByRole('heading', { name: /member progress/i })).toBeVisible()
    for (const member of MOCK_MEMBERS) {
      expect(screen.getByText(member.displayName)).toBeInTheDocument()
    }
  })
})

describe('SettingsPage', () => {
  it('renders settings sections', () => {
    renderInShell(<SettingsPage />)

    expect(screen.getByRole('heading', { name: /settings/i })).toBeVisible()
    expect(screen.getByRole('button', { name: /export json/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /clear data/i })).toBeInTheDocument()
  })
})

describe('HelpPage', () => {
  it('renders help sections', () => {
    renderInShell(<HelpPage />)

    expect(screen.getByRole('heading', { name: /help/i })).toBeVisible()
    expect(screen.getByRole('heading', { name: /overview/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /member progress/i })).toBeInTheDocument()
  })
})
