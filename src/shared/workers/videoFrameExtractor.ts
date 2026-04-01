import type { CropRect } from '@/shared/workers/ocrProvider'

export interface VideoDescriptor {
  sourceVideoId: string
  durationMs: number
  width: number
  height: number
}

export interface ExtractedFrame {
  sourceVideoId: string
  timestampMs: number
  width: number
  height: number
  crop?: CropRect
  syntheticText: string[]
}

export interface VideoFrameExtractor {
  init(): Promise<void>
  getVideoDescriptor(sourceVideoId: string): Promise<VideoDescriptor>
  extractFrame(sourceVideoId: string, timestampMs: number, crop?: CropRect): Promise<ExtractedFrame>
}

function hashString(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0
  }
  return hash
}

/**
 * In-memory extractor used as a deterministic scaffold until real client-side
 * decoding is wired in (e.g. WebCodecs/ffmpeg.wasm path).
 */
export function createInMemoryVideoFrameExtractor(): VideoFrameExtractor {
  return {
    async init() {
      return
    },
    async getVideoDescriptor(sourceVideoId) {
      const hash = hashString(sourceVideoId)
      return {
        sourceVideoId,
        durationMs: 90_000 + (hash % 30_000),
        width: 1920,
        height: 1080,
      }
    },
    async extractFrame(sourceVideoId, timestampMs, crop) {
      const bucket = Math.floor(timestampMs / 5000)
      const syntheticName = `${sourceVideoId.slice(0, 6)}_p${(bucket % 20) + 1}`
      const syntheticScore = `${100 + (bucket % 50)}K`

      return {
        sourceVideoId,
        timestampMs,
        width: 1920,
        height: 1080,
        crop,
        syntheticText: [
          `${(bucket % 30) + 1} ${syntheticName} ${syntheticScore}`,
          `${(bucket % 30) + 2} ${syntheticName}alt ${syntheticScore}`,
        ],
      }
    },
  }
}
