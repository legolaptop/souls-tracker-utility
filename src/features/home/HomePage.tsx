import { APP_SCHEMA_VERSION } from '@/shared/contracts/storage'
import { workerContractVersion } from '@/shared/contracts/worker'

export function HomePage() {
  return (
    <section className="home-page" aria-labelledby="foundation-title">
      <h2 id="foundation-title">Foundation Ready</h2>
      <p>
        This skeleton wires app boot, routing, shared contracts, and deployment
        configuration so OCR and parser workstreams can start in parallel.
      </p>

      <dl className="contract-list">
        <div>
          <dt>Storage schema version</dt>
          <dd>{APP_SCHEMA_VERSION}</dd>
        </div>
        <div>
          <dt>Worker contract version</dt>
          <dd>{workerContractVersion}</dd>
        </div>
      </dl>
    </section>
  )
}
