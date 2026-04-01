import type { OcrProvider, OcrRegionResult } from './ocrProvider'

/**
 * No-op OCR provider used when no real engine is available.
 *
 * Always returns empty results without inspecting ImageData.
 * Safe to use in tests and during early development while the full OCR
 * engine (e.g. a Tesseract.js wrapper) is not yet wired in.
 *
 * To replace with a real provider, implement OcrProvider and swap it in
 * inside getOrInitOcrProvider() in parser.worker.ts using a dynamic import:
 *
 *   const { TesseractOcrProvider } = await import('./tesseractProvider')
 *   ocrProvider = new TesseractOcrProvider()
 *
 * The dynamic import keeps the heavy model file out of the initial worker
 * bundle, which is essential for GitHub-Pages deployments where every byte
 * of the initial load matters.
 */
export class StubOcrProvider implements OcrProvider {
  async initialize(): Promise<void> {
    // intentionally empty – no engine to load
  }

  // The OcrProvider interface requires an ImageData argument; the stub
  // intentionally ignores it because it never inspects pixels.
  async recognizeRegion(_imageData: ImageData): Promise<OcrRegionResult> {
    return { lines: [], elapsedMs: 0 }
  }

  async terminate(): Promise<void> {
    // intentionally empty – nothing to release
  }
}
