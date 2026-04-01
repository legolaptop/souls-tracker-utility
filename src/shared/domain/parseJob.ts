import type { IngestResult, MimicColor } from '@/shared/contracts/types'

export type ParseJobStatus = 'queued' | 'running' | 'complete' | 'failed' | 'cancelled'
export type ParseJobKind = 'roster' | 'score'

/** Immutable snapshot of a parse-job's lifecycle state. */
export interface ParseJob {
  jobId: string
  kind: ParseJobKind
  status: ParseJobStatus
  sourceVideoId: string
  /** Only present on score-parse jobs. */
  mimic?: MimicColor
  frameBatchId: string
  /** Progress percentage in the range [0, 100]. */
  progress: number
  /** Populated once the job reaches `complete` status. */
  result?: IngestResult
  /** Populated once the job reaches `failed` status. */
  error?: string
  createdAtIso: string
  updatedAtIso: string
}

function now(): string {
  return new Date().toISOString()
}

/** Creates a new roster-parse job in the `queued` state. */
export function createRosterParseJob(
  jobId: string,
  sourceVideoId: string,
  frameBatchId: string,
): ParseJob {
  const ts = now()
  return {
    jobId,
    kind: 'roster',
    status: 'queued',
    sourceVideoId,
    frameBatchId,
    progress: 0,
    createdAtIso: ts,
    updatedAtIso: ts,
  }
}

/** Creates a new score-parse job in the `queued` state. */
export function createScoreParseJob(
  jobId: string,
  sourceVideoId: string,
  mimic: MimicColor,
  frameBatchId: string,
): ParseJob {
  const ts = now()
  return {
    jobId,
    kind: 'score',
    status: 'queued',
    sourceVideoId,
    mimic,
    frameBatchId,
    progress: 0,
    createdAtIso: ts,
    updatedAtIso: ts,
  }
}

/**
 * Transitions a job from `queued` → `running`.
 * @throws When the job is not in the `queued` state.
 */
export function startJob(job: ParseJob): ParseJob {
  if (job.status !== 'queued') {
    throw new Error(`Cannot start job "${job.jobId}" in status "${job.status}"`)
  }
  return { ...job, status: 'running', progress: 0, updatedAtIso: now() }
}

/**
 * Updates the progress of a running job.  The value is clamped to [0, 100].
 * @throws When the job is not in the `running` state.
 */
export function updateJobProgress(job: ParseJob, percent: number): ParseJob {
  if (job.status !== 'running') {
    throw new Error(`Cannot update progress on job "${job.jobId}" in status "${job.status}"`)
  }
  return { ...job, progress: Math.min(100, Math.max(0, percent)), updatedAtIso: now() }
}

/**
 * Transitions a job from `running` → `complete` and attaches the result.
 * @throws When the job is not in the `running` state.
 */
export function completeJob(job: ParseJob, result: IngestResult): ParseJob {
  if (job.status !== 'running') {
    throw new Error(`Cannot complete job "${job.jobId}" in status "${job.status}"`)
  }
  return { ...job, status: 'complete', progress: 100, result, updatedAtIso: now() }
}

/**
 * Transitions a job from `queued` or `running` → `failed` and attaches the
 * error message.
 * @throws When the job is already in a terminal state.
 */
export function failJob(job: ParseJob, error: string): ParseJob {
  if (job.status !== 'running' && job.status !== 'queued') {
    throw new Error(`Cannot fail job "${job.jobId}" in status "${job.status}"`)
  }
  return { ...job, status: 'failed', error, updatedAtIso: now() }
}

/**
 * Transitions a job from `queued` or `running` → `cancelled`.
 * @throws When the job is already in a terminal state.
 */
export function cancelJob(job: ParseJob): ParseJob {
  if (job.status !== 'queued' && job.status !== 'running') {
    throw new Error(`Cannot cancel job "${job.jobId}" in status "${job.status}"`)
  }
  return { ...job, status: 'cancelled', updatedAtIso: now() }
}

/** Returns `true` when the job has reached a terminal state and will not change further. */
export function isTerminalJob(job: ParseJob): boolean {
  return job.status === 'complete' || job.status === 'failed' || job.status === 'cancelled'
}
