import { describe, it, expect } from 'vitest'
import {
  cancelJob,
  completeJob,
  createRosterParseJob,
  createScoreParseJob,
  failJob,
  isTerminalJob,
  startJob,
  updateJobProgress,
} from '@/shared/domain/parseJob'
import type { IngestResult } from '@/shared/contracts/types'

const emptyResult: IngestResult = {
  sourceVideoId: 'vid-1',
  records: [],
  issues: [],
}

// ---------------------------------------------------------------------------
// createRosterParseJob
// ---------------------------------------------------------------------------

describe('createRosterParseJob', () => {
  it('creates a job in the queued state', () => {
    const job = createRosterParseJob('job-1', 'vid-1', 'batch-1')
    expect(job.jobId).toBe('job-1')
    expect(job.kind).toBe('roster')
    expect(job.status).toBe('queued')
    expect(job.sourceVideoId).toBe('vid-1')
    expect(job.frameBatchId).toBe('batch-1')
    expect(job.progress).toBe(0)
    expect(job.mimic).toBeUndefined()
  })

  it('sets createdAtIso and updatedAtIso', () => {
    const job = createRosterParseJob('job-1', 'vid-1', 'batch-1')
    expect(job.createdAtIso).toBeTruthy()
    expect(job.updatedAtIso).toBe(job.createdAtIso)
  })
})

// ---------------------------------------------------------------------------
// createScoreParseJob
// ---------------------------------------------------------------------------

describe('createScoreParseJob', () => {
  it('creates a score job with the given mimic', () => {
    const job = createScoreParseJob('job-2', 'vid-1', 'green', 'batch-1')
    expect(job.kind).toBe('score')
    expect(job.mimic).toBe('green')
    expect(job.status).toBe('queued')
  })
})

// ---------------------------------------------------------------------------
// startJob
// ---------------------------------------------------------------------------

describe('startJob', () => {
  it('transitions a queued job to running', () => {
    const job = createRosterParseJob('job-1', 'vid-1', 'batch-1')
    const started = startJob(job)
    expect(started.status).toBe('running')
    expect(started.progress).toBe(0)
  })

  it('throws when the job is not queued', () => {
    const running = startJob(createRosterParseJob('job-1', 'vid-1', 'batch-1'))
    expect(() => startJob(running)).toThrow()
  })

  it('does not mutate the original job', () => {
    const job = createRosterParseJob('job-1', 'vid-1', 'batch-1')
    startJob(job)
    expect(job.status).toBe('queued')
  })
})

// ---------------------------------------------------------------------------
// updateJobProgress
// ---------------------------------------------------------------------------

describe('updateJobProgress', () => {
  it('updates progress while running', () => {
    const running = startJob(createRosterParseJob('job-1', 'vid-1', 'batch-1'))
    const updated = updateJobProgress(running, 50)
    expect(updated.progress).toBe(50)
    expect(updated.status).toBe('running')
  })

  it('clamps progress to [0, 100]', () => {
    const running = startJob(createRosterParseJob('job-1', 'vid-1', 'batch-1'))
    expect(updateJobProgress(running, -10).progress).toBe(0)
    expect(updateJobProgress(running, 150).progress).toBe(100)
  })

  it('throws when the job is not running', () => {
    const job = createRosterParseJob('job-1', 'vid-1', 'batch-1')
    expect(() => updateJobProgress(job, 50)).toThrow()
  })
})

// ---------------------------------------------------------------------------
// completeJob
// ---------------------------------------------------------------------------

describe('completeJob', () => {
  it('transitions a running job to complete', () => {
    const running = startJob(createRosterParseJob('job-1', 'vid-1', 'batch-1'))
    const completed = completeJob(running, emptyResult)
    expect(completed.status).toBe('complete')
    expect(completed.progress).toBe(100)
    expect(completed.result).toEqual(emptyResult)
  })

  it('throws when the job is not running', () => {
    const job = createRosterParseJob('job-1', 'vid-1', 'batch-1')
    expect(() => completeJob(job, emptyResult)).toThrow()
  })
})

// ---------------------------------------------------------------------------
// failJob
// ---------------------------------------------------------------------------

describe('failJob', () => {
  it('can fail a queued job', () => {
    const job = createRosterParseJob('job-1', 'vid-1', 'batch-1')
    const failed = failJob(job, 'network error')
    expect(failed.status).toBe('failed')
    expect(failed.error).toBe('network error')
  })

  it('can fail a running job', () => {
    const running = startJob(createRosterParseJob('job-1', 'vid-1', 'batch-1'))
    const failed = failJob(running, 'ocr error')
    expect(failed.status).toBe('failed')
  })

  it('throws when the job is already complete', () => {
    const running = startJob(createRosterParseJob('job-1', 'vid-1', 'batch-1'))
    const completed = completeJob(running, emptyResult)
    expect(() => failJob(completed, 'too late')).toThrow()
  })
})

// ---------------------------------------------------------------------------
// cancelJob
// ---------------------------------------------------------------------------

describe('cancelJob', () => {
  it('can cancel a queued job', () => {
    const job = createRosterParseJob('job-1', 'vid-1', 'batch-1')
    expect(cancelJob(job).status).toBe('cancelled')
  })

  it('can cancel a running job', () => {
    const running = startJob(createRosterParseJob('job-1', 'vid-1', 'batch-1'))
    expect(cancelJob(running).status).toBe('cancelled')
  })

  it('throws when the job is already in a terminal state', () => {
    const running = startJob(createRosterParseJob('job-1', 'vid-1', 'batch-1'))
    const cancelled = cancelJob(running)
    expect(() => cancelJob(cancelled)).toThrow()
  })
})

// ---------------------------------------------------------------------------
// isTerminalJob
// ---------------------------------------------------------------------------

describe('isTerminalJob', () => {
  it('returns false for queued and running', () => {
    const queued = createRosterParseJob('j', 'v', 'b')
    expect(isTerminalJob(queued)).toBe(false)
    expect(isTerminalJob(startJob(queued))).toBe(false)
  })

  it('returns true for complete, failed, and cancelled', () => {
    const running = startJob(createRosterParseJob('j', 'v', 'b'))
    expect(isTerminalJob(completeJob(running, emptyResult))).toBe(true)
    expect(isTerminalJob(failJob(running, 'err'))).toBe(true)
    expect(isTerminalJob(cancelJob(running))).toBe(true)
  })
})
