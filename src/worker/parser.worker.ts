/**
 * Parsing Web Worker entry point.
 *
 * Implements the WorkerRequest / WorkerResponse protocol defined in
 * src/shared/contracts/worker.ts.  Each inbound message is dispatched to an
 * appropriate async handler; results are emitted back via postMessage.
 *
 * Design notes
 * ────────────
 * • The OCR provider is initialised lazily on the first PARSE_* request,
 *   keeping worker startup time low for GitHub-Pages deployments.
 * • Job cancellation is handled via AbortController; all async frame loops
 *   check signal.aborted before advancing to the next frame.
 * • Frame batches must be registered in the frameBatch store *before* a
 *   PARSE_* message is dispatched (see frameBatch.ts for the registry API
 *   and frameExtraction.ts for the main-thread → worker integration pattern).
 * • Asset imports that involve large dependencies (e.g. a real OCR engine)
 *   should use dynamic import() inside getOrInitOcrProvider so that Vite
 *   can code-split them out of the initial worker bundle.  Vite rewrites
 *   dynamic import paths with the configured base, making them safe for
 *   GitHub-Pages project-page deployments.
 */

import type { WorkerRequest, WorkerResponse } from '@/shared/contracts/worker'
import { workerContractVersion } from '@/shared/contracts/worker'
import type { IngestResult, MimicColor } from '@/shared/contracts/types'
import { getFrameBatch, releaseFrameBatch } from './frameBatch'
import { bitmapToImageData } from './frameExtraction'
import { cropRegion, SCORE_REGIONS, ROSTER_REGION } from './regionCrop'
import { StubOcrProvider } from './ocr/stubOcrProvider'
import type { OcrProvider } from './ocr/ocrProvider'

// ---------------------------------------------------------------------------
// Worker-global scope
//
// TypeScript 6 moved DedicatedWorkerGlobalScope out of lib.dom.d.ts into a
// separate worker lib.  Rather than adding a lib reference that conflicts with
// the React app's DOM types, we define the minimal surface we need here.
// ---------------------------------------------------------------------------
interface WorkerCtx {
  postMessage(message: unknown): void
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null
  addEventListener(type: string, listener: () => void): void
}
const ctx = globalThis as unknown as WorkerCtx

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let ocrProvider: OcrProvider | null = null
const activeJobs = new Map<string, AbortController>()

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function reply(response: WorkerResponse): void {
  ctx.postMessage(response)
}

/**
 * Returns the shared OCR provider, initialising it on first call.
 *
 * Swap StubOcrProvider for a real implementation here when the OCR engine
 * is ready, e.g.:
 *
 *   const { TesseractOcrProvider } = await import('./ocr/tesseractProvider')
 *   ocrProvider = new TesseractOcrProvider()
 *
 * The dynamic import keeps the heavy engine + model files out of the initial
 * worker bundle.
 */
async function getOrInitOcrProvider(): Promise<OcrProvider> {
  if (ocrProvider !== null) return ocrProvider
  ocrProvider = new StubOcrProvider()
  await ocrProvider.initialize()
  return ocrProvider
}

// ---------------------------------------------------------------------------
// Message handlers
// ---------------------------------------------------------------------------

function handleInit(contractVersion: string): void {
  if (contractVersion !== workerContractVersion) {
    reply({
      type: 'WORKER_ERROR',
      payload: {
        message: `Contract version mismatch: worker expects "${workerContractVersion}", received "${contractVersion}".`,
      },
    })
    return
  }
  reply({ type: 'WORKER_READY', payload: { contractVersion: workerContractVersion } })
}

