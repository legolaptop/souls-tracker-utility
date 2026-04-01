import type { ChangeEvent } from 'react'
import { useRef, useState } from 'react'

import type { ExtractedFrame, VideoFrameExtractor } from '@/shared/workers/videoFrameExtractor'
import type { MimicColor, SourceVideo } from '@/shared/contracts/types'
import { MOCK_SOURCE_VIDEOS } from '@/shared/mocks'
import { registerSourceVideoFile, getRegisteredSourceVideoAsset } from '@/shared/runtime/sourceVideoRegistry'
import {
  createDefaultOcrProvider,
  isNativeTextDetectorAvailable,
  type OcrProvider,
} from '@/shared/workers/ocrProvider'
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

type OcrPreviewStatus = 'idle' | 'running' | 'complete' | 'error'

interface OcrPreviewFrameResult {
  timestampMs: number
  lines: string[]
}

interface OcrPreviewState {
  status: OcrPreviewStatus
  message: string
  results: OcrPreviewFrameResult[]
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
  const [ocrPreview, setOcrPreview] = useState<OcrPreviewState>({
    status: 'idle',
    message: '',
    results: [],
  })
  const extractorRef = useRef<VideoFrameExtractor | null>(null)
  const ocrProviderRef = useRef<OcrProvider | null>(null)
  const handlerRef = useRef<ReturnType<typeof createVideoExtractMessageHandler> | null>(null)
  const initializedRef = useRef(false)
  const ocrInitializedRef = useRef(false)
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

  function getOcrProvider(): OcrProvider {
    if (!ocrProviderRef.current) {
      ocrProviderRef.current = createDefaultOcrProvider()
    }

    return ocrProviderRef.current
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

  async function ensureOcrInitialized(): Promise<void> {
    if (ocrInitializedRef.current) {
      return
    }

    await getOcrProvider().init({
      origin: window.location.origin,
      language: 'eng',
    })

    ocrInitializedRef.current = true
  }

  async function handleStart() {
    if (!selectedVideoId) return

    const frameBatchId = `frames-${Date.now()}`
    currentJobIdRef.current = frameBatchId
    setExtractedFrames([])
    setDescriptor(null)
    setOcrPreview({ status: 'idle', message: '', results: [] })
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
    setOcrPreview({ status: 'idle', message: '', results: [] })
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
    setOcrPreview({ status: 'idle', message: '', results: [] })

    event.target.value = ''
  }

  async function handleRunOcrPreview() {
    if (extractedFrames.length === 0) {
      return
    }

    setOcrPreview({ status: 'running', message: 'Initializing OCR…', results: [] })

    try {
      await ensureOcrInitialized()

      const provider = getOcrProvider()
      const results: OcrPreviewFrameResult[] = []

      for (let index = 0; index < extractedFrames.length; index++) {
        const frame = extractedFrames[index]
        const response = await provider.recognize(frame)
        results.push({
          timestampMs: frame.timestampMs,
          lines: response.lines.map((line) => line.text),
        })

        setOcrPreview({
          status: 'running',
          message: `Running OCR preview… ${index + 1}/${extractedFrames.length}`,
          results: [...results],
        })
      }

      setOcrPreview({
        status: 'complete',
        message: 'OCR preview finished.',
        results,
      })
    } catch (error) {
      setOcrPreview({
        status: 'error',
        message: error instanceof Error ? error.message : 'OCR preview failed.',
        results: [],
      })
    }
  }

  const isRunning = processing.status === 'running'
  const isOcrRunning = ocrPreview.status === 'running'
  const isDone = processing.status === 'complete' || processing.status === 'cancelled' || processing.status === 'error'
  const isLocalVideo = selectedVideoId ? Boolean(getRegisteredSourceVideoAsset(selectedVideoId)) : false
  const nativeOcrAvailable = isNativeTextDetectorAvailable()
  const hasOcrResults = ocrPreview.results.length > 0
  const isBusy = isRunning || isOcrRunning

  return (
    <section className="page score-processing-page" aria-labelledby="processing-title">
      <h2 id="processing-title">Score Processing</h2>
      <p className="page-lead">
        Upload a local SOULS recording or select an existing event placeholder, then
        sample real frames from the video. After that, run OCR Preview to extract text
        from the sampled images using the browser's native text detector when available.
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
            disabled={isBusy}
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
            disabled={isBusy}
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
                  disabled={isBusy}
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
          {!isRunning && extractedFrames.length > 0 && (
            <button
              className="btn btn--ghost"
              onClick={() => void handleRunOcrPreview()}
              disabled={isOcrRunning || !nativeOcrAvailable}
              title={nativeOcrAvailable ? 'Run OCR preview on sampled frames' : 'Native OCR is not available in this browser'}
            >
              {isOcrRunning ? 'Running OCR…' : 'Run OCR Preview'}
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

        <p className="integration-note">
          Native OCR engine: <strong>{nativeOcrAvailable ? 'available' : 'not available'}</strong>.
          {nativeOcrAvailable
            ? ' OCR Preview will use the browser TextDetector API on extracted frames.'
            : ' This browser does not expose TextDetector, so real OCR preview cannot run here yet.'}
        </p>
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
              ℹ️ Real frame extraction is now live for uploaded local files. OCR Preview can
              now read those sampled images directly, but the full roster/score worker flow
              still needs to be rewired to consume these real frames end to end.
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

      {ocrPreview.status !== 'idle' && (
        <div className="card" aria-live="polite">
          <h3>OCR Preview</h3>
          <p className="page-lead">{ocrPreview.message}</p>

          {ocrPreview.status === 'complete' && ocrPreview.results.length === 0 && (
            <p className="empty-state">No text was detected in the sampled frames.</p>
          )}

          {hasOcrResults && (
            <div className="ocr-results-grid">
              {ocrPreview.results.map((result) => (
                <section key={result.timestampMs} className="ocr-result-card">
                  <h4>{Math.round(result.timestampMs)} ms</h4>
                  {result.lines.length > 0 ? (
                    <ul className="ocr-line-list">
                      {result.lines.map((line, index) => (
                        <li key={`${result.timestampMs}-${index}`}>{line}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="empty-state">No text detected for this frame.</p>
                  )}
                </section>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="integration-note">
        ℹ️ This MVP path calls the existing <code>video-extract.worker</code> contract
        directly from the page using the browser-backed extractor. OCR Preview currently
        runs on the main thread with the native browser text detector; the next step is
        moving that real OCR path back behind the roster and score worker orchestration.
      </p>
    </section>
  )
}
