import { createInMemoryVideoFrameExtractor, type VideoFrameExtractor } from '@/shared/workers/videoFrameExtractor'

export interface VideoExtractCoreDeps {
  extractor: VideoFrameExtractor
}

export const defaultVideoExtractCoreDeps: VideoExtractCoreDeps = {
  extractor: createInMemoryVideoFrameExtractor(),
}
