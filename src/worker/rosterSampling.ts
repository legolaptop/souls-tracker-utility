/**
 * Roster-video frame sampling strategy.
 *
 * Roster videos can be long.  This module provides utilities to select a
 * manageable subset of frame timestamps that give good coverage of the
 * on-screen roster list without processing every single frame.
 */

export interface RosterSamplingOptions {
  /**
   * Maximum number of frames to sample.
   * Defaults to DEFAULT_MAX_SAMPLES.
   */
  maxSamples?: number

  /**
   * Earliest timestamp (ms) to include.  Defaults to 0.
   * Use this to skip intros or loading screens.
   */
  startMs?: number

  /**
   * Latest timestamp (ms) to include.  Defaults to totalDurationMs.
   */
  endMs?: number

  /**
   * Fixed interval (ms) between consecutive samples.  When omitted the
   * interval is calculated automatically to spread maxSamples evenly across
   * the sampling window.
   */
  intervalMs?: number
}

export const DEFAULT_MAX_SAMPLES = 10

/**
 * Computes an evenly-spaced list of frame timestamps (in milliseconds) for
 * roster video sampling.
 *
 * • The first sample is always at startMs.
 * • When maxSamples >= 2 the last sample is always at endMs.
 * • An empty array is returned when the sampling window is empty or
 *   maxSamples <= 0.
 */
export function computeRosterSampleTimestamps(
  totalDurationMs: number,
  options: RosterSamplingOptions = {},
): number[] {
  const startMs = options.startMs ?? 0
  const endMs = options.endMs ?? totalDurationMs
  const maxSamples = options.maxSamples ?? DEFAULT_MAX_SAMPLES

  if (startMs >= endMs || maxSamples <= 0) return []
  if (maxSamples === 1) return [startMs]

  const span = endMs - startMs
  const interval = options.intervalMs ?? Math.floor(span / (maxSamples - 1))

  if (interval <= 0) return [startMs]

  const timestamps: number[] = []
  for (let i = 0; i < maxSamples; i++) {
    const ts = startMs + i * interval
    if (ts >= endMs) break
    timestamps.push(ts)
  }

  // Always include endMs as the final sample.
  if (timestamps.length === 0 || timestamps[timestamps.length - 1] !== endMs) {
    if (timestamps.length >= maxSamples) {
      // Replace the last entry to keep the array within maxSamples.
      timestamps[timestamps.length - 1] = endMs
    } else {
      timestamps.push(endMs)
    }
  }

  return timestamps
}
