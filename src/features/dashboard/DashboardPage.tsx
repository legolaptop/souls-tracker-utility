import { NavLink } from 'react-router-dom'

import { MOCK_MEMBERS, MOCK_SCORE_RECORDS, MOCK_SOURCE_VIDEOS } from '@/shared/mocks'

export function DashboardPage() {
  const matchedScores = MOCK_SCORE_RECORDS.filter((r) => r.memberId !== null)
  const unmatchedScores = MOCK_SCORE_RECORDS.filter((r) => r.memberId === null)

  return (
    <section className="page dashboard-page" aria-labelledby="dashboard-title">
      <h2 id="dashboard-title">Dashboard</h2>
      <p className="page-lead">
        Overview of guild roster, recorded events, and scoring activity.
      </p>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-value">{MOCK_MEMBERS.length}</span>
          <span className="stat-label">Guild Members</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{MOCK_SOURCE_VIDEOS.length}</span>
          <span className="stat-label">Events Recorded</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{MOCK_SCORE_RECORDS.length}</span>
          <span className="stat-label">Score Records</span>
        </div>
        <div className="stat-card stat-card--warn">
          <span className="stat-value">{unmatchedScores.length}</span>
          <span className="stat-label">Unmatched Records</span>
        </div>
      </div>

      <div className="dashboard-sections">
        <div className="dashboard-section">
          <h3>Recent Events</h3>
          {MOCK_SOURCE_VIDEOS.length === 0 ? (
            <p className="empty-state">No events recorded yet.</p>
          ) : (
            <ul className="recent-list">
              {MOCK_SOURCE_VIDEOS.map((v) => (
                <li key={v.id} className="recent-list__item">
                  <span className="recent-list__label">{v.label}</span>
                  <span className="recent-list__meta">
                    {new Date(v.capturedDateIso).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <NavLink className="link-action" to="/events">
            Manage Events →
          </NavLink>
        </div>

        <div className="dashboard-section">
          <h3>Score Matching</h3>
          <p>
            <strong>{matchedScores.length}</strong> of{' '}
            <strong>{MOCK_SCORE_RECORDS.length}</strong> records matched to guild
            members.
          </p>
          {unmatchedScores.length > 0 && (
            <p className="warn-text">
              {unmatchedScores.length} record(s) could not be matched. Visit{' '}
              <NavLink to="/review">Review</NavLink> to resolve.
            </p>
          )}
          <NavLink className="link-action" to="/processing">
            Process New Video →
          </NavLink>
        </div>
      </div>
    </section>
  )
}
