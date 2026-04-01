export type MimicColor = 'red' | 'green' | 'white'

export interface GuildMember {
  id: string
  displayName: string
  aliases: string[]
  createdAtIso: string
  updatedAtIso: string
}

export interface ScoreRecord {
  id: string
  memberId: string | null
  rawPlayerName: string
  normalizedPlayerName: string
  mimic: MimicColor
  rank: number | null
  rawScoreText: string
  scoreValue: number | null
  sourceFrameMs: number | null
  sourceVideoId: string
  capturedAtIso: string
}

export interface SourceVideo {
  id: string
  label: string
  capturedDateIso: string
  notes?: string
}

export interface ParsingIssue {
  code: string
  message: string
  frameMs?: number
}

export interface IngestResult {
  sourceVideoId: string
  records: ScoreRecord[]
  issues: ParsingIssue[]
}
