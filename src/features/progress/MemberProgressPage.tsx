import { MOCK_MEMBERS, MOCK_SCORE_RECORDS, MOCK_SOURCE_VIDEOS } from '@/shared/mocks'

interface MemberStats {
  memberId: string
  displayName: string
  eventCount: number
  totalScore: number
  bestRank: number | null
  eventBreakdown: { videoId: string; label: string; score: number | null; rank: number | null }[]
}

function buildMemberStats(): MemberStats[] {
  return MOCK_MEMBERS.map((member) => {
    const records = MOCK_SCORE_RECORDS.filter((r) => r.memberId === member.id)
    const totalScore = records.reduce((sum, r) => sum + (r.scoreValue ?? 0), 0)
    const ranks = records.map((r) => r.rank).filter((r): r is number => r !== null)
    const bestRank = ranks.length > 0 ? Math.min(...ranks) : null

    const eventBreakdown = MOCK_SOURCE_VIDEOS.map((v) => {
      const rec = records.find((r) => r.sourceVideoId === v.id)
      return {
        videoId: v.id,
        label: v.label,
        score: rec?.scoreValue ?? null,
        rank: rec?.rank ?? null,
      }
    })

    return {
      memberId: member.id,
      displayName: member.displayName,
      eventCount: records.length,
      totalScore,
      bestRank,
      eventBreakdown,
    }
  })
}

export function MemberProgressPage() {
  const stats = buildMemberStats()

  return (
    <section className="page progress-page" aria-labelledby="progress-title">
      <h2 id="progress-title">Member Progress</h2>
      <p className="page-lead">
        Aggregated performance across all scored events. Scores are summed per member.
      </p>

      <div className="table-wrapper">
        <table className="data-table" aria-label="Member progress summary">
          <thead>
            <tr>
              <th scope="col">Member</th>
              <th scope="col">Events Participated</th>
              <th scope="col">Total Score</th>
              <th scope="col">Best Rank</th>
              {MOCK_SOURCE_VIDEOS.map((v) => (
                <th key={v.id} scope="col" title={v.label}>
                  {v.label.split('–')[0].trim()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.memberId}>
                <td>{s.displayName}</td>
                <td>{s.eventCount}</td>
                <td>{s.totalScore.toLocaleString()}</td>
                <td>{s.bestRank ?? '—'}</td>
                {s.eventBreakdown.map((eb) => (
                  <td key={eb.videoId}>
                    {eb.score !== null ? (
                      <>
                        {eb.score.toLocaleString()}
                        {eb.rank !== null && (
                          <span className="rank-badge"> #{eb.rank}</span>
                        )}
                      </>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="integration-note">
        ℹ️ Integration point: score data read from{' '}
        <code>readAppStorage().scoreRecords</code> once worker parsing delivers
        results.
      </p>
    </section>
  )
}