async function handleParseRosterFrameBatch(
  sourceVideoId: string,
  frameBatchId: string,
  signal: AbortSignal,
): Promise<void> {
  const jobId = frameBatchId
  reply({ type: 'PARSE_PROGRESS', payload: { jobId, percent: 0 } })

  const batch = getFrameBatch(frameBatchId)
  if (!batch) {
    reply({
      type: 'WORKER_ERROR',
      payload: { jobId, message: `Frame batch "${frameBatchId}" not found in registry.` },
    })
    return
  }

  const ocr = await getOrInitOcrProvider()
  const totalFrames = batch.frames.length

  for (let i = 0; i < totalFrames; i++) {
    if (signal.aborted) break

    const imageData = bitmapToImageData(batch.frames[i])
    const rosterImageData = cropRegion(imageData, ROSTER_REGION)
    await ocr.recognizeRegion(rosterImageData)

    const percent = Math.round(((i + 1) / totalFrames) * 100)
    reply({ type: 'PARSE_PROGRESS', payload: { jobId, percent } })
  }

  releaseFrameBatch(frameBatchId)
  activeJobs.delete(jobId)

  const result: IngestResult = {
    sourceVideoId,
    records: [],
    issues: signal.aborted
      ? [{ code: 'JOB_CANCELLED', message: 'Roster parse job was cancelled.' }]
      : [],
  }
  reply({ type: 'PARSE_COMPLETE', payload: { jobId, result } })
}

async function handleParseScoreFrameBatch(
  sourceVideoId: string,
  frameBatchId: string,
  mimic: MimicColor,
  signal: AbortSignal,
): Promise<void> {
  const jobId = frameBatchId
  reply({ type: 'PARSE_PROGRESS', payload: { jobId, percent: 0 } })

  const batch = getFrameBatch(frameBatchId)
  if (!batch) {
    reply({
      type: 'WORKER_ERROR',
      payload: { jobId, message: `Frame batch "${frameBatchId}" not found in registry.` },
    })
    return
  }

  const ocr = await getOrInitOcrProvider()
  const totalFrames = batch.frames.length

  for (let i = 0; i < totalFrames; i++) {
    if (signal.aborted) break

    const imageData = bitmapToImageData(batch.frames[i])
    const rankImageData = cropRegion(imageData, SCORE_REGIONS.rank)
    const nameImageData = cropRegion(imageData, SCORE_REGIONS.playerName)
    const scoreImageData = cropRegion(imageData, SCORE_REGIONS.score)

    await Promise.all([
      ocr.recognizeRegion(rankImageData),
      ocr.recognizeRegion(nameImageData),
      ocr.recognizeRegion(scoreImageData),
    ])

    const percent = Math.round(((i + 1) / totalFrames) * 100)
    reply({ type: 'PARSE_PROGRESS', payload: { jobId, percent } })
  }

  releaseFrameBatch(frameBatchId)
  activeJobs.delete(jobId)

  const result: IngestResult = {
    sourceVideoId,
    records: [],
    issues: signal.aborted
      ? [
          {
            code: 'JOB_CANCELLED',
            message: `Score parse job for mimic "${mimic}" was cancelled.`,
          },
        ]
      : [],
  }
  reply({ type: 'PARSE_COMPLETE', payload: { jobId, result } })
}

function handleCancelJob(jobId: string): void {
  const controller = activeJobs.get(jobId)
  if (controller) {
    controller.abort()
  }
}

// ---------------------------------------------------------------------------
// Message dispatcher
// ---------------------------------------------------------------------------

ctx.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data

  switch (request.type) {
    case 'INIT_WORKER': {
      handleInit(request.payload.contractVersion)
      break
    }

    case 'PARSE_ROSTER_FRAME_BATCH': {
      const { sourceVideoId, frameBatchId } = request.payload
      const controller = new AbortController()
      activeJobs.set(frameBatchId, controller)
      handleParseRosterFrameBatch(sourceVideoId, frameBatchId, controller.signal).catch(
        (err: unknown) => {
          reply({
            type: 'WORKER_ERROR',
            payload: { jobId: frameBatchId, message: String(err) },
          })
        },
      )
      break
    }

    case 'PARSE_SCORE_FRAME_BATCH': {
      const { sourceVideoId, frameBatchId, mimic } = request.payload
      const controller = new AbortController()
      activeJobs.set(frameBatchId, controller)
      handleParseScoreFrameBatch(sourceVideoId, frameBatchId, mimic, controller.signal).catch(
        (err: unknown) => {
          reply({
            type: 'WORKER_ERROR',
            payload: { jobId: frameBatchId, message: String(err) },
          })
        },
      )
      break
    }

    case 'CANCEL_JOB': {
      handleCancelJob(request.payload.jobId)
      break
    }
  }
}
