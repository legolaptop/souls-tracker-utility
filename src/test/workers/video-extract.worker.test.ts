import { describe, expect, it } from 'vitest'

import type { VideoFrameExtractor } from '@/shared/workers/videoFrameExtractor'
import {
  createVideoExtractMessageHandler,
  type VideoExtractRequest,
  type VideoExtractResponse,
} from '@/workers/video-extract.worker'

describe('video-extract worker handler', () => {
  it('initializes and reports ready', async () => {
    const handler = createVideoExtractMessageHandler({
      extractor: {
        async init() {
          return
        },
        async getVideoDescriptor(sourceVideoId) {
          return { sourceVideoId, durationMs: 1000, width: 100, height: 100 }
        },
        async extractFrame(sourceVideoId, timestampMs) {
          return { sourceVideoId, timestampMs, width: 100, height: 100, syntheticText: ['x'] }
        },
      },
    })

    const responses: VideoExtractResponse[] = []
    await handler({ type: 'INIT_VIDEO_EXTRACTOR' }, (message) => responses.push(message))

    expect(responses).toEqual([{ type: 'VIDEO_EXTRACTOR_READY' }])
  })

  it('extracts frame batches and emits complete payload', async () => {
    const extractor: VideoFrameExtractor = {
      async init() {
        return
      },
      async getVideoDescriptor(sourceVideoId) {
        return { sourceVideoId, durationMs: 10_000, width: 1920, height: 1080 }
      },
      async extractFrame(sourceVideoId, timestampMs, crop) {
        return {
          sourceVideoId,
          timestampMs,
          width: 1920,
          height: 1080,
          crop,
          syntheticText: [`frame-${timestampMs}`],
        }
      },
    }

    const handler = createVideoExtractMessageHandler({ extractor })
    const responses: VideoExtractResponse[] = []

    const request: VideoExtractRequest = {
      type: 'EXTRACT_FRAME_BATCH',
      payload: {
        sourceVideoId: 'vid-1',
        jobId: 'job-1',
        timestampsMs: [0, 2000, 5000],
      },
    }

    await handler(request, (message) => responses.push(message))

    const complete = responses.find((message) => message.type === 'FRAME_BATCH_COMPLETE')
    expect(complete).toBeDefined()
    if (!complete || complete.type !== 'FRAME_BATCH_COMPLETE') {
      throw new Error('missing complete message')
    }

    expect(complete.payload.frames).toHaveLength(3)
    expect(complete.payload.jobId).toBe('job-1')
  })

  it('returns a typed error response when extraction fails', async () => {
    const handler = createVideoExtractMessageHandler({
      extractor: {
        async init() {
          return
        },
        async getVideoDescriptor(sourceVideoId) {
          return { sourceVideoId, durationMs: 1000, width: 100, height: 100 }
        },
        async extractFrame() {
          throw new Error('frame unavailable')
        },
      },
    })

    const responses: VideoExtractResponse[] = []
    const request: VideoExtractRequest = {
      type: 'EXTRACT_FRAME_BATCH',
      payload: { sourceVideoId: 'vid-1', jobId: 'job-err', timestampsMs: [0] },
    }

    await handler(request, (message) => responses.push(message))

    expect(responses[0]).toEqual({
      type: 'VIDEO_EXTRACT_ERROR',
      payload: { jobId: 'job-err', message: 'frame unavailable' },
    })
  })
})
