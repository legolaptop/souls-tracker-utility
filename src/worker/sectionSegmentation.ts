/**
 * Section segmentation for multi-Mimic leaderboard recordings.
 *
 * A single combined video may contain leaderboards for all three mimic
 * colours (red, green, white) as consecutive segments.  This module provides
 * utilities for describing those segments and for deriving them from either
 * detected boundaries or a simple even-partition fallback.
 */

import type { MimicColor } from '@/shared/contracts/types'

export interface VideoSection {
  mimic: MimicColor
  /** Inclusive start of the section in milliseconds. */
  startMs: number
  /** Exclusive end of the section in milliseconds. */
  endMs: number
}

export interface SectionBoundary {
  /** Timestamp (ms) at which this mimic's section begins. */
  timestampMs: number
  mimic: MimicColor
}

/**
 * Canonical display order of mimics within a combined leaderboard video.
 * Segment detectors should produce boundaries in this order by convention.
 */
export const MIMIC_SECTION_ORDER: readonly MimicColor[] = ['red', 'green', 'white']

/**
 * Derives VideoSection descriptors from an ordered list of detected
 * boundaries.  Each boundary marks the start of one mimic's segment; the
 * preceding segment ends where the next begins.  The last segment ends at
 * totalDurationMs.
 *
 * Boundaries are sorted by timestamp before processing, so callers do not
 * need to guarantee order.
 */
export function buildSectionsFromBoundaries(
  boundaries: SectionBoundary[],
  totalDurationMs: number,
): VideoSection[] {
  if (boundaries.length === 0) return []

  const sorted = [...boundaries].sort((a, b) => a.timestampMs - b.timestampMs)

  return sorted.map((boundary, index) => {
    const next = sorted[index + 1]
    return {
      mimic: boundary.mimic,
      startMs: boundary.timestampMs,
      endMs: next !== undefined ? next.timestampMs : totalDurationMs,
    }
  })
}

/**
 * Divides a video duration evenly among the supplied mimics, producing one
 * VideoSection per mimic in the order given.  Used as a fallback when no
 * automated boundary detection is performed.
 */
export function partitionEvenSections(
  mimics: readonly MimicColor[],
  totalDurationMs: number,
): VideoSection[] {
  if (mimics.length === 0) return []

  const sectionMs = Math.floor(totalDurationMs / mimics.length)

  return mimics.map((mimic, index) => ({
    mimic,
    startMs: index * sectionMs,
    endMs: index === mimics.length - 1 ? totalDurationMs : (index + 1) * sectionMs,
  }))
}
