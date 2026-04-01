import type { ChangeEvent } from 'react'
import { useRef, useState } from 'react'

import type { ExtractedFrame, VideoFrameExtractor } from '@/shared/workers/videoFrameExtractor'
import type { MimicColor, SourceVideo } from '@/shared/contracts/types'
import { MOCK_SOURCE_VIDEOS } from '@/shared/mocks'
import { registerSourceVideoFile, getRegisteredSourceVideoAsset } from '@/shared/runtime/sourceVideoRegistry'
import {
  createVideoExtractMessageHandler,
  type VideoExtractResponse,
} from '@/workers/video-extract.worker'
import { createDefaultVideoFrameExtractor } from '@/shared/workers/videoFrameExtractor'

type ProcessingStatus = 'idle' | 'running' | 'complete' | 'error' | 'cancelled'

interface ProcessingState {
  status: ProcessingStatus
  percent: number
  message: string
}

interface VideoDescriptorState {
  durationMs: number
  width: number
  height: number
}

function buildSampleTimestamps(durationMs: number): number[] {
  if (durationMs <= 0) {
    return [0]
  }

  const anchors = [0.1, 0.35, 0.6, 0.85]
  return anchors.map((ratio) => Math.round(durationMs * ratio))
}

export function ScoreProcessingPage() {
  const [sourceVideos, setSourceVideos] = useState<SourceVideo[]>(MOCK_SOURCE_VIDEOS)
  const [selectedVideoId, setSelectedVideoId] = useState<string>('')
  const [selectedMimic, setSelectedMimic] = useState<MimicColor>('red')
  const [descriptor, setDescriptor] = useState<VideoDescriptorState | null>(null)
  const [extractedFrames, setExtractedFrames] = useState<ExtractedFrame[]>([])
  const [processing, setProcessing] = useState<ProcessingState>({
    status: 'idle',
    percent: 0,
    message: '',
  })
  const extractorRef = useRef<VideoFrameExtractor | null>(null)
  const handlerRef = useRef<ReturnType<typeof createVideoExtractMessageHandler> | null>(null)
  const initializedRef = useRef(false)
  const currentJobIdRef = useRef<string | null>(null)

  const selectedVideo = sourceVideos.find((video) => video.id === selectedVideoId) ?? null

  function getExtractor(): VideoFrameExtractor {
    if (!extractorRef.current) {
      extractorRef.current = createDefaultVideoFrameExtractor()
    }

    return extractorRef.current
  }

  function getHandler() {
    if (!handlerRef.current) {
      handlerRef.current = createVideoExtractMessageHandler({ extractor: getExtractor() })
    }

    return handlerRef.current
  }

  async function ensureInitialized(): Promise<void> {
    if (initializedRef.current) {
      return
    }

    const responses: VideoExtractResponse[] = []
    await getHandler()({ type: 'INIT_VIDEO_EXTRACTOR' }, (response) => {
      responses.push(response)
    })

    const error = responses.find((response) => response.type === 'VIDEO_EXTRACT_ERROR')
    if (error?.type === 'VIDEO_EXTRACT_ERROR') {
      throw new Error(error.payload.message)
    }

    initializedRef.current = true
  }

  async function handleStart() {
    if (!selectedVideoId) return

    const frameBatchId = `frames-${Date.now()}`
    currentJobIdRef.current = frameBatchId
    setExtractedFrames([])
    setDescriptor(null)
    setProcessing({ status: 'running', percent: 0, message: 'Loading video metadata…' })

    try {
      await ensureInitialized()

      const extractor = getExtractor()
      const metadata = await extractor.getVideoDescriptor(selectedVideoId)
      setDescriptor({
        durationMs: metadata.durationMs,
        width: metadata.width,
        height: metadata.height,
      })

      const timestampsMs = buildSampleTimestamps(metadata.durationMs)

      await getHandler()(
        {
          type: 'EXTRACT_FRAME_BATCH',
          payload: { sourceVideoId: selectedVideoId, jobId: frameBatchId, timestampsMs },
        },
        (response) => {
          if (response.type === 'FRAME_BATCH_PROGRESS') {
            setProcessing({
              status: 'running',
              percent: response.payload.percent,
              message: `Extracting sampled frames… ${response.payload.percent}%`,
            })
            return
          }

          if (response.type === 'FRAME_BATCH_COMPLETE') {
            setExtractedFrames(response.payload.frames)
            setProcessing({
              status: 'complete',
              percent: 100,
              message: `Extracted ${response.payload.frames.length} sampled frame(s).`,
            })
            currentJobIdRef.current = null
            return
          }

          if (response.type === 'VIDEO_EXTRACT_ERROR') {
            setProcessing({
              status: response.payload.message === 'Job cancelled' ? 'cancelled' : 'error',
              percent: 0,
              message: response.payload.message,
            })
            currentJobIdRef.current = null
          }
        },
      )
    } catch (error) {
      setProcessing({
        status: 'error',
        percent: 0,
        message: error instanceof Error ? error.message : 'Video extraction failed.',
      })
      currentJobIdRef.current = null
    }
  }

  function handleCancel() {
    const jobId = currentJobIdRef.current
    if (!jobId) {
      setProcessing({ status: 'cancelled', percent: 0, message: 'Cancelled by user.' })
      return
    }

    void getHandler()({ type: 'CANCEL_JOB', payload: { jobId } }, () => undefined)
  }

  function handleReset() {
    setProcessing({ status: 'idle', percent: 0, message: '' })
    setSelectedVideoId('')
    setSelectedMimic('red')
    setDescriptor(null)
    setExtractedFrames([])
    currentJobIdRef.current = null
  }

  function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const sourceVideoId = `local-video-${Date.now()}`
    registerSourceVideoFile(sourceVideoId, file)

    const nextVideo: SourceVideo = {
      id: sourceVideoId,
      label: file.name,
      capturedDateIso: new Date().toISOString(),
      notes: 'Local upload for frame extraction MVP',
    }

    setSourceVideos((current) => [nextVideo, ...current.filter((video) => video.id !== sourceVideoId)])
    setSelectedVideoId(sourceVideoId)
    setProcessing({ status: 'idle', percent: 0, message: '' })
    setDescriptor(null)
    setExtractedFrames([])

    event.target.value = ''
  }

  const isRunning = processing.status === 'running'
  const isDone = processing.status === 'complete' || processing.status === 'cancelled' || processing.status === 'error'
  const isLocalVideo = selectedVideoId ? Boolean(getRegisteredSourceVideoAsset(selectedVideoId)) : false

  return (
    <section className="page score-processing-page" aria-labelledby="processing-title">
      <h2 id="processing-title">Score Processing</h2>
      <p className="page-lead">
        Upload a local SOULS recording or select an existing event placeholder, then
        sample real frames from the video. OCR remains stubbed for now; this step is
        specifically for validating browser-side video extraction.
      </p>

      <div className="processing-form card">
        <div className="form-row">
          <label htmlFor="video-upload" className="form-label">
            Local Video
          </label>
          <input
            id="video-upload"
            className="form-control"
            type="file"
            accept="video/*"
            onChange={handleFileSelected}
            disabled={isRunning}
          />
        </div>

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
            {sourceVideos.map((v) => (
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
              onClick={() => void handleStart()}
              disabled={!selectedVideoId}
            >
              Sample Frames
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

        {selectedVideo && (
          <p className="integration-note">
            Selected source: <strong>{selectedVideo.label}</strong>.{' '}
            {isLocalVideo
              ? 'This run will use real browser video decoding against the uploaded file.'
              : 'This selection is still using the scaffolded in-memory extractor because no local file is registered for it.'}
          </p>
        )}
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
                  ℹ️ Real frame extraction is now live for uploaded local files. The OCR and
              row-normalization path is still stubbed, so this preview validates decode,
              seek, crop, and frame sampling only.
            </p>
          )}
        </div>
      )}

      {descriptor && (
        <div className="card">
          <h3>Video Descriptor</h3>
          <dl className="descriptor-grid">
            <div>
              <dt>Duration</dt>
              <dd>{(descriptor.durationMs / 1000).toFixed(2)}s</dd>
            </div>
            <div>
              <dt>Resolution</dt>
              <dd>
                {descriptor.width} x {descriptor.height}
              </dd>
            </div>
            <div>
              <dt>Mimic Context</dt>
              <dd>{selectedMimic}</dd>
            </div>
          </dl>
        </div>
      )}

      {extractedFrames.length > 0 && (
        <div className="card">
          <h3>Sampled Frames</h3>
          <div className="frame-preview-grid">
            {extractedFrames.map((frame) => (
              <figure key={`${frame.sourceVideoId}-${frame.timestampMs}`} className="frame-preview-card">
                {frame.previewDataUrl ? (
                  <img
                    className="frame-preview-image"
                    src={frame.previewDataUrl}
                    alt={`Frame preview at ${Math.round(frame.timestampMs)} milliseconds`}
                  />
                ) : (
                  <div className="frame-preview-fallback">No browser preview available</div>
                )}
                <figcaption>
                  {Math.round(frame.timestampMs)} ms • {frame.width} x {frame.height}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}

      <p className="integration-note">
        ℹ️ This MVP path calls the existing <code>video-extract.worker</code> contract
        directly from the page using the browser-backed extractor. Once OCR is wired in,
        the same source-video registration can feed roster and score workers.
      </p>
    </section>
  )
}
