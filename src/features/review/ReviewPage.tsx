import { useState } from 'react'

import type { MimicColor } from '@/shared/contracts/types'
import { MOCK_MEMBERS, MOCK_SCORE_RECORDS, MOCK_SOURCE_VIDEOS } from '@/shared/mocks'

const MIMIC_COLORS: MimicColor[] = ['red', 'green', 'white']

export function ReviewPage() {
  const [filterVideoId, setFilterVideoId] = useState<string>('')
  const [filterMimic, setFilterMimic] = useState<string>('')

  const filtered = MOCK_SCORE_RECORDS.filter((r) => {
    if (filterVideoId && r.sourceVideoId !== filterVideoId) return false
    if (filterMimic && r.mimic !== filterMimic) return false
    return true
  })

  function getMemberName(memberId: string | null): string {
    if (!memberId) return '⚠ Unmatched'
    return MOCK_MEMBERS.find((m) => m.id === memberId)?.displayName ?? '⚠ Unknown'
  }

  function getVideoLabel(videoId: string): string {
    return MOCK_SOURCE_VIDEOS.find((v) => v.id === videoId)?.label ?? videoId
  }

  return (
    <section className="page review-page" aria-labelledby="review-title">
      <h2 id="review-title">Score Review</h2>
      <p className="page-lead">
        Review extracted score records. Unmatched records should be resolved by
        adding aliases in Member Setup.
      </p>

      <div className="filter-bar">
        <label htmlFor="filter-video" className="filter-label">
          Event
        </label>
        <select
          id="filter-video"
          className="form-control form-control--sm"
          value={filterVideoId}
          onChange={(e) => setFilterVideoId(e.target.value)}
        >
          <option value="">All events</option>
          {MOCK_SOURCE_VIDEOS.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </select>

        <label htmlFor="filter-mimic" className="filter-label">
          Mimic
        </label>
        <select
          id="filter-mimic"
          className="form-control form-control--sm"
          value={filterMimic}
          onChange={(e) => setFilterMimic(e.target.value)}
        >
          <option value="">All colours</option>
          {MIMIC_COLORS.map((c) => (
            <option key={c} value={c}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="empty-state">No records match the current filters.</p>
      ) : (
        <div className="table-wrapper">
          <table className="data-table" aria-label="Score records">
            <thead>
              <tr>
                <th scope="col">Player (raw)</th>
                <th scope="col">Matched Member</th>
                <th scope="col">Mimic</th>
                <th scope="col">Rank</th>
                <th scope="col">Score</th>
                <th scope="col">Event</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((record) => (
                <tr
                  key={record.id}
                  className={record.memberId === null ? 'row--warn' : ''}
                >
                  <td>
                    <code>{record.rawPlayerName}</code>
                  </td>
                  <td>{getMemberName(record.memberId)}</td>
                  <td>
                    <span className={`mimic-badge mimic-badge--${record.mimic}`}>
                      {record.mimic}
                    </span>
                  </td>
                  <td>{record.rank ?? '—'}</td>
                  <td>
                    {record.scoreValue !== null
                      ? record.scoreValue.toLocaleString()
                      : record.rawScoreText}
                  </td>
                  <td>{getVideoLabel(record.sourceVideoId)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="integration-note">
        ℹ️ Integration point: records loaded from <code>readAppStorage().scoreRecords</code>{' '}
        after worker delivers <code>IngestResult</code>.
      </p>
    </section>
  )
}
