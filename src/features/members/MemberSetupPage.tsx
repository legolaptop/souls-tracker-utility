import { MOCK_MEMBERS } from '@/shared/mocks'

export function MemberSetupPage() {
  return (
    <section className="page member-setup-page" aria-labelledby="members-title">
      <div className="page-header">
        <h2 id="members-title">Member Setup</h2>
        <button className="btn btn--primary" disabled title="Parsing agent integration pending">
          + Add Member
        </button>
      </div>
      <p className="page-lead">
        Manage the guild roster. Names and aliases are used to match OCR-extracted
        player names from score videos.
      </p>

      {MOCK_MEMBERS.length === 0 ? (
        <p className="empty-state">No members added yet.</p>
      ) : (
        <div className="table-wrapper">
          <table className="data-table" aria-label="Guild roster">
            <thead>
              <tr>
                <th scope="col">Display Name</th>
                <th scope="col">Aliases</th>
                <th scope="col">Added</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {MOCK_MEMBERS.map((member) => (
                <tr key={member.id}>
                  <td>{member.displayName}</td>
                  <td>
                    <span className="alias-list">
                      {member.aliases.join(', ') || <em>None</em>}
                    </span>
                  </td>
                  <td>
                    {new Date(member.createdAtIso).toLocaleDateString()}
                  </td>
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
        <code>readAppStorage</code> — roster will be stored in{' '}
        <code>souls-tracker/app-state</code>.
      </p>
    </section>
  )
}
