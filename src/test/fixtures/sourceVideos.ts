import type { SourceVideo } from '@/shared/contracts/types'

/**
 * Minimal source-video fixtures for unit tests.
 * These stand in for real video uploads without requiring any media files.
 */
export const sampleSourceVideos: SourceVideo[] = [
  {
    id: 'video-001',
    label: 'SOULS Run 2024-04-01',
    capturedDateIso: '2024-04-01',
    notes: 'First test run – red mimic round',
  },
  {
    id: 'video-002',
    label: 'SOULS Run 2024-04-08',
    capturedDateIso: '2024-04-08',
  },
]
