import type {
  GuildMember,
  IngestResult,
  MimicColor,
  ParsingIssue,
  ScoreRecord,
  SourceVideo,
} from '@/shared/contracts/types'

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] }

export function isValidMimicColor(value: unknown): value is MimicColor {
  return value === 'red' || value === 'green' || value === 'white'
}

export function validateGuildMember(data: unknown): ValidationResult<GuildMember> {
  if (data === null || typeof data !== 'object') {
    return { ok: false, errors: ['Expected an object'] }
  }
  const d = data as Record<string, unknown>
  const errors: string[] = []

  if (typeof d.id !== 'string' || d.id.trim() === '') {
    errors.push('id: must be a non-empty string')
  }
  if (typeof d.displayName !== 'string' || d.displayName.trim() === '') {
    errors.push('displayName: must be a non-empty string')
  }
  if (!Array.isArray(d.aliases) || !d.aliases.every((a: unknown) => typeof a === 'string')) {
    errors.push('aliases: must be an array of strings')
  }
  if (typeof d.createdAtIso !== 'string') {
    errors.push('createdAtIso: must be a string')
  }
  if (typeof d.updatedAtIso !== 'string') {
    errors.push('updatedAtIso: must be a string')
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: data as GuildMember }
}

export function validateScoreRecord(data: unknown): ValidationResult<ScoreRecord> {
  if (data === null || typeof data !== 'object') {
    return { ok: false, errors: ['Expected an object'] }
  }
  const d = data as Record<string, unknown>
  const errors: string[] = []

  if (typeof d.id !== 'string' || d.id.trim() === '') {
    errors.push('id: must be a non-empty string')
  }
  if (d.memberId !== null && typeof d.memberId !== 'string') {
    errors.push('memberId: must be a string or null')
  }
  if (typeof d.rawPlayerName !== 'string') {
    errors.push('rawPlayerName: must be a string')
  }
  if (typeof d.normalizedPlayerName !== 'string') {
    errors.push('normalizedPlayerName: must be a string')
  }
  if (!isValidMimicColor(d.mimic)) {
    errors.push('mimic: must be a valid MimicColor (red | green | white)')
  }
  if (d.rank !== null && (typeof d.rank !== 'number' || !Number.isInteger(d.rank) || d.rank < 1)) {
    errors.push('rank: must be a positive integer or null')
  }
  if (typeof d.rawScoreText !== 'string') {
    errors.push('rawScoreText: must be a string')
  }
  if (d.scoreValue !== null && (typeof d.scoreValue !== 'number' || d.scoreValue < 0)) {
    errors.push('scoreValue: must be a non-negative number or null')
  }
  if (
    d.sourceFrameMs !== null &&
    (typeof d.sourceFrameMs !== 'number' || d.sourceFrameMs < 0)
  ) {
    errors.push('sourceFrameMs: must be a non-negative number or null')
  }
  if (typeof d.sourceVideoId !== 'string' || d.sourceVideoId.trim() === '') {
    errors.push('sourceVideoId: must be a non-empty string')
  }
  if (typeof d.capturedAtIso !== 'string') {
    errors.push('capturedAtIso: must be a string')
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: data as ScoreRecord }
}

export function validateSourceVideo(data: unknown): ValidationResult<SourceVideo> {
  if (data === null || typeof data !== 'object') {
    return { ok: false, errors: ['Expected an object'] }
  }
  const d = data as Record<string, unknown>
  const errors: string[] = []

  if (typeof d.id !== 'string' || d.id.trim() === '') {
    errors.push('id: must be a non-empty string')
  }
  if (typeof d.label !== 'string' || d.label.trim() === '') {
    errors.push('label: must be a non-empty string')
  }
  if (typeof d.capturedDateIso !== 'string') {
    errors.push('capturedDateIso: must be a string')
  }
  if (d.notes !== undefined && typeof d.notes !== 'string') {
    errors.push('notes: must be a string when present')
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: data as SourceVideo }
}

export function validateParsingIssue(data: unknown): ValidationResult<ParsingIssue> {
  if (data === null || typeof data !== 'object') {
    return { ok: false, errors: ['Expected an object'] }
  }
  const d = data as Record<string, unknown>
  const errors: string[] = []

  if (typeof d.code !== 'string' || d.code.trim() === '') {
    errors.push('code: must be a non-empty string')
  }
  if (typeof d.message !== 'string') {
    errors.push('message: must be a string')
  }
  if (d.frameMs !== undefined && (typeof d.frameMs !== 'number' || d.frameMs < 0)) {
    errors.push('frameMs: must be a non-negative number when present')
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: data as ParsingIssue }
}

export function validateIngestResult(data: unknown): ValidationResult<IngestResult> {
  if (data === null || typeof data !== 'object') {
    return { ok: false, errors: ['Expected an object'] }
  }
  const d = data as Record<string, unknown>
  const errors: string[] = []

  if (typeof d.sourceVideoId !== 'string' || d.sourceVideoId.trim() === '') {
    errors.push('sourceVideoId: must be a non-empty string')
  }
  if (!Array.isArray(d.records)) {
    errors.push('records: must be an array')
  }
  if (!Array.isArray(d.issues)) {
    errors.push('issues: must be an array')
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: data as IngestResult }
}
