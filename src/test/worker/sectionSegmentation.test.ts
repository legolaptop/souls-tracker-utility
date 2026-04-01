import { describe, it, expect } from 'vitest'
import {
  buildSectionsFromBoundaries,
  partitionEvenSections,
  MIMIC_SECTION_ORDER,
} from '@/worker/sectionSegmentation'

// ---------------------------------------------------------------------------
// buildSectionsFromBoundaries
// ---------------------------------------------------------------------------

describe('buildSectionsFromBoundaries', () => {
  it('returns an empty array when no boundaries are supplied', () => {
    expect(buildSectionsFromBoundaries([], 60_000)).toEqual([])
  })

  it('produces a single section spanning the whole video for one boundary', () => {
    const sections = buildSectionsFromBoundaries(
      [{ timestampMs: 0, mimic: 'red' }],
      60_000,
    )
    expect(sections).toHaveLength(1)
    expect(sections[0]).toEqual({ mimic: 'red', startMs: 0, endMs: 60_000 })
  })

  it('derives correct start/end times for three sequential boundaries', () => {
    const boundaries = [
      { timestampMs: 0, mimic: 'red' as const },
      { timestampMs: 30_000, mimic: 'green' as const },
      { timestampMs: 60_000, mimic: 'white' as const },
    ]
    const sections = buildSectionsFromBoundaries(boundaries, 90_000)

    expect(sections).toHaveLength(3)
    expect(sections[0]).toEqual({ mimic: 'red', startMs: 0, endMs: 30_000 })
    expect(sections[1]).toEqual({ mimic: 'green', startMs: 30_000, endMs: 60_000 })
    expect(sections[2]).toEqual({ mimic: 'white', startMs: 60_000, endMs: 90_000 })
  })

  it('sorts unsorted boundaries by timestamp before producing sections', () => {
    const boundaries = [
      { timestampMs: 60_000, mimic: 'white' as const },
      { timestampMs: 0, mimic: 'red' as const },
      { timestampMs: 30_000, mimic: 'green' as const },
    ]
    const sections = buildSectionsFromBoundaries(boundaries, 90_000)

    expect(sections[0].mimic).toBe('red')
    expect(sections[1].mimic).toBe('green')
    expect(sections[2].mimic).toBe('white')
  })

  it('uses totalDurationMs as the end of the last section', () => {
    const sections = buildSectionsFromBoundaries(
      [{ timestampMs: 0, mimic: 'green' }],
      120_000,
    )
    expect(sections[0].endMs).toBe(120_000)
  })
})

// ---------------------------------------------------------------------------
// partitionEvenSections
// ---------------------------------------------------------------------------

describe('partitionEvenSections', () => {
  it('returns an empty array for an empty mimics list', () => {
    expect(partitionEvenSections([], 90_000)).toEqual([])
  })

  it('produces one section spanning the whole video for a single mimic', () => {
    const sections = partitionEvenSections(['red'], 90_000)
    expect(sections).toHaveLength(1)
    expect(sections[0]).toEqual({ mimic: 'red', startMs: 0, endMs: 90_000 })
  })

  it('divides the video evenly among three mimics', () => {
    const sections = partitionEvenSections(['red', 'green', 'white'], 90_000)
    expect(sections).toHaveLength(3)
    expect(sections[0]).toEqual({ mimic: 'red', startMs: 0, endMs: 30_000 })
    expect(sections[1]).toEqual({ mimic: 'green', startMs: 30_000, endMs: 60_000 })
    expect(sections[2]).toEqual({ mimic: 'white', startMs: 60_000, endMs: 90_000 })
  })

  it('ensures the last section ends exactly at totalDurationMs', () => {
    // 91 000 ms is not evenly divisible by 3.
    const sections = partitionEvenSections(['red', 'green', 'white'], 91_000)
    expect(sections[sections.length - 1].endMs).toBe(91_000)
  })

  it('sections form a contiguous, non-overlapping sequence starting at 0', () => {
    const sections = partitionEvenSections(['red', 'green', 'white'], 90_000)
    expect(sections[0].startMs).toBe(0)
    for (let i = 1; i < sections.length; i++) {
      expect(sections[i].startMs).toBe(sections[i - 1].endMs)
    }
  })
})

// ---------------------------------------------------------------------------
// MIMIC_SECTION_ORDER
// ---------------------------------------------------------------------------

describe('MIMIC_SECTION_ORDER', () => {
  it('contains all three mimic colours in canonical order', () => {
    expect(MIMIC_SECTION_ORDER).toEqual(['red', 'green', 'white'])
  })
})
