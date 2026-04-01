import { describe, it, expect } from 'vitest'
import {
  computeRosterSampleTimestamps,
  DEFAULT_MAX_SAMPLES,
} from '@/worker/rosterSampling'

describe('computeRosterSampleTimestamps', () => {
  // ── basic behaviour ──────────────────────────────────────────────────────

  it('returns an empty array when maxSamples is 0', () => {
    expect(computeRosterSampleTimestamps(60_000, { maxSamples: 0 })).toEqual([])
  })

  it('returns an empty array when startMs >= endMs', () => {
    expect(computeRosterSampleTimestamps(60_000, { startMs: 60_000, endMs: 30_000 })).toEqual([])
    expect(computeRosterSampleTimestamps(60_000, { startMs: 30_000, endMs: 30_000 })).toEqual([])
  })

  it('returns [startMs] for maxSamples = 1', () => {
    const result = computeRosterSampleTimestamps(60_000, { maxSamples: 1, startMs: 5_000 })
    expect(result).toEqual([5_000])
  })

  it('returns an array with length ≤ maxSamples', () => {
    const result = computeRosterSampleTimestamps(60_000, { maxSamples: 5 })
    expect(result.length).toBeLessThanOrEqual(5)
  })

  it('always starts at startMs and ends at endMs when maxSamples >= 2', () => {
    const result = computeRosterSampleTimestamps(90_000, {
      maxSamples: 4,
      startMs: 10_000,
      endMs: 80_000,
    })
    expect(result[0]).toBe(10_000)
    expect(result[result.length - 1]).toBe(80_000)
  })

  it('uses 0 as the default startMs', () => {
    const result = computeRosterSampleTimestamps(60_000, { maxSamples: 3 })
    expect(result[0]).toBe(0)
  })

  it('uses totalDurationMs as the default endMs', () => {
    const result = computeRosterSampleTimestamps(60_000, { maxSamples: 3 })
    expect(result[result.length - 1]).toBe(60_000)
  })

  // ── spacing ──────────────────────────────────────────────────────────────

  it('produces evenly-spaced timestamps between startMs and endMs', () => {
    const result = computeRosterSampleTimestamps(40_000, {
      maxSamples: 5,
      startMs: 0,
      endMs: 40_000,
    })
    // Expected: 0, 10000, 20000, 30000, 40000
    expect(result).toEqual([0, 10_000, 20_000, 30_000, 40_000])
  })

  it('honours an explicit intervalMs', () => {
    const result = computeRosterSampleTimestamps(60_000, {
      startMs: 0,
      endMs: 60_000,
      maxSamples: 10,
      intervalMs: 20_000,
    })
    // With interval 20 000 ms: 0, 20000, 40000 (60000 appended as last)
    expect(result[0]).toBe(0)
    expect(result).toContain(20_000)
    expect(result).toContain(40_000)
    expect(result[result.length - 1]).toBe(60_000)
  })

  it('all returned timestamps are within [startMs, endMs]', () => {
    const startMs = 5_000
    const endMs = 50_000
    const result = computeRosterSampleTimestamps(90_000, {
      maxSamples: DEFAULT_MAX_SAMPLES,
      startMs,
      endMs,
    })
    for (const ts of result) {
      expect(ts).toBeGreaterThanOrEqual(startMs)
      expect(ts).toBeLessThanOrEqual(endMs)
    }
  })

  it('returned timestamps are strictly non-decreasing', () => {
    const result = computeRosterSampleTimestamps(120_000, { maxSamples: DEFAULT_MAX_SAMPLES })
    for (let i = 1; i < result.length; i++) {
      expect(result[i]).toBeGreaterThanOrEqual(result[i - 1])
    }
  })

  // ── edge cases ───────────────────────────────────────────────────────────

  it('DEFAULT_MAX_SAMPLES is a positive integer', () => {
    expect(Number.isInteger(DEFAULT_MAX_SAMPLES)).toBe(true)
    expect(DEFAULT_MAX_SAMPLES).toBeGreaterThan(0)
  })

  it('handles a very short video (1 ms) without error', () => {
    const result = computeRosterSampleTimestamps(1)
    expect(result.length).toBeGreaterThanOrEqual(1)
  })
})
