import { useEffect, useRef, useState } from 'react'

import type { MimicColor } from '@/shared/contracts/types'
import type { WorkerRequest, WorkerResponse } from '@/shared/contracts/worker'
import { MOCK_SOURCE_VIDEOS } from '@/shared/mocks'

type ProcessingStatus = 'idle' | 'running' | 'complete' | 'error' | 'cancelled'

interface ProcessingState {
  status: ProcessingStatus
  percent: number
  message: string
}

/**
 * Placeholder dispatcher that constructs a typed WorkerRequest without actually
 * sending it. The real implementation will post this to a SharedWorker/Worker
 * once the parsing agent delivers the worker bundle.
 */
function buildWorkerRequest(
  sourceVideoId: string,
  mimic: MimicColor,
  frameBatchId: string,
): WorkerRequest {
  return {
    type: 'PARSE_SCORE_FRAME_BATCH',
    payload: { sourceVideoId, mimic, frameBatchId },
  }
}

/**
 * Placeholder that simulates the acknowledgement shape the worker will send back
 * so UI wiring can be tested before the real worker is available.
 */
function buildMockWorkerResponse(jobId: string, percent: number): WorkerResponse {
  if (percent >= 100) {
    return {
      type: 'PARSE_COMPLETE',
      payload: { jobId, result: { sourceVideoId: jobId, records: [], issues: [] } },
    }
  }
  return { type: 'PARSE_PROGRESS', payload: { jobId, percent } }
}

export function ScoreProcessingPage() {
  const [selectedVideoId, setSelectedVideoId] = useState<string>('')
  const [selectedMimic, setSelectedMimic] = useState<MimicColor>('red')
  const intervalRef = useRef<number | null>(null)
  const [processing, setProcessing] = useState<ProcessingState>({
    status: 'idle',
    percent: 0,
    message: '',
  })

  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current)
      }
    }
  }, [])

  function clearProgressInterval() {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  function handleStart() {
    if (!selectedVideoId) return

    clearProgressInterval()

    const frameBatchId = `batch-${Date.now()}`
    const request = buildWorkerRequest(selectedVideoId, selectedMimic, frameBatchId)

    // Placeholder: log the typed request that will be posted to the worker.
    console.info('[ScoreProcessing] Worker request (placeholder):', request)

    setProcessing({ status: 'running', percent: 0, message: 'Initializing…' })

    // Simulate progress ticks until the real worker is wired in.
    let tick = 0
    intervalRef.current = window.setInterval(() => {
      tick += 20
      const response = buildMockWorkerResponse(frameBatchId, tick)

      if (response.type === 'PARSE_COMPLETE') {
        clearProgressInterval()
        setProcessing({ status: 'complete', percent: 100, message: 'Processing complete.' })
      } else if (response.type === 'PARSE_PROGRESS') {
        setProcessing({ status: 'running', percent: response.payload.percent, message: `Processing… ${response.payload.percent}%` })
      }
    }, 400)
  }

  function handleCancel() {
    clearProgressInterval()
    setProcessing({ status: 'cancelled', percent: 0, message: 'Cancelled by user.' })
  }

  function handleReset() {
    clearProgressInterval()
    setProcessing({ status: 'idle', percent: 0, message: '' })
    setSelectedVideoId('')
    setSelectedMimic('red')
  }

  const isRunning = processing.status === 'running'
  const isDone = processing.status === 'complete' || processing.status === 'cancelled' || processing.status === 'error'

  return (
    <section className="page score-processing-page" aria-labelledby="processing-title">
      <h2 id="processing-title">Score Processing</h2>
      <p className="page-lead">
        Select a registered event and mimic colour, then start processing to extract
        score records from the source video frames.
      </p>

      <div className="processing-form card">
        <div className="form-row">
          <label htmlFor="video-select" className="form-label">
            Source Event
          </label>
          <select
            id="video-select"
            className="form-control"
            value={selectedVideoId}
            onChange={(e) => setSelectedVideoId(e.target.value)}
            disabled={isRunning}
          >
            <option value="">— select an event —</option>
            {MOCK_SOURCE_VIDEOS.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <label className="form-label">Mimic Colour</label>
          <div className="mimic-selector" role="group" aria-label="Mimic colour">
            {(['red', 'green', 'white'] as MimicColor[]).map((colour) => (
              <label key={colour} className={`mimic-option mimic-option--${colour}${selectedMimic === colour ? ' mimic-option--selected' : ''}`}>
                <input
                  type="radio"
                  name="mimic"
                  value={colour}
                  checked={selectedMimic === colour}
                  onChange={() => setSelectedMimic(colour)}
                  disabled={isRunning}
                  className="visually-hidden"
                />
                {colour.charAt(0).toUpperCase() + colour.slice(1)}
              </label>
            ))}
          </div>
        </div>

        <div className="form-actions">
          {!isRunning && !isDone && (
            <button
              className="btn btn--primary"
              onClick={handleStart}
              disabled={!selectedVideoId}
            >
              Start Processing
            </button>
          )}
          {isRunning && (
            <button className="btn btn--ghost btn--danger" onClick={handleCancel}>
              Cancel
            </button>
          )}
          {isDone && (
            <button className="btn btn--ghost" onClick={handleReset}>
              Reset
            </button>
          )}
        </div>
      </div>

      {processing.status !== 'idle' && (
        <div className="processing-status card" aria-live="polite">
          <div className="progress-bar-track" role="progressbar" aria-valuenow={processing.percent} aria-valuemin={0} aria-valuemax={100}>
            <div
              className={`progress-bar-fill progress-bar-fill--${processing.status}`}
              style={{ width: `${processing.percent}%` }}
            />
          </div>
          <p className="processing-message">{processing.message}</p>

          {processing.status === 'complete' && (
            <p className="integration-note">
              ℹ️ Integration point: parsed <code>IngestResult</code> records will be
              written via <code>writeAppStorage</code> and navigated to{' '}
              <strong>Review</strong>.
            </p>
          )}
        </div>
      )}

      <p className="integration-note">
        ℹ️ Worker integration point: <code>WorkerRequest / WorkerResponse</code> from{' '}
        <code>@/shared/contracts/worker</code>. Real worker bundle delivered by parsing
        agent.
      </p>
    </section>
  )
}
