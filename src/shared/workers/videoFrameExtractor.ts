import type { CropRect } from '@/shared/workers/ocrProvider'
import { getRegisteredSourceVideoAsset } from '@/shared/runtime/sourceVideoRegistry'

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
  previewDataUrl?: string
}

export interface VideoFrameExtractor {
  init(): Promise<void>
  getVideoDescriptor(sourceVideoId: string): Promise<VideoDescriptor>
  extractFrame(sourceVideoId: string, timestampMs: number, crop?: CropRect): Promise<ExtractedFrame>
}

interface RegisteredVideoAsset {
  sourceVideoId: string
  objectUrl: string
  fileName: string
}

interface BrowserVideoSession {
  asset: RegisteredVideoAsset
  video: HTMLVideoElement
  descriptor: VideoDescriptor
}

function hashString(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0
  }
  return hash
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

async function waitForVideoEvent(video: HTMLVideoElement, type: keyof HTMLMediaElementEventMap): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener(type, handleSuccess)
      video.removeEventListener('error', handleError)
    }

    const handleSuccess = () => {
      cleanup()
      resolve()
    }

    const handleError = () => {
      cleanup()
      reject(new Error(`Video event failed: ${type}`))
    }

    video.addEventListener(type, handleSuccess, { once: true })
    video.addEventListener('error', handleError, { once: true })
  })
}

async function seekVideo(video: HTMLVideoElement, timeSeconds: number): Promise<void> {
  const clamped = clampNumber(timeSeconds, 0, Number.isFinite(video.duration) ? video.duration : timeSeconds)
  if (Math.abs(video.currentTime - clamped) < 0.033) {
    return
  }

  const seeked = waitForVideoEvent(video, 'seeked')
  video.currentTime = clamped
  await seeked
}

async function createBrowserVideoSession(sourceVideoId: string, asset: RegisteredVideoAsset): Promise<BrowserVideoSession> {
  const video = document.createElement('video')
  video.preload = 'auto'
  video.muted = true
  video.playsInline = true
  video.src = asset.objectUrl

  await waitForVideoEvent(video, 'loadedmetadata')

  const descriptor: VideoDescriptor = {
    sourceVideoId,
    durationMs: Math.max(1, Math.round(video.duration * 1000)),
    width: video.videoWidth,
    height: video.videoHeight,
  }

  return { asset, video, descriptor }
}

function isBrowserFrameExtractionSupported(): boolean {
  return typeof document !== 'undefined' && typeof HTMLVideoElement !== 'undefined'
}

export function createBrowserVideoFrameExtractor(): VideoFrameExtractor {
  const sessions = new Map<string, Promise<BrowserVideoSession>>()

  async function getSession(sourceVideoId: string): Promise<BrowserVideoSession> {
    const existing = sessions.get(sourceVideoId)
    if (existing) {
      return existing
    }

    const asset = getRegisteredSourceVideoAsset(sourceVideoId)
    if (!asset) {
      throw new Error(`No registered source video asset found for ${sourceVideoId}`)
    }

    const sessionPromise = createBrowserVideoSession(sourceVideoId, asset)
    sessions.set(sourceVideoId, sessionPromise)
    return sessionPromise
  }

  return {
    async init() {
      return
    },
    async getVideoDescriptor(sourceVideoId) {
      const session = await getSession(sourceVideoId)
      return session.descriptor
    },
    async extractFrame(sourceVideoId, timestampMs, crop) {
      const session = await getSession(sourceVideoId)
      const { descriptor, video } = session
      await seekVideo(video, timestampMs / 1000)

      const sx = crop?.x ?? 0
      const sy = crop?.y ?? 0
      const sw = crop?.width ?? descriptor.width
      const sh = crop?.height ?? descriptor.height

      const canvas = document.createElement('canvas')
      canvas.width = sw
      canvas.height = sh

      const context = canvas.getContext('2d')
      if (!context) {
        throw new Error('2D canvas context is unavailable')
      }

      context.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh)

      return {
        sourceVideoId,
        timestampMs,
        width: sw,
        height: sh,
        crop,
        syntheticText: [],
        previewDataUrl: canvas.toDataURL('image/jpeg', 0.82),
      }
    },
  }
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

export function createDefaultVideoFrameExtractor(): VideoFrameExtractor {
  const memoryExtractor = createInMemoryVideoFrameExtractor()

  if (!isBrowserFrameExtractionSupported()) {
    return memoryExtractor
  }

  const browserExtractor = createBrowserVideoFrameExtractor()

  return {
    async init() {
      await browserExtractor.init()
    },
    async getVideoDescriptor(sourceVideoId) {
      if (getRegisteredSourceVideoAsset(sourceVideoId)) {
        return browserExtractor.getVideoDescriptor(sourceVideoId)
      }
      return memoryExtractor.getVideoDescriptor(sourceVideoId)
    },
    async extractFrame(sourceVideoId, timestampMs, crop) {
      if (getRegisteredSourceVideoAsset(sourceVideoId)) {
        return browserExtractor.extractFrame(sourceVideoId, timestampMs, crop)
      }
      return memoryExtractor.extractFrame(sourceVideoId, timestampMs, crop)
    },
  }
}
