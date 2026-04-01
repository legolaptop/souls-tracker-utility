import { describe, expect, it } from 'vitest'

import type { OcrProvider } from '@/shared/workers/ocrProvider'
import type { VideoFrameExtractor } from '@/shared/workers/videoFrameExtractor'
import { runRosterBatchOcr } from '@/workers/member-ocr.worker'

function createDeps(linesByTimestamp: Record<number, string[]>): {
  extractor: VideoFrameExtractor
  ocr: OcrProvider
} {
  const extractor: VideoFrameExtractor = {
    async init() {
      return
    },
    async getVideoDescriptor(sourceVideoId) {
      return {
        sourceVideoId,
        durationMs: 1_800,
        width: 1920,
        height: 1080,
      }
    },
    async extractFrame(sourceVideoId, timestampMs) {
      return {
        sourceVideoId,
        timestampMs,
        width: 1920,
        height: 1080,
        syntheticText: linesByTimestamp[timestampMs] ?? [],
      }
    },
  }

  const ocr: OcrProvider = {
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

  return { extractor, ocr }
}

describe('runRosterBatchOcr', () => {
  it('strips rank and trailing combat power before normalization', async () => {
    const deps = createDeps({
      0: ['1 AlphaOne 23,456,789', '2 Bravo-Two 1.2M'],
      900: ['3 AlphaOne 23,999,999'],
      1800: ['4 Charlie'],
    })

    const result = await runRosterBatchOcr(deps, {
      sourceVideoId: 'roster-video',
      frameBatchId: 'roster-batch',
      shouldCancel: () => false,
    })

    expect(result.candidates).toEqual([
      {
        rawPlayerName: 'AlphaOne',
        normalizedPlayerName: 'alphaone',
        firstSeenMs: 0,
        seenCount: 2,
      },
      {
        rawPlayerName: 'Bravo-Two',
        normalizedPlayerName: 'bravo-two',
        firstSeenMs: 0,
        seenCount: 1,
      },
      {
        rawPlayerName: 'Charlie',
        normalizedPlayerName: 'charlie',
        firstSeenMs: 1800,
        seenCount: 1,
      },
    ])
  })

  it('stops processing when cancellation is requested', async () => {
    const deps = createDeps({
      0: ['1 Alice 10,000,000'],
      900: ['2 Bob 9,000,000'],
      1800: ['3 Carol 8,000,000'],
    })

    let processedFrames = 0
    const result = await runRosterBatchOcr(deps, {
      sourceVideoId: 'roster-video',
      frameBatchId: 'cancel-batch',
      shouldCancel: () => processedFrames >= 1,
      onProgress: () => {
        processedFrames += 1
      },
    })

    expect(result.candidates).toEqual([
      {
        rawPlayerName: 'Alice',
        normalizedPlayerName: 'alice',
        firstSeenMs: 0,
        seenCount: 1,
      },
    ])
  })
})