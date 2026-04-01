import { describe, it, expect } from 'vitest'
import { matchToRoster } from '@/shared/domain/rosterMatcher'
import type { GuildMember } from '@/shared/contracts/types'

const roster: GuildMember[] = [
  {
    id: 'mem-1',
    displayName: 'Arthas',
    aliases: ['the lich king', 'lk'],
    createdAtIso: '2024-01-01T00:00:00Z',
    updatedAtIso: '2024-01-01T00:00:00Z',
  },
  {
    id: 'mem-2',
    displayName: 'Sylvanas',
    aliases: ['sylv', 'banshee queen'],
    createdAtIso: '2024-01-01T00:00:00Z',
    updatedAtIso: '2024-01-01T00:00:00Z',
  },
]

describe('matchToRoster – exact match', () => {
  it('matches on display name (case-insensitive via normalisation)', () => {
    const result = matchToRoster('arthas', roster)
    expect(result.matchType).toBe('exact')
    expect(result.memberId).toBe('mem-1')
    expect(result.confidence).toBe(1.0)
  })

  it('returns the matched display name', () => {
    const result = matchToRoster('sylvanas', roster)
    expect(result.matchedName).toBe('Sylvanas')
  })
})

describe('matchToRoster – alias match', () => {
  it('matches on a single-word alias', () => {
    const result = matchToRoster('sylv', roster)
    expect(result.matchType).toBe('alias')
    expect(result.memberId).toBe('mem-2')
    expect(result.confidence).toBe(0.95)
  })

  it('matches on a multi-word alias', () => {
    const result = matchToRoster('the lich king', roster)
    expect(result.matchType).toBe('alias')
    expect(result.memberId).toBe('mem-1')
  })
})

describe('matchToRoster – fuzzy match', () => {
  it('matches a one-character typo', () => {
    const result = matchToRoster('artbas', roster)
    expect(result.matchType).toBe('fuzzy')
    expect(result.memberId).toBe('mem-1')
    expect(result.confidence).toBeGreaterThanOrEqual(0.75)
    expect(result.confidence).toBeLessThan(1)
  })

  it('matches a minor OCR variation', () => {
    const result = matchToRoster('sylvana', roster) // missing 's'
    expect(result.matchType).toBe('fuzzy')
    expect(result.memberId).toBe('mem-2')
  })
})

describe('matchToRoster – no match', () => {
  it('returns none for a completely unrelated name', () => {
    const result = matchToRoster('zzzzzzzzz', roster)
    expect(result.matchType).toBe('none')
    expect(result.memberId).toBeNull()
    expect(result.confidence).toBe(0)
  })

  it('returns none for an empty roster', () => {
    const result = matchToRoster('arthas', [])
    expect(result.matchType).toBe('none')
    expect(result.memberId).toBeNull()
  })

  it('returns none for an empty name against a non-empty roster', () => {
    const result = matchToRoster('', roster)
    expect(result.matchType).toBe('none')
  })
})

describe('matchToRoster – priority', () => {
  it('prefers exact over alias', () => {
    const r: GuildMember[] = [
      {
        id: 'a',
        displayName: 'Arthas',
        aliases: ['arthas'],
        createdAtIso: '',
        updatedAtIso: '',
      },
    ]
    const result = matchToRoster('arthas', r)
    expect(result.matchType).toBe('exact')
  })
})
