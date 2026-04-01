import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  registerFrameBatch,
  getFrameBatch,
  releaseFrameBatch,
  clearAllBatches,
  batchCount,
} from '@/worker/frameBatch'

// ---------------------------------------------------------------------------
// Helper – create a minimal ImageBitmap-like mock
// ---------------------------------------------------------------------------

function makeMockBitmap(): ImageBitmap {
  return { close: vi.fn(), width: 100, height: 100 } as unknown as ImageBitmap
}

// ---------------------------------------------------------------------------
// Setup – clear the module-level registry before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  clearAllBatches()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('registerFrameBatch / getFrameBatch', () => {
  it('stores a batch and retrieves it by batchId', () => {
    const batch = {
      batchId: 'batch-1',
      sourceVideoId: 'video-a',
      frames: [makeMockBitmap()],
    }
    registerFrameBatch(batch)
    expect(getFrameBatch('batch-1')).toBe(batch)
  })

  it('returns undefined for an unregistered batchId', () => {
    expect(getFrameBatch('does-not-exist')).toBeUndefined()
  })

  it('allows multiple independent batches to coexist', () => {
    const a = { batchId: 'a', sourceVideoId: 'v1', frames: [makeMockBitmap()] }
    const b = { batchId: 'b', sourceVideoId: 'v2', frames: [makeMockBitmap()] }
    registerFrameBatch(a)
    registerFrameBatch(b)
    expect(getFrameBatch('a')).toBe(a)
    expect(getFrameBatch('b')).toBe(b)
  })

  it('overwrites an existing entry when the same batchId is registered again', () => {
    const first = { batchId: 'dup', sourceVideoId: 'v1', frames: [] }
    const second = { batchId: 'dup', sourceVideoId: 'v2', frames: [] }
    registerFrameBatch(first)
    registerFrameBatch(second)
    expect(getFrameBatch('dup')).toBe(second)
  })
})

describe('releaseFrameBatch', () => {
  it('removes the batch from the registry', () => {
    registerFrameBatch({ batchId: 'r1', sourceVideoId: 'v', frames: [] })
    releaseFrameBatch('r1')
    expect(getFrameBatch('r1')).toBeUndefined()
  })

  it('calls close() on every ImageBitmap in the batch', () => {
    const f1 = makeMockBitmap()
    const f2 = makeMockBitmap()
    registerFrameBatch({ batchId: 'r2', sourceVideoId: 'v', frames: [f1, f2] })
    releaseFrameBatch('r2')
    expect(f1.close).toHaveBeenCalledOnce()
    expect(f2.close).toHaveBeenCalledOnce()
  })

  it('does nothing when the batchId is not registered', () => {
    // Should not throw.
    expect(() => releaseFrameBatch('ghost')).not.toThrow()
  })
})

describe('clearAllBatches', () => {
  it('removes all registered batches', () => {
    registerFrameBatch({ batchId: 'x', sourceVideoId: 'v', frames: [] })
    registerFrameBatch({ batchId: 'y', sourceVideoId: 'v', frames: [] })
    clearAllBatches()
    expect(batchCount()).toBe(0)
  })

  it('calls close() on every frame in every batch', () => {
    const frames = [makeMockBitmap(), makeMockBitmap(), makeMockBitmap()]
    registerFrameBatch({ batchId: 'c1', sourceVideoId: 'v', frames: frames.slice(0, 2) })
    registerFrameBatch({ batchId: 'c2', sourceVideoId: 'v', frames: frames.slice(2) })
    clearAllBatches()
    for (const f of frames) {
      expect(f.close).toHaveBeenCalledOnce()
    }
  })

  it('is safe to call on an already-empty registry', () => {
    expect(() => clearAllBatches()).not.toThrow()
  })
})

describe('batchCount', () => {
  it('returns 0 for an empty registry', () => {
    expect(batchCount()).toBe(0)
  })

  it('increments with each registered batch', () => {
    registerFrameBatch({ batchId: 'n1', sourceVideoId: 'v', frames: [] })
    expect(batchCount()).toBe(1)
    registerFrameBatch({ batchId: 'n2', sourceVideoId: 'v', frames: [] })
    expect(batchCount()).toBe(2)
  })

  it('decrements after release', () => {
    registerFrameBatch({ batchId: 'p1', sourceVideoId: 'v', frames: [] })
    releaseFrameBatch('p1')
    expect(batchCount()).toBe(0)
  })
})
