/**
 * Image region cropping utilities.
 *
 * All coordinates are in pixels relative to the top-left corner of the
 * source image.  The predefined regions assume a 1920×1080 source frame;
 * use scaleRegion() when frames are captured at a different resolution.
 */

export interface CropRegion {
  x: number
  y: number
  width: number
  height: number
}

/** Reference resolution for all predefined crop regions. */
export const REFERENCE_FRAME_WIDTH = 1920
export const REFERENCE_FRAME_HEIGHT = 1080

/**
 * Column-level crop regions for the in-game score leaderboard overlay.
 * Each region isolates a single column (rank, player name, or score) so
 * the OCR engine operates on the smallest possible area.
 */
export const SCORE_REGIONS = {
  rank: { x: 686, y: 174, width: 80, height: 756 } satisfies CropRegion,
  playerName: { x: 766, y: 174, width: 414, height: 756 } satisfies CropRegion,
  score: { x: 1180, y: 174, width: 280, height: 756 } satisfies CropRegion,
}

/** Region containing the guild roster name list. */
export const ROSTER_REGION: CropRegion = { x: 524, y: 180, width: 556, height: 750 }

/**
 * Extracts a rectangular sub-region from the supplied ImageData.
 *
 * The region is automatically clamped to the image bounds.  A 1×1
 * transparent-black pixel is returned when the clamped area has zero size.
 */
export function cropRegion(imageData: ImageData, region: CropRegion): ImageData {
  const srcW = imageData.width
  const srcH = imageData.height

  const x = Math.max(0, Math.min(region.x, srcW))
  const y = Math.max(0, Math.min(region.y, srcH))
  const w = Math.min(region.width, srcW - x)
  const h = Math.min(region.height, srcH - y)

  if (w <= 0 || h <= 0) {
    return new ImageData(1, 1)
  }

  const result = new ImageData(w, h)
  for (let row = 0; row < h; row++) {
    const srcOffset = ((y + row) * srcW + x) * 4
    const dstOffset = row * w * 4
    result.data.set(imageData.data.subarray(srcOffset, srcOffset + w * 4), dstOffset)
  }
  return result
}

/**
 * Scales a CropRegion from the reference resolution (1920×1080) to an
 * arbitrary frame resolution.  Use this when the captured video is not at
 * the reference resolution.
 */
export function scaleRegion(
  region: CropRegion,
  frameWidth: number,
  frameHeight: number,
): CropRegion {
  const sx = frameWidth / REFERENCE_FRAME_WIDTH
  const sy = frameHeight / REFERENCE_FRAME_HEIGHT
  return {
    x: Math.round(region.x * sx),
    y: Math.round(region.y * sy),
    width: Math.round(region.width * sx),
    height: Math.round(region.height * sy),
  }
}
