import type { IngestResult, MimicColor } from '@/shared/contracts/types'

export const workerContractVersion = '1.0.0'

export type WorkerRequest =
  | {
      type: 'INIT_WORKER'
      payload: {
        contractVersion: typeof workerContractVersion
      }
    }
  | {
      type: 'PARSE_ROSTER_FRAME_BATCH'
      payload: {
        sourceVideoId: string
        frameBatchId: string
      }
    }
  | {
      type: 'PARSE_SCORE_FRAME_BATCH'
      payload: {
        sourceVideoId: string
        mimic: MimicColor
        frameBatchId: string
      }
    }
  | {
      type: 'CANCEL_JOB'
      payload: {
        jobId: string
      }
    }

export type WorkerResponse =
  | {
      type: 'WORKER_READY'
      payload: {
        contractVersion: typeof workerContractVersion
      }
    }
  | {
      type: 'PARSE_PROGRESS'
      payload: {
        jobId: string
        percent: number
      }
    }
  | {
      type: 'PARSE_COMPLETE'
      payload: {
        jobId: string
        result: IngestResult
      }
    }
  | {
      type: 'WORKER_ERROR'
      payload: {
        jobId?: string
        message: string
      }
    }
