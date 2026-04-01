import { workerContractVersion, type WorkerRequest, type WorkerResponse } from '@/shared/contracts/worker'
import { deduplicateFrameBatch, toScoreRecord, type FrameCandidate } from '@/shared/domain/deduplication'
import { cleanOcrText, normalizePlayerName, normalizeScoreText } from '@/shared/domain/normalization'
import { toWorkerAssetUrl } from '@/shared/workers/assetPaths'
import { createDefaultOcrProvider, createLazyOcrProvider, type OcrProvider } from '@/shared/workers/ocrProvider'
import {
  createDefaultVideoFrameExtractor,
  type VideoDescriptor,
  type VideoFrameExtractor,
} from '@/shared/workers/videoFrameExtractor'
import { segmentMimicSections, sampleSectionFrames, toPixelCropRect } from '@/shared/workers/videoSampling'
import { runRosterBatchOcr } from '@/workers/member-ocr.worker'

class JobCancelledError extends Error {
  constructor(jobId: string) {
    super(`Job cancelled: ${jobId}`)
    this.name = 'JobCancelledError'
  }
}

export interface OcrWorkerDeps {
  extractor: VideoFrameExtractor
  ocr: OcrProvider
  origin: string
}

const defaultDeps: OcrWorkerDeps = {
  extractor: createDefaultVideoFrameExtractor(),
  ocr: createLazyOcrProvider(async () => createDefaultOcrProvider()),
  origin: typeof location !== 'undefined' ? location.origin : 'http://localhost',
}

function parseScoreLine(line: string): {
  rank: number | null
  rawPlayerName: string
  rawScoreText: string
} | null {
  const cleaned = cleanOcrText(line)
  const match = cleaned.match(/^(\d+)\s+(.+?)\s+([\d.,]+[KkMmBb]?)$/)
  if (!match) {
    return null
  }

  return {
    rank: Number.parseInt(match[1], 10),
    rawPlayerName: match[2].trim(),
    rawScoreText: match[3].trim(),
  }
}

function getJobId(request: WorkerRequest): string {
  if (request.type === 'PARSE_ROSTER_FRAME_BATCH' || request.type === 'PARSE_SCORE_FRAME_BATCH') {
    return request.payload.frameBatchId
  }
  if (request.type === 'CANCEL_JOB') {
    return request.payload.jobId
  }
  return ''
}

interface WorkerScopeLike {
  addEventListener: (
    type: 'message',
    listener: (event: MessageEvent<WorkerRequest>) => void,
  ) => void
  postMessage: (message: WorkerResponse) => void
}

