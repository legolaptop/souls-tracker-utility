import { createDefaultVideoFrameExtractor, type VideoFrameExtractor } from '@/shared/workers/videoFrameExtractor'

export interface VideoExtractCoreDeps {
  extractor: VideoFrameExtractor
}

export const defaultVideoExtractCoreDeps: VideoExtractCoreDeps = {
  extractor: createDefaultVideoFrameExtractor(),
}
