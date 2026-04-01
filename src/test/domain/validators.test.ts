import { describe, it, expect } from 'vitest'
import {
  isValidMimicColor,
  validateGuildMember,
  validateIngestResult,
  validateParsingIssue,
  validateScoreRecord,
  validateSourceVideo,
} from '@/shared/domain/validators'
import type { GuildMember, ScoreRecord, SourceVideo } from '@/shared/contracts/types'

// ---------------------------------------------------------------------------
// isValidMimicColor
// ---------------------------------------------------------------------------

describe('isValidMimicColor', () => {
  it('accepts valid mimic colors', () => {
    expect(isValidMimicColor('red')).toBe(true)
    expect(isValidMimicColor('green')).toBe(true)
    expect(isValidMimicColor('white')).toBe(true)
  })

  it('rejects unknown colors', () => {
    expect(isValidMimicColor('blue')).toBe(false)
    expect(isValidMimicColor('purple')).toBe(false)
    expect(isValidMimicColor('RED')).toBe(false)
  })

  it('rejects non-string values', () => {
    expect(isValidMimicColor(null)).toBe(false)
    expect(isValidMimicColor(undefined)).toBe(false)
    expect(isValidMimicColor(1)).toBe(false)
    expect(isValidMimicColor('')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// validateGuildMember
// ---------------------------------------------------------------------------

const validMember: GuildMember = {
  id: 'mem-1',
  displayName: 'Arthas',
  aliases: ['arthas2', 'the-lich-king'],
  createdAtIso: '2024-01-01T00:00:00Z',
  updatedAtIso: '2024-06-01T00:00:00Z',
}

describe('validateGuildMember', () => {
  it('returns ok for a valid member', () => {
    const result = validateGuildMember(validMember)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toEqual(validMember)
  })

  it('accepts an empty aliases array', () => {
    expect(validateGuildMember({ ...validMember, aliases: [] }).ok).toBe(true)
  })

  it('fails when input is not an object', () => {
    expect(validateGuildMember(null).ok).toBe(false)
    expect(validateGuildMember('string').ok).toBe(false)
    expect(validateGuildMember(42).ok).toBe(false)
  })

  it('fails when id is empty', () => {
    const result = validateGuildMember({ ...validMember, id: '' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.some((e) => e.includes('id'))).toBe(true)
  })

  it('fails when displayName is whitespace only', () => {
    const result = validateGuildMember({ ...validMember, displayName: '   ' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.some((e) => e.includes('displayName'))).toBe(true)
  })

  it('fails when aliases contains non-strings', () => {
    const result = validateGuildMember({ ...validMember, aliases: ['ok', 42] })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.some((e) => e.includes('aliases'))).toBe(true)
  })

  it('collects multiple errors', () => {
    const result = validateGuildMember({ ...validMember, id: '', displayName: '' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.length).toBeGreaterThanOrEqual(2)
  })
})

// ---------------------------------------------------------------------------
// validateScoreRecord
// ---------------------------------------------------------------------------

const validRecord: ScoreRecord = {
  id: 'rec-1',
  memberId: 'mem-1',
  rawPlayerName: 'Arthas',
  normalizedPlayerName: 'arthas',
  mimic: 'red',
  rank: 1,
  rawScoreText: '10K',
  scoreValue: 10000,
  sourceFrameMs: 12500,
  sourceVideoId: 'vid-1',
  capturedAtIso: '2024-01-15T00:00:00Z',
}

describe('validateScoreRecord', () => {
  it('returns ok for a valid record', () => {
    expect(validateScoreRecord(validRecord).ok).toBe(true)
  })

  it('accepts null memberId', () => {
    expect(validateScoreRecord({ ...validRecord, memberId: null }).ok).toBe(true)
  })

  it('accepts null rank, scoreValue, and sourceFrameMs', () => {
    expect(
      validateScoreRecord({
        ...validRecord,
        rank: null,
        scoreValue: null,
        sourceFrameMs: null,
      }).ok,
    ).toBe(true)
  })

  it('fails for invalid mimic color', () => {
    const result = validateScoreRecord({ ...validRecord, mimic: 'purple' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.some((e) => e.includes('mimic'))).toBe(true)
  })

  it('fails for rank of 0', () => {
    const result = validateScoreRecord({ ...validRecord, rank: 0 })
    expect(result.ok).toBe(false)
  })

  it('fails for negative scoreValue', () => {
    const result = validateScoreRecord({ ...validRecord, scoreValue: -1 })
    expect(result.ok).toBe(false)
  })

  it('fails for non-integer rank', () => {
    const result = validateScoreRecord({ ...validRecord, rank: 1.5 })
    expect(result.ok).toBe(false)
  })

  it('fails when input is not an object', () => {
    expect(validateScoreRecord(null).ok).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// validateSourceVideo
// ---------------------------------------------------------------------------

const validVideo: SourceVideo = {
  id: 'vid-1',
  label: 'Week 1 Red',
  capturedDateIso: '2024-01-15',
}

describe('validateSourceVideo', () => {
  it('returns ok for a valid video', () => {
    expect(validateSourceVideo(validVideo).ok).toBe(true)
  })

  it('accepts optional notes', () => {
    expect(validateSourceVideo({ ...validVideo, notes: 'some note' }).ok).toBe(true)
  })

  it('fails when notes is not a string', () => {
    const result = validateSourceVideo({ ...validVideo, notes: 123 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.some((e) => e.includes('notes'))).toBe(true)
  })

  it('fails when label is empty', () => {
    const result = validateSourceVideo({ ...validVideo, label: '' })
    expect(result.ok).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// validateParsingIssue
// ---------------------------------------------------------------------------

describe('validateParsingIssue', () => {
  it('returns ok for a valid issue without frameMs', () => {
    expect(validateParsingIssue({ code: 'OCR_LOW_CONF', message: 'Low confidence' }).ok).toBe(true)
  })

  it('accepts a non-negative frameMs', () => {
    expect(validateParsingIssue({ code: 'X', message: 'y', frameMs: 0 }).ok).toBe(true)
    expect(validateParsingIssue({ code: 'X', message: 'y', frameMs: 5000 }).ok).toBe(true)
  })

  it('fails for negative frameMs', () => {
    expect(validateParsingIssue({ code: 'X', message: 'y', frameMs: -1 }).ok).toBe(false)
  })

  it('fails when code is empty', () => {
    expect(validateParsingIssue({ code: '', message: 'y' }).ok).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// validateIngestResult
// ---------------------------------------------------------------------------

describe('validateIngestResult', () => {
  it('returns ok for a valid result', () => {
    const result = validateIngestResult({ sourceVideoId: 'vid-1', records: [], issues: [] })
    expect(result.ok).toBe(true)
  })

  it('fails when records is not an array', () => {
    const result = validateIngestResult({ sourceVideoId: 'vid-1', records: null, issues: [] })
    expect(result.ok).toBe(false)
  })

  it('fails when sourceVideoId is empty', () => {
    const result = validateIngestResult({ sourceVideoId: '', records: [], issues: [] })
    expect(result.ok).toBe(false)
  })
})
