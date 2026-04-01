import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createDefaultOcrProvider,
  createStubOcrProvider,
  isNativeTextDetectorAvailable,
} from '@/shared/workers/ocrProvider'

const globalScope = globalThis as typeof globalThis & {
  TextDetector?: new (options?: { languages?: string[] }) => {
    detect: (source: unknown) => Promise<Array<{ rawValue?: string; boundingBox?: { x: number; y: number; width: number; height: number } }>>
  }
  createImageBitmap?: (input: Blob) => Promise<{ close: () => void }>
}

afterEach(() => {
  vi.restoreAllMocks()
  delete globalScope.TextDetector
  delete globalScope.createImageBitmap
})

describe('ocrProvider', () => {
  it('does not fabricate lines when stub fallback is disabled', async () => {
    const provider = createStubOcrProvider({ generateFallbackLine: false })
    await provider.init({ origin: 'https://example.com', language: 'eng' })

    const result = await provider.recognize({
      sourceVideoId: 'video-1',
      timestampMs: 0,
      width: 100,
      height: 100,
    })

    expect(result.lines).toEqual([])
  })

  it('uses native text detector when available', async () => {
    const detect = vi.fn().mockResolvedValue([
      {
        rawValue: 'AlphaOne\n1,248,500',
        boundingBox: { x: 10, y: 12, width: 100, height: 30 },
      },
      {
        rawValue: 'BravoTwo',
        boundingBox: { x: 10, y: 60, width: 100, height: 20 },
      },
    ])

    globalScope.TextDetector = class {
      detect = detect
    }

    globalScope.createImageBitmap = vi.fn().mockResolvedValue({ close: vi.fn() })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        blob: async () => new Blob(['frame'], { type: 'image/png' }),
      }),
    )

    const provider = createDefaultOcrProvider()
    await provider.init({ origin: 'https://example.com', language: 'eng' })

    const result = await provider.recognize({
      sourceVideoId: 'video-1',
      timestampMs: 1200,
      width: 320,
      height: 640,
      previewDataUrl: 'data:image/png;base64,AAAA',
    })

    expect(isNativeTextDetectorAvailable()).toBe(true)
    expect(result.lines.map((line) => line.text)).toEqual(['AlphaOne', '1,248,500', 'BravoTwo'])
    expect(detect).toHaveBeenCalledTimes(1)
  })

  it('falls back to synthetic lines when real OCR is unavailable', async () => {
    const provider = createDefaultOcrProvider()
    await provider.init({ origin: 'https://example.com', language: 'eng' })

    const result = await provider.recognize({
      sourceVideoId: 'video-1',
      timestampMs: 0,
      width: 100,
      height: 100,
      syntheticText: ['1 AlphaOne 100K'],
    })

    expect(result.lines.map((line) => line.text)).toEqual(['1 AlphaOne 100K'])
  })
})