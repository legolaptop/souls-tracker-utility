/**
 * Provider-agnostic OCR interface for client-side text recognition.
 *
 * Concrete providers (e.g. a Tesseract.js wrapper) implement OcrProvider.
 * The stub provider is the default until a real engine is wired in.
 *
 * Providers are expected to be lazily initialised: call initialize() before
 * the first recognizeRegion() to avoid loading large model files during
 * worker startup (GitHub-Pages-safe, no server-side pre-loading required).
 */

export interface OcrBoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface OcrWord {
  text: string
  /** Confidence score, 0 (lowest) to 1 (highest). */
  confidence: number
  boundingBox: OcrBoundingBox
}

export interface OcrLineResult {
  /** Full reconstructed text for the line. */
  text: string
  words: OcrWord[]
}

export interface OcrRegionResult {
  lines: OcrLineResult[]
  /** Wall-clock duration of the recognition pass in milliseconds. */
  elapsedMs: number
}

export interface OcrProvider {
  /**
   * One-time initialisation (download models, warm up engine, etc.).
   * Must be awaited before calling recognizeRegion.
   */
  initialize(): Promise<void>

  /**
   * Recognise text within the supplied ImageData region.
   * The provider must be initialised before this is called.
   */
  recognizeRegion(imageData: ImageData): Promise<OcrRegionResult>

  /** Release all resources held by the provider (thread pools, WASM, etc.). */
  terminate(): Promise<void>
}
