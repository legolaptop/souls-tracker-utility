import type { CropRect } from '@/shared/workers/ocrProvider'
import {
  createInMemoryVideoFrameExtractor,
  type ExtractedFrame,
  type VideoFrameExtractor,
} from '@/shared/workers/videoFrameExtractor'

export type VideoExtractRequest =
  | { type: 'INIT_VIDEO_EXTRACTOR' }
  | {
      type: 'EXTRACT_FRAME_BATCH'
      payload: {
        sourceVideoId: string
        jobId: string
        timestampsMs: number[]
        crop?: CropRect
      }
    }
  | {
      type: 'CANCEL_JOB'
      payload: {
        jobId: string
      }
    }

export type VideoExtractResponse =
  | { type: 'VIDEO_EXTRACTOR_READY' }
  | {
      type: 'FRAME_BATCH_PROGRESS'
      payload: { jobId: string; percent: number }
    }
  | {
      type: 'FRAME_BATCH_COMPLETE'
      payload: { jobId: string; frames: ExtractedFrame[] }
    }
  | {
      type: 'VIDEO_EXTRACT_ERROR'
      payload: { jobId?: string; message: string }
    }

export interface VideoExtractWorkerDeps {
  extractor: VideoFrameExtractor
}

const defaultDeps: VideoExtractWorkerDeps = {
  extractor: createInMemoryVideoFrameExtractor(),
}

interface WorkerScopeLike {
  addEventListener: (
    type: 'message',
    listener: (event: MessageEvent<VideoExtractRequest>) => void,
  ) => void
  postMessage: (message: VideoExtractResponse) => void
}

export function createVideoExtractMessageHandler(deps: VideoExtractWorkerDeps = defaultDeps) {
  const cancelled = new Set<string>()

  function ensureActiveJob(jobId: string): void {
    if (cancelled.has(jobId)) {
      cancelled.delete(jobId)
      throw new Error('Job cancelled')
    }
  }

  return async function handle(
    request: VideoExtractRequest,
    postMessage: (response: VideoExtractResponse) => void,
  ): Promise<void> {
    try {
      if (request.type === 'INIT_VIDEO_EXTRACTOR') {
        await deps.extractor.init()
        postMessage({ type: 'VIDEO_EXTRACTOR_READY' })
        return
      }

      if (request.type === 'CANCEL_JOB') {
        cancelled.add(request.payload.jobId)
        return
      }

      const { jobId, sourceVideoId, timestampsMs, crop } = request.payload
      const frames: ExtractedFrame[] = []

      for (let index = 0; index < timestampsMs.length; index++) {
        ensureActiveJob(jobId)

        const frame = await deps.extractor.extractFrame(sourceVideoId, timestampsMs[index], crop)
        frames.push(frame)
        postMessage({
          type: 'FRAME_BATCH_PROGRESS',
          payload: { jobId, percent: Math.round(((index + 1) / timestampsMs.length) * 100) },
        })
      }

      ensureActiveJob(jobId)

      postMessage({
        type: 'FRAME_BATCH_COMPLETE',
        payload: { jobId, frames },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown extraction error'
      const jobId = request.type === 'EXTRACT_FRAME_BATCH' ? request.payload.jobId : undefined
      postMessage({ type: 'VIDEO_EXTRACT_ERROR', payload: { jobId, message } })
    }
  }
}

function maybeRegisterWorkerRuntime(): void {
  const scope = globalThis as Partial<WorkerScopeLike>
  if (typeof scope.addEventListener !== 'function' || typeof scope.postMessage !== 'function') {
    return
  }

  const handle = createVideoExtractMessageHandler(defaultDeps)
  scope.addEventListener('message', (event: MessageEvent<VideoExtractRequest>) => {
    void handle(event.data, (response) => {
      scope.postMessage?.(response)
    })
  })
}

maybeRegisterWorkerRuntime()
