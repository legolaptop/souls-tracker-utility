import { describe, expect, it } from 'vitest'

import type { WorkerRequest, WorkerResponse } from '@/shared/contracts/worker'
import type { OcrProvider } from '@/shared/workers/ocrProvider'
import type { VideoFrameExtractor } from '@/shared/workers/videoFrameExtractor'
import { createOcrWorkerMessageHandler } from '@/workers/ocr.worker'

function collectResponses() {
  const responses: WorkerResponse[] = []
  return {
    responses,
    postMessage: (response: WorkerResponse) => {
      responses.push(response)
    },
  }
}

function createDeps(overrides: Partial<{ extractor: VideoFrameExtractor; ocr: OcrProvider }> = {}) {
  const extractor: VideoFrameExtractor =
    overrides.extractor ??
    {
      async init() {
        return
      },
      async getVideoDescriptor(sourceVideoId) {
        return {
          sourceVideoId,
          durationMs: 9_000,
          width: 1920,
          height: 1080,
        }
      },
      async extractFrame(sourceVideoId, timestampMs, crop) {
        return {
          sourceVideoId,
          timestampMs,
          width: 1920,
          height: 1080,
          crop,
          syntheticText: [`1 alpha_${Math.floor(timestampMs / 1000)} 100K`],
        }
      },
    }

  const ocr: OcrProvider =
    overrides.ocr ??
    {
      async init() {
        return
      },
      async recognize(frame) {
        const lines = frame.syntheticText ?? []
        return {
          lines: lines.map((text) => ({ text, confidence: 0.9 })),
        }
      },
    }

  return { extractor, ocr, origin: 'https://example.com' }
}

