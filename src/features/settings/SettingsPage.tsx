import { APP_SCHEMA_VERSION, STORAGE_KEYS } from '@/shared/contracts/storage'

export function SettingsPage() {
  function handleExport() {
    // Placeholder: will read from readAppStorage() and trigger a JSON download
    const raw = localStorage.getItem(STORAGE_KEYS.appState) ?? '{}'
    const blob = new Blob([raw], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'souls-tracker-export.json'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  function handleClearData() {
    if (window.confirm('Clear all app data? This cannot be undone.')) {
      localStorage.removeItem(STORAGE_KEYS.appState)
      window.location.reload()
    }
  }

  return (
    <section className="page settings-page" aria-labelledby="settings-title">
      <h2 id="settings-title">Settings</h2>
      <p className="page-lead">
        Manage app data, exports, and configuration.
      </p>

      <div className="settings-group card">
        <h3 className="settings-group__title">Data Management</h3>

        <div className="settings-row">
          <div>
            <strong>Export App Data</strong>
            <p className="settings-desc">
              Download the current app state as a JSON file.
            </p>
          </div>
          <button className="btn btn--ghost" onClick={handleExport}>
            Export JSON
          </button>
        </div>

        <div className="settings-row">
          <div>
            <strong>Import App Data</strong>
            <p className="settings-desc">
              Restore from a previously exported JSON file.
            </p>
          </div>
          <button className="btn btn--ghost" disabled title="Import integration pending">
            Import JSON
          </button>
        </div>

        <div className="settings-row">
          <div>
            <strong>Clear All Data</strong>
            <p className="settings-desc">
              Remove all stored roster, event, and score data.
            </p>
          </div>
          <button className="btn btn--ghost btn--danger" onClick={handleClearData}>
            Clear Data
          </button>
        </div>
      </div>

      <div className="settings-group card">
        <h3 className="settings-group__title">App Information</h3>

        <dl className="info-list">
          <div>
            <dt>Storage key</dt>
            <dd>
              <code>{STORAGE_KEYS.appState}</code>
            </dd>
          </div>
          <div>
            <dt>Schema version</dt>
            <dd>{APP_SCHEMA_VERSION}</dd>
          </div>
        </dl>
      </div>
    </section>
  )
}
