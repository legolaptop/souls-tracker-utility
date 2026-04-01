import type { ScoreRecord } from '@/shared/contracts/types'

/**
 * Minimal score-record fixtures for unit tests.
 * Covers all three mimic colours and the edge-cases parsers must handle:
 *  - matched member (memberId set)
 *  - unmatched player (memberId null)
 *  - null scoreValue (OCR parse failure)
 */
export const sampleScoreRecords: ScoreRecord[] = [
  {
    id: 'score-001',
    memberId: 'member-001',
    rawPlayerName: 'Ardath',
    normalizedPlayerName: 'ardath',
    mimic: 'red',
    rank: 1,
    rawScoreText: '12,450',
    scoreValue: 12450,
    sourceFrameMs: 4200,
    sourceVideoId: 'video-001',
    capturedAtIso: '2024-04-01T20:15:00.000Z',
  },
  {
    id: 'score-002',
    memberId: 'member-002',
    rawPlayerName: 'Zephyros',
    normalizedPlayerName: 'zephyros',
    mimic: 'green',
    rank: 2,
    rawScoreText: '9,870',
    scoreValue: 9870,
    sourceFrameMs: 4200,
    sourceVideoId: 'video-001',
    capturedAtIso: '2024-04-01T20:15:00.000Z',
  },
  {
    id: 'score-003',
    memberId: null,
    rawPlayerName: 'UnknownPlayer',
    normalizedPlayerName: 'unknownplayer',
    mimic: 'white',
    rank: null,
    rawScoreText: '???',
    scoreValue: null,
    sourceFrameMs: 8100,
    sourceVideoId: 'video-001',
    capturedAtIso: '2024-04-01T20:15:30.000Z',
  },
]