export function createOcrWorkerMessageHandler(deps: OcrWorkerDeps = defaultDeps) {
  const cancelledJobs = new Set<string>()

  function ensureActiveJob(jobId: string): void {
    if (cancelledJobs.has(jobId)) {
      cancelledJobs.delete(jobId)
      throw new JobCancelledError(jobId)
    }
  }

  async function runScoreJob(
    request: Extract<WorkerRequest, { type: 'PARSE_SCORE_FRAME_BATCH' }>,
  ): Promise<Extract<WorkerResponse, { type: 'PARSE_COMPLETE' }>['payload']> {
    const jobId = request.payload.frameBatchId
    const descriptor: VideoDescriptor = await deps.extractor.getVideoDescriptor(request.payload.sourceVideoId)
    const sections = segmentMimicSections(descriptor.durationMs)
    const section = sections.find((candidate) => candidate.mimic === request.payload.mimic) ?? sections[0]

    const crop = toPixelCropRect(
      { width: descriptor.width, height: descriptor.height },
      { x: 0.04, y: 0.14, width: 0.92, height: 0.72 },
    )

    const samples = sampleSectionFrames(section, { spacingMs: 1200, maxFrames: 36 })
    const candidates: FrameCandidate[] = []

    for (let index = 0; index < samples.length; index++) {
      ensureActiveJob(jobId)

      const sample = samples[index]
      const frame = await deps.extractor.extractFrame(request.payload.sourceVideoId, sample.timestampMs, crop)
      const ocr = await deps.ocr.recognize(frame)

      for (const line of ocr.lines) {
        const parsed = parseScoreLine(line.text)
        if (!parsed) continue

        candidates.push({
          frameMs: sample.timestampMs,
          rawPlayerName: parsed.rawPlayerName,
          normalizedPlayerName: normalizePlayerName(parsed.rawPlayerName),
          memberId: null,
          mimic: request.payload.mimic,
          rank: parsed.rank,
          rawScoreText: parsed.rawScoreText,
          scoreValue: normalizeScoreText(parsed.rawScoreText),
        })
      }

      postProgress(jobId, Math.round(((index + 1) / samples.length) * 100))
    }

    const capturedAtIso = new Date().toISOString()
    const deduped = deduplicateFrameBatch(candidates, request.payload.sourceVideoId, capturedAtIso)

    const records = deduped.map((record, index) => toScoreRecord(record, `${jobId}-${index + 1}`))

    return {
      jobId,
      result: {
        sourceVideoId: request.payload.sourceVideoId,
        records,
        issues: records.length === 0 ? [{ code: 'NO_SCORE_RECORDS', message: 'No score rows were detected.' }] : [],
      },
    }
  }

  let postProgress: (jobId: string, percent: number) => void = () => undefined

  return async function handle(
    request: WorkerRequest,
    postMessage: (response: WorkerResponse) => void,
  ): Promise<void> {
    postProgress = (jobId, percent) => {
      postMessage({ type: 'PARSE_PROGRESS', payload: { jobId, percent } })
    }

    try {
      if (request.type === 'INIT_WORKER') {
        if (request.payload.contractVersion !== workerContractVersion) {
          postMessage({
            type: 'WORKER_ERROR',
            payload: {
              message: `Unsupported contract version: ${request.payload.contractVersion}`,
            },
          })
          return
        }

        await deps.extractor.init()
        await deps.ocr.init({
          origin: deps.origin,
          language: 'eng',
          modelAssetPath: toWorkerAssetUrl('assets/ocr-models/', deps.origin),
        })

        postMessage({
          type: 'WORKER_READY',
          payload: { contractVersion: workerContractVersion },
        })
        return
      }

      if (request.type === 'CANCEL_JOB') {
        cancelledJobs.add(request.payload.jobId)
        return
      }

      if (request.type === 'PARSE_ROSTER_FRAME_BATCH') {
        const jobId = request.payload.frameBatchId
        const roster = await runRosterBatchOcr(
          { extractor: deps.extractor, ocr: deps.ocr },
          {
            sourceVideoId: request.payload.sourceVideoId,
            frameBatchId: request.payload.frameBatchId,
            shouldCancel: () => cancelledJobs.has(jobId),
            onProgress: (percent) => postProgress(jobId, percent),
          },
        )

        ensureActiveJob(jobId)

        postMessage({
          type: 'PARSE_COMPLETE',
          payload: {
            jobId,
            result: {
              sourceVideoId: request.payload.sourceVideoId,
              records: [],
              issues: roster.candidates.map((candidate) => ({
                code: 'ROSTER_CANDIDATE',
                message: JSON.stringify(candidate),
                frameMs: candidate.firstSeenMs,
              })),
            },
          },
        })
        return
      }

      const scorePayload = await runScoreJob(request)
      ensureActiveJob(scorePayload.jobId)
      postMessage({ type: 'PARSE_COMPLETE', payload: scorePayload })
    } catch (error) {
      const jobId = request.type === 'INIT_WORKER' ? undefined : getJobId(request)
      if (error instanceof JobCancelledError) {
        postMessage({ type: 'WORKER_ERROR', payload: { jobId, message: 'Job cancelled' } })
        return
      }

      const message = error instanceof Error ? error.message : 'Unknown worker failure'
      postMessage({ type: 'WORKER_ERROR', payload: { jobId, message } })
    }
  }
}

function maybeRegisterWorkerRuntime(): void {
  const scope = globalThis as Partial<WorkerScopeLike>
  if (typeof scope.addEventListener !== 'function' || typeof scope.postMessage !== 'function') {
    return
  }

  const handle = createOcrWorkerMessageHandler(defaultDeps)
  scope.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
    void handle(event.data, (response) => {
      scope.postMessage?.(response)
    })
  })
}

maybeRegisterWorkerRuntime()
