import { MOCK_SOURCE_VIDEOS } from '@/shared/mocks'

export function EventSetupPage() {
  return (
    <section className="page event-setup-page" aria-labelledby="events-title">
      <div className="page-header">
        <h2 id="events-title">Event Setup</h2>
        <button className="btn btn--primary" disabled title="Persistence integration pending">
          + Add Event
        </button>
      </div>
      <p className="page-lead">
        Register source video events before processing. Each event corresponds to a
        guild scoring session.
      </p>

      {MOCK_SOURCE_VIDEOS.length === 0 ? (
        <p className="empty-state">No events registered yet.</p>
      ) : (
        <div className="table-wrapper">
          <table className="data-table" aria-label="Source video events">
            <thead>
              <tr>
                <th scope="col">Label</th>
                <th scope="col">Captured Date</th>
                <th scope="col">Notes</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {MOCK_SOURCE_VIDEOS.map((video) => (
                <tr key={video.id}>
                  <td>{video.label}</td>
                  <td>
                    {new Date(video.capturedDateIso).toLocaleDateString()}
                  </td>
                  <td>{video.notes ?? <em className="muted">—</em>}</td>
                  <td className="table-actions">
                    <button
                      className="btn btn--ghost btn--sm"
                      disabled
                      title="Editing integration pending"
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn--ghost btn--sm btn--danger"
                      disabled
                      title="Delete integration pending"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="integration-note">
        ℹ️ Persistence integration point: <code>writeAppStorage</code> /
        <code>readAppStorage</code> — source videos stored under{' '}
        <code>souls-tracker/app-state</code>.
      </p>
    </section>
  )
}
