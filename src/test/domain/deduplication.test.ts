import { describe, it, expect } from 'vitest'
import {
  deduplicateCandidates,
  deduplicateFrameBatch,
  toScoreRecord,
} from '@/shared/domain/deduplication'
import type { FrameCandidate } from '@/shared/domain/deduplication'

const base: Omit<FrameCandidate, 'frameMs'> = {
  rawPlayerName: 'Arthas',
  normalizedPlayerName: 'arthas',
  memberId: 'mem-1',
  mimic: 'red',
  rank: 1,
  rawScoreText: '10K',
  scoreValue: 10_000,
}

function makeCandidate(frameMs: number, overrides: Partial<FrameCandidate> = {}): FrameCandidate {
  return { ...base, frameMs, ...overrides }
}

// ---------------------------------------------------------------------------
// deduplicateCandidates
// ---------------------------------------------------------------------------

describe('deduplicateCandidates', () => {
  it('throws when candidates array is empty', () => {
    expect(() => deduplicateCandidates([], 'vid-1', '2024-01-01T00:00:00Z')).toThrow()
  })

  it('returns the single candidate when there is only one', () => {
    const candidate = makeCandidate(1000)
    const result = deduplicateCandidates([candidate], 'vid-1', '2024-01-01T00:00:00Z')
    expect(result.normalizedPlayerName).toBe('arthas')
    expect(result.rank).toBe(1)
    expect(result.scoreValue).toBe(10_000)
    expect(result.sourceFrames).toEqual([1000])
    expect(result.bestFrameMs).toBe(1000)
    expect(result.confidence).toBe(1)
  })

  it('picks the majority rank and score', () => {
    const candidates = [
      makeCandidate(1000, { rank: 1, scoreValue: 10_000 }),
      makeCandidate(2000, { rank: 1, scoreValue: 10_000 }),
      makeCandidate(3000, { rank: 2, scoreValue: 9_000 }), // outlier
    ]
    const result = deduplicateCandidates(candidates, 'vid-1', '2024-01-01T00:00:00Z')
    expect(result.rank).toBe(1)
    expect(result.scoreValue).toBe(10_000)
  })

  it('records all contributing frame timestamps', () => {
    const candidates = [makeCandidate(1000), makeCandidate(2000), makeCandidate(3000)]
    const result = deduplicateCandidates(candidates, 'vid-1', '2024-01-01T00:00:00Z')
    expect(result.sourceFrames).toEqual([1000, 2000, 3000])
  })

  it('computes confidence between 0 and 1', () => {
    const candidates = [
      makeCandidate(1000, { rank: 1, scoreValue: 10_000 }),
      makeCandidate(2000, { rank: 2, scoreValue: 10_000 }),
    ]
    const result = deduplicateCandidates(candidates, 'vid-1', '2024-01-01T00:00:00Z')
    expect(result.confidence).toBeGreaterThan(0)
    expect(result.confidence).toBeLessThanOrEqual(1)
  })

  it('handles null rank and scoreValue', () => {
    const candidates = [
      makeCandidate(1000, { rank: null, scoreValue: null }),
      makeCandidate(2000, { rank: null, scoreValue: null }),
    ]
    const result = deduplicateCandidates(candidates, 'vid-1', '2024-01-01T00:00:00Z')
    expect(result.rank).toBeNull()
    expect(result.scoreValue).toBeNull()
  })

  it('preserves sourceVideoId and capturedAtIso', () => {
    const result = deduplicateCandidates(
      [makeCandidate(1000)],
      'vid-42',
      '2025-03-01T00:00:00Z',
    )
    expect(result.sourceVideoId).toBe('vid-42')
    expect(result.capturedAtIso).toBe('2025-03-01T00:00:00Z')
  })
})

// ---------------------------------------------------------------------------
// deduplicateFrameBatch
// ---------------------------------------------------------------------------

describe('deduplicateFrameBatch', () => {
  it('returns an empty array for an empty input', () => {
    expect(deduplicateFrameBatch([], 'vid-1', '2024-01-01T00:00:00Z')).toEqual([])
  })

  it('groups candidates by normalizedPlayerName and mimic', () => {
    const candidates: FrameCandidate[] = [
      makeCandidate(1000, { normalizedPlayerName: 'arthas', mimic: 'red' }),
      makeCandidate(2000, { normalizedPlayerName: 'arthas', mimic: 'red' }),
      makeCandidate(3000, {
        normalizedPlayerName: 'sylvanas',
        rawPlayerName: 'Sylvanas',
        mimic: 'red',
        memberId: 'mem-2',
      }),
    ]
    const results = deduplicateFrameBatch(candidates, 'vid-1', '2024-01-01T00:00:00Z')
    expect(results).toHaveLength(2)
  })

  it('keeps different mimic groups separate', () => {
    const candidates: FrameCandidate[] = [
      makeCandidate(1000, { mimic: 'red' }),
      makeCandidate(2000, { mimic: 'green' }),
    ]
    const results = deduplicateFrameBatch(candidates, 'vid-1', '2024-01-01T00:00:00Z')
    expect(results).toHaveLength(2)
    const mimics = results.map((r) => r.mimic).sort()
    expect(mimics).toEqual(['green', 'red'])
  })
})

// ---------------------------------------------------------------------------
// toScoreRecord
// ---------------------------------------------------------------------------

describe('toScoreRecord', () => {
  it('maps all fields correctly', () => {
    const candidate = makeCandidate(5000)
    const deduped = deduplicateCandidates([candidate], 'vid-1', '2024-01-15T00:00:00Z')
    const record = toScoreRecord(deduped, 'rec-1')

    expect(record.id).toBe('rec-1')
    expect(record.memberId).toBe('mem-1')
    expect(record.rawPlayerName).toBe('Arthas')
    expect(record.normalizedPlayerName).toBe('arthas')
    expect(record.mimic).toBe('red')
    expect(record.rank).toBe(1)
    expect(record.rawScoreText).toBe('10K')
    expect(record.scoreValue).toBe(10_000)
    expect(record.sourceFrameMs).toBe(5000)
    expect(record.sourceVideoId).toBe('vid-1')
    expect(record.capturedAtIso).toBe('2024-01-15T00:00:00Z')
  })
})
