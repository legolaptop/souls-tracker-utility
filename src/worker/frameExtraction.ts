/**
 * Video frame extraction utilities for use inside a Web Worker.
 *
 * Frame extraction relies on OffscreenCanvas, which is available in
 * dedicated Web Workers in all modern browsers.  Because OffscreenCanvas is
 * not available in jsdom, this module is intentionally excluded from unit-test
 * coverage; integration tests should run in a real browser or a
 * Worker-aware environment.
 *
 * GitHub-Pages note: no network requests are made here.  All frame data is
 * derived from ImageBitmap objects that the main thread transfers to the
 * worker after decoding a locally-selected video file.
 *
 * Integration pattern
 * ───────────────────
 * 1. Main thread: user selects a video file → Blob URL is created.
 * 2. Main thread: seek <video> element to each sample timestamp, paint to
 *    <canvas>, call createImageBitmap(canvas) → transfers the result to the
 *    worker via registerFrameBatch() messages.
 * 3. Worker: calls bitmapToImageData() on each received ImageBitmap to obtain
 *    an ImageData suitable for region cropping and OCR.
 */

export interface FrameExtractionOptions {
  /**
   * When set, the longer dimension of the output is capped at this value
   * and the aspect ratio is preserved.  Reduces the data volume passed to
   * the OCR engine for large captures.
   */
  maxDimension?: number
}

/**
 * Converts an ImageBitmap into an ImageData by rendering it onto an
 * OffscreenCanvas.  The bitmap is NOT closed by this function; lifecycle
 * management is the caller's responsibility.
 *
 * @throws {Error} If a 2D context cannot be obtained from OffscreenCanvas.
 */
export function bitmapToImageData(
  bitmap: ImageBitmap,
  options: FrameExtractionOptions = {},
): ImageData {
  let { width, height } = bitmap

  if (
    options.maxDimension !== undefined &&
    (width > options.maxDimension || height > options.maxDimension)
  ) {
    const scale = options.maxDimension / Math.max(width, height)
    width = Math.round(width * scale)
    height = Math.round(height * scale)
  }

  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')
  if (ctx === null) {
    throw new Error('bitmapToImageData: failed to obtain 2d context from OffscreenCanvas')
  }
  ctx.drawImage(bitmap, 0, 0, width, height)
  return ctx.getImageData(0, 0, width, height)
}
