import { describe, it, expect } from 'vitest'
import {
  cropRegion,
  scaleRegion,
  ROSTER_REGION,
  SCORE_REGIONS,
  REFERENCE_FRAME_WIDTH,
  REFERENCE_FRAME_HEIGHT,
} from '@/worker/regionCrop'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeImageData(width: number, height: number, fillValue = 128): ImageData {
  const data = new Uint8ClampedArray(width * height * 4)
  // Fill all channels with fillValue so we can detect what was copied.
  data.fill(fillValue)
  return new ImageData(data, width, height)
}

// ---------------------------------------------------------------------------
// cropRegion
// ---------------------------------------------------------------------------

describe('cropRegion', () => {
  it('returns the correct dimensions for a fully-contained region', () => {
    const src = makeImageData(100, 100)
    const result = cropRegion(src, { x: 10, y: 20, width: 30, height: 40 })
    expect(result.width).toBe(30)
    expect(result.height).toBe(40)
  })

  it('copies the correct pixel values into the cropped region', () => {
    // 4×4 source with unique row values for easy verification.
    const data = new Uint8ClampedArray(4 * 4 * 4)
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const offset = (row * 4 + col) * 4
        // R = row*10, G = col*10, B = 0, A = 255
        data[offset] = row * 10
        data[offset + 1] = col * 10
        data[offset + 2] = 0
        data[offset + 3] = 255
      }
    }
    const src = new ImageData(data, 4, 4)

    // Crop the bottom-right 2×2 block (x=2, y=2, w=2, h=2).
    const result = cropRegion(src, { x: 2, y: 2, width: 2, height: 2 })
    expect(result.width).toBe(2)
    expect(result.height).toBe(2)

    // Top-left pixel of crop = source pixel at (row=2, col=2): R=20, G=20
    expect(result.data[0]).toBe(20)
    expect(result.data[1]).toBe(20)

    // Top-right pixel of crop = source pixel at (row=2, col=3): R=20, G=30
    expect(result.data[4]).toBe(20)
    expect(result.data[5]).toBe(30)
  })

  it('clamps a region that extends beyond the image boundary', () => {
    const src = makeImageData(50, 50)
    // Region extends well past the right and bottom edges.
    const result = cropRegion(src, { x: 40, y: 40, width: 100, height: 100 })
    expect(result.width).toBe(10)
    expect(result.height).toBe(10)
  })

  it('returns a 1×1 transparent pixel when region is entirely outside the image', () => {
    const src = makeImageData(10, 10)
    const result = cropRegion(src, { x: 100, y: 100, width: 20, height: 20 })
    expect(result.width).toBe(1)
    expect(result.height).toBe(1)
  })

  it('returns a 1×1 pixel for a zero-size region', () => {
    const src = makeImageData(50, 50)
    const result = cropRegion(src, { x: 5, y: 5, width: 0, height: 0 })
    expect(result.width).toBe(1)
    expect(result.height).toBe(1)
  })

  it('handles region with negative origin by clamping to 0', () => {
    const src = makeImageData(20, 20)
    // Negative x/y: clamped to 0, width/height reduced accordingly.
    const result = cropRegion(src, { x: -5, y: -5, width: 10, height: 10 })
    // After clamping: x=0, y=0, w=min(10,20)=10, h=min(10,20)=10
    expect(result.width).toBe(10)
    expect(result.height).toBe(10)
  })
})

// ---------------------------------------------------------------------------
// scaleRegion
// ---------------------------------------------------------------------------

describe('scaleRegion', () => {
  it('returns the original region unchanged at the reference resolution', () => {
    const region = ROSTER_REGION
    const scaled = scaleRegion(region, 1920, 1080)
    expect(scaled).toEqual(region)
  })

  it('halves coordinates for a half-resolution frame', () => {
    const region = { x: 100, y: 200, width: 300, height: 400 }
    const scaled = scaleRegion(region, 960, 540) // 0.5× in both axes
    expect(scaled.x).toBe(50)
    expect(scaled.y).toBe(100)
    expect(scaled.width).toBe(150)
    expect(scaled.height).toBe(200)
  })

  it('rounds fractional pixel values', () => {
    const region = { x: 1, y: 1, width: 1, height: 1 }
    // Scaling factor produces fractional values; result should be integers.
    const scaled = scaleRegion(region, 1000, 1000)
    expect(Number.isInteger(scaled.x)).toBe(true)
    expect(Number.isInteger(scaled.y)).toBe(true)
    expect(Number.isInteger(scaled.width)).toBe(true)
    expect(Number.isInteger(scaled.height)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Predefined region sanity checks
// ---------------------------------------------------------------------------

describe('predefined regions', () => {
  it('all SCORE_REGIONS columns have positive non-zero dimensions', () => {
    for (const [, region] of Object.entries(SCORE_REGIONS)) {
      expect(region.width).toBeGreaterThan(0)
      expect(region.height).toBeGreaterThan(0)
    }
  })

  it('ROSTER_REGION has positive non-zero dimensions', () => {
    expect(ROSTER_REGION.width).toBeGreaterThan(0)
    expect(ROSTER_REGION.height).toBeGreaterThan(0)
  })

  it('SCORE_REGIONS columns fit within the reference frame', () => {
    for (const [, region] of Object.entries(SCORE_REGIONS)) {
      expect(region.x + region.width).toBeLessThanOrEqual(REFERENCE_FRAME_WIDTH)
      expect(region.y + region.height).toBeLessThanOrEqual(REFERENCE_FRAME_HEIGHT)
    }
  })
})
