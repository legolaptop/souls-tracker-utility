import { normalizePlayerName } from '@/shared/domain/normalization'
import type { OcrProvider } from '@/shared/workers/ocrProvider'
import type { VideoFrameExtractor } from '@/shared/workers/videoFrameExtractor'
import { dedupeRosterCandidates, sampleSectionFrames } from '@/shared/workers/videoSampling'

export interface MemberOcrDeps {
  extractor: VideoFrameExtractor
  ocr: OcrProvider
}

export interface MemberOcrCandidate {
  rawPlayerName: string
  normalizedPlayerName: string
  sampleMs: number
}

export interface MemberOcrResult {
  sourceVideoId: string
  candidates: Array<{
    rawPlayerName: string
    normalizedPlayerName: string
    firstSeenMs: number
    seenCount: number
  }>
}

export interface MemberOcrOptions {
  sourceVideoId: string
  frameBatchId: string
  shouldCancel: () => boolean
  onProgress?: (percent: number) => void
}

export async function runRosterBatchOcr(
  deps: MemberOcrDeps,
  options: MemberOcrOptions,
): Promise<MemberOcrResult> {
  const descriptor = await deps.extractor.getVideoDescriptor(options.sourceVideoId)
  const rosterSection = {
    mimic: 'red' as const,
    startMs: 0,
    endMs: descriptor.durationMs,
  }
  const samples = sampleSectionFrames(rosterSection, { spacingMs: 900, maxFrames: 100 })

  const rawCandidates: MemberOcrCandidate[] = []

  for (let index = 0; index < samples.length; index++) {
    if (options.shouldCancel()) {
      break
    }

    const sample = samples[index]
    const frame = await deps.extractor.extractFrame(options.sourceVideoId, sample.timestampMs)
    const ocr = await deps.ocr.recognize(frame)

    for (const line of ocr.lines) {
      const cleanRaw = line.text.replace(/^\d+\s+/, '').replace(/\s+\d+[KMB]$/i, '').trim()
      if (!cleanRaw) continue

      rawCandidates.push({
        rawPlayerName: cleanRaw,
        normalizedPlayerName: normalizePlayerName(cleanRaw),
        sampleMs: sample.timestampMs,
      })
    }

    options.onProgress?.(Math.round(((index + 1) / samples.length) * 100))
  }

  const candidates = dedupeRosterCandidates(rawCandidates)

  return {
    sourceVideoId: options.sourceVideoId,
    candidates,
  }
}
