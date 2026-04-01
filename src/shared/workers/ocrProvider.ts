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

/**
 * Stub OCR provider for client-side development. Replace with a concrete OCR
 * engine adapter (Tesseract, PaddleOCR WASM, etc.) without changing workers.
 */
export function createStubOcrProvider(): OcrProvider {
  return {
    async init(context) {
      if (context.modelAssetPath) {
        toWorkerAssetUrl(context.modelAssetPath, context.origin)
      }
    },
    async recognize(frame) {
      const fallbackLine = `1 ${frame.sourceVideoId.replace(/[^a-z0-9-]/gi, '').slice(0, 8) || 'player'} 100K`
      const lines = (frame.syntheticText?.length ? frame.syntheticText : [fallbackLine]).map((text) => ({
        text,
        confidence: 0.75,
      }))
      return { lines }
    },
  }
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
