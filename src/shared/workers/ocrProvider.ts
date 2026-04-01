import { toWorkerAssetUrl } from '@/shared/workers/assetPaths'

export interface OcrTextLine {
  text: string
  confidence: number
}

export interface OcrRecognitionResult {
  lines: OcrTextLine[]
}

export interface OcrTargetFrame {
  sourceVideoId: string
  timestampMs: number
  width: number
  height: number
  crop?: CropRect
  syntheticText?: string[]
  previewDataUrl?: string
}

export interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

export interface OcrRuntimeContext {
  origin: string
  language: string
  modelAssetPath?: string
}

export interface OcrProvider {
  init(context: OcrRuntimeContext): Promise<void>
  recognize(frame: OcrTargetFrame): Promise<OcrRecognitionResult>
}

export type OcrProviderFactory = () => Promise<OcrProvider>

interface StubOcrProviderOptions {
  generateFallbackLine?: boolean
}

interface NativeDetectedTextBlock {
  rawValue?: string
  boundingBox?: {
    x: number
    y: number
    width: number
    height: number
  }
}

interface NativeTextDetector {
  detect(source: ImageBitmapSource): Promise<NativeDetectedTextBlock[]>
}

type NativeTextDetectorConstructor = new (options?: { languages?: string[] }) => NativeTextDetector

function getNativeTextDetectorConstructor(): NativeTextDetectorConstructor | null {
  const globalWithDetector = globalThis as typeof globalThis & {
    TextDetector?: NativeTextDetectorConstructor
  }

  return globalWithDetector.TextDetector ?? null
}

function sortDetectedBlocks(blocks: NativeDetectedTextBlock[]): NativeDetectedTextBlock[] {
  return [...blocks].sort((left, right) => {
    const topDelta = (left.boundingBox?.y ?? 0) - (right.boundingBox?.y ?? 0)
    if (Math.abs(topDelta) > 4) {
      return topDelta
    }

    return (left.boundingBox?.x ?? 0) - (right.boundingBox?.x ?? 0)
  })
}

function normalizeDetectedLines(blocks: NativeDetectedTextBlock[]): OcrTextLine[] {
  return sortDetectedBlocks(blocks)
    .flatMap((block) => (block.rawValue ?? '').split(/\r?\n/))
    .map((text) => text.trim())
    .filter((text) => text.length > 0)
    .map((text) => ({ text, confidence: 0.9 }))
}

async function createImageBitmapFromDataUrl(dataUrl: string): Promise<ImageBitmap | null> {
  if (typeof fetch !== 'function' || typeof createImageBitmap !== 'function') {
    return null
  }

  const response = await fetch(dataUrl)
  const blob = await response.blob()
  return createImageBitmap(blob)
}

export function isNativeTextDetectorAvailable(): boolean {
  return getNativeTextDetectorConstructor() !== null
}

/**
 * Stub OCR provider for client-side development. Replace with a concrete OCR
 * engine adapter (Tesseract, PaddleOCR WASM, etc.) without changing workers.
 */
export function createStubOcrProvider(options: StubOcrProviderOptions = {}): OcrProvider {
  const generateFallbackLine = options.generateFallbackLine ?? true

  return {
    async init(context) {
      if (context.modelAssetPath) {
        toWorkerAssetUrl(context.modelAssetPath, context.origin)
      }
    },
    async recognize(frame) {
      const fallbackLine = `1 ${frame.sourceVideoId.replace(/[^a-z0-9-]/gi, '').slice(0, 8) || 'player'} 100K`
      const texts = frame.syntheticText?.length
        ? frame.syntheticText
        : generateFallbackLine
          ? [fallbackLine]
          : []

      const lines = texts.map((text) => ({
        text,
        confidence: 0.75,
      }))
      return { lines }
    },
  }
}

export function createNativeTextDetectorOcrProvider(
  fallback: OcrProvider = createStubOcrProvider({ generateFallbackLine: false }),
): OcrProvider {
  let detector: NativeTextDetector | null = null
  let initContext: OcrRuntimeContext | null = null

  return {
    async init(context) {
      initContext = context
      await fallback.init(context)

      const TextDetectorCtor = getNativeTextDetectorConstructor()
      if (!TextDetectorCtor) {
        detector = null
        return
      }

      try {
        detector = new TextDetectorCtor({ languages: [context.language] })
      } catch {
        try {
          detector = new TextDetectorCtor()
        } catch {
          detector = null
        }
      }
    },
    async recognize(frame) {
      if (!detector) {
        if (initContext) {
          return fallback.recognize(frame)
        }
        return fallback.recognize(frame)
      }

      if (!frame.previewDataUrl) {
        return fallback.recognize(frame)
      }

      const bitmap = await createImageBitmapFromDataUrl(frame.previewDataUrl)
      if (!bitmap) {
        return fallback.recognize(frame)
      }

      try {
        const blocks = await detector.detect(bitmap)
        const lines = normalizeDetectedLines(blocks)
        if (lines.length > 0) {
          return { lines }
        }
      } catch {
        return fallback.recognize(frame)
      } finally {
        bitmap.close()
      }

      return fallback.recognize(frame)
    },
  }
}

export function createDefaultOcrProvider(): OcrProvider {
  return createNativeTextDetectorOcrProvider(createStubOcrProvider({ generateFallbackLine: false }))
}

/**
 * Lazy-load wrapper so heavy OCR dependencies are loaded only after INIT_WORKER.
 */
export function createLazyOcrProvider(factory: OcrProviderFactory): OcrProvider {
  let provider: OcrProvider | null = null

  async function getProvider(): Promise<OcrProvider> {
    if (!provider) {
      provider = await factory()
    }
    return provider
  }

  return {
    async init(context) {
      const loadedProvider = await getProvider()
      await loadedProvider.init(context)
    },
    async recognize(frame) {
      const loadedProvider = await getProvider()
      return loadedProvider.recognize(frame)
    },
  }
}