describe('ocr.worker message handler', () => {
  it('returns WORKER_READY after INIT_WORKER', async () => {
    const handler = createOcrWorkerMessageHandler(createDeps())
    const sink = collectResponses()

    await handler(
      { type: 'INIT_WORKER', payload: { contractVersion: '1.0.0' } },
      sink.postMessage,
    )

    expect(sink.responses).toHaveLength(1)
    expect(sink.responses[0]).toEqual({
      type: 'WORKER_READY',
      payload: { contractVersion: '1.0.0' },
    })
  })

  it('returns WORKER_ERROR when INIT_WORKER contract version mismatches', async () => {
    const handler = createOcrWorkerMessageHandler(createDeps())
    const sink = collectResponses()

    await handler(
      {
        type: 'INIT_WORKER',
        payload: { contractVersion: '0.0.1' as '1.0.0' },
      },
      sink.postMessage,
    )

    expect(sink.responses).toEqual([
      {
        type: 'WORKER_ERROR',
        payload: { message: 'Unsupported contract version: 0.0.1' },
      },
    ])
  })

  it('parses score batches and emits progress then completion', async () => {
    const handler = createOcrWorkerMessageHandler(createDeps())
    const sink = collectResponses()

    const request: WorkerRequest = {
      type: 'PARSE_SCORE_FRAME_BATCH',
      payload: { sourceVideoId: 'vid-1', mimic: 'red', frameBatchId: 'batch-1' },
    }

    await handler(request, sink.postMessage)

    expect(sink.responses.some((message) => message.type === 'PARSE_PROGRESS')).toBe(true)

    const complete = sink.responses.find((message) => message.type === 'PARSE_COMPLETE')
    expect(complete).toBeDefined()
    if (!complete || complete.type !== 'PARSE_COMPLETE') {
      throw new Error('missing complete message')
    }

    expect(complete.payload.jobId).toBe('batch-1')
    expect(complete.payload.result.sourceVideoId).toBe('vid-1')
    expect(complete.payload.result.records.length).toBeGreaterThan(0)
  })

  it('supports cancellation for queued score jobs', async () => {
    const handler = createOcrWorkerMessageHandler(createDeps())
    const sink = collectResponses()

    await handler({ type: 'CANCEL_JOB', payload: { jobId: 'batch-cancel' } }, sink.postMessage)

    await handler(
      {
        type: 'PARSE_SCORE_FRAME_BATCH',
        payload: { sourceVideoId: 'vid-1', mimic: 'red', frameBatchId: 'batch-cancel' },
      },
      sink.postMessage,
    )

    const errorMessage = sink.responses.find((message) => message.type === 'WORKER_ERROR')
    expect(errorMessage).toBeDefined()
    expect(errorMessage?.type).toBe('WORKER_ERROR')
    if (errorMessage?.type === 'WORKER_ERROR') {
      expect(errorMessage.payload.jobId).toBe('batch-cancel')
      expect(errorMessage.payload.message).toBe('Job cancelled')
    }
  })

  it('supports cancellation for in-flight score jobs before completion', async () => {
    let shouldCancel = false
    const handler = createOcrWorkerMessageHandler(
      createDeps({
        extractor: {
          async init() {
            return
          },
          async getVideoDescriptor(sourceVideoId) {
            return {
              sourceVideoId,
              durationMs: 2_000,
              width: 1920,
              height: 1080,
            }
          },
          async extractFrame(sourceVideoId, timestampMs, crop) {
            return {
              sourceVideoId,
              timestampMs,
              width: 1920,
              height: 1080,
              crop,
              syntheticText: ['1 alpha 100K'],
            }
          },
        },
      }),
    )
    const sink = collectResponses()

    await handler(
      {
        type: 'PARSE_SCORE_FRAME_BATCH',
        payload: { sourceVideoId: 'vid-1', mimic: 'red', frameBatchId: 'batch-live-cancel' },
      },
      (response) => {
        sink.postMessage(response)
        if (
          response.type === 'PARSE_PROGRESS' &&
          response.payload.jobId === 'batch-live-cancel' &&
          !shouldCancel
        ) {
          shouldCancel = true
          void handler({ type: 'CANCEL_JOB', payload: { jobId: 'batch-live-cancel' } }, sink.postMessage)
        }
      },
    )

    const complete = sink.responses.find((message) => message.type === 'PARSE_COMPLETE')
    expect(complete).toBeUndefined()

    const errorMessage = sink.responses.find((message) => message.type === 'WORKER_ERROR')
    expect(errorMessage).toBeDefined()
    if (errorMessage?.type === 'WORKER_ERROR') {
      expect(errorMessage.payload.jobId).toBe('batch-live-cancel')
      expect(errorMessage.payload.message).toBe('Job cancelled')
    }
  })

  it('returns WORKER_ERROR when dependencies throw', async () => {
    const handler = createOcrWorkerMessageHandler(
      createDeps({
        extractor: {
          async init() {
            return
          },
          async getVideoDescriptor() {
            throw new Error('descriptor missing')
          },
          async extractFrame() {
            throw new Error('not used')
          },
        },
      }),
    )

    const sink = collectResponses()

    await handler(
      {
        type: 'PARSE_SCORE_FRAME_BATCH',
        payload: { sourceVideoId: 'vid-1', mimic: 'green', frameBatchId: 'batch-err' },
      },
      sink.postMessage,
    )

    expect(sink.responses).toEqual([
      {
        type: 'WORKER_ERROR',
        payload: { jobId: 'batch-err', message: 'descriptor missing' },
      },
    ])
  })

  it('supports roster batch parse and encodes dedup candidates in issues', async () => {
    const handler = createOcrWorkerMessageHandler(createDeps())
    const sink = collectResponses()

    await handler(
      {
        type: 'PARSE_ROSTER_FRAME_BATCH',
        payload: { sourceVideoId: 'roster-1', frameBatchId: 'roster-batch' },
      },
      sink.postMessage,
    )

    const complete = sink.responses.find((message) => message.type === 'PARSE_COMPLETE')
    expect(complete).toBeDefined()
    if (!complete || complete.type !== 'PARSE_COMPLETE') {
      throw new Error('missing complete message')
    }

    expect(complete.payload.result.records).toEqual([])
    expect(complete.payload.result.issues.length).toBeGreaterThan(0)
    expect(complete.payload.result.issues[0].code).toBe('ROSTER_CANDIDATE')
  })
})
