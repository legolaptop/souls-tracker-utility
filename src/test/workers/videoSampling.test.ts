import { describe, expect, it } from 'vitest'

import {
  dedupeRosterCandidates,
  sampleSectionFrames,
  segmentMimicSections,
  toPixelCropRect,
} from '@/shared/workers/videoSampling'

describe('segmentMimicSections', () => {
  it('creates deterministic equal sections when explicit boundaries are absent', () => {
    const sections = segmentMimicSections(90_000, ['red', 'green', 'white'])
    expect(sections).toEqual([
      { mimic: 'red', startMs: 0, endMs: 30_000 },
      { mimic: 'green', startMs: 30_000, endMs: 60_000 },
      { mimic: 'white', startMs: 60_000, endMs: 90_000 },
    ])
  })

  it('uses explicit boundaries when they match mimic count', () => {
    const sections = segmentMimicSections(90_000, ['red', 'green', 'white'], [20_000, 50_000])
    expect(sections[0]).toEqual({ mimic: 'red', startMs: 0, endMs: 20_000 })
    expect(sections[2]).toEqual({ mimic: 'white', startMs: 50_000, endMs: 90_000 })
  })
})

describe('sampleSectionFrames', () => {
  it('samples fixed intervals and remains bounded by maxFrames', () => {
    const samples = sampleSectionFrames(
      { mimic: 'red', startMs: 0, endMs: 10_000 },
      { spacingMs: 1000, maxFrames: 5 },
    )

    expect(samples).toHaveLength(5)
    expect(samples[0].timestampMs).toBe(0)
    expect(samples[4].timestampMs).toBe(4000)
  })
})

describe('toPixelCropRect', () => {
  it('converts normalized crop and clamps within frame bounds', () => {
    const crop = toPixelCropRect(
      { width: 1000, height: 500 },
      { x: 0.9, y: 0.8, width: 0.5, height: 0.5 },
    )

    expect(crop).toEqual({ x: 900, y: 400, width: 100, height: 100 })
  })
})

describe('dedupeRosterCandidates', () => {
  it('deduplicates names and tracks seen count', () => {
    const deduped = dedupeRosterCandidates([
      { rawPlayerName: 'Alice', normalizedPlayerName: 'alice', sampleMs: 1000 },
      { rawPlayerName: 'Alice', normalizedPlayerName: 'alice', sampleMs: 1500 },
      { rawPlayerName: 'Bob', normalizedPlayerName: 'bob', sampleMs: 1200 },
    ])

    expect(deduped).toEqual([
      { rawPlayerName: 'Alice', normalizedPlayerName: 'alice', firstSeenMs: 1000, seenCount: 2 },
      { rawPlayerName: 'Bob', normalizedPlayerName: 'bob', firstSeenMs: 1200, seenCount: 1 },
    ])
  })
})
