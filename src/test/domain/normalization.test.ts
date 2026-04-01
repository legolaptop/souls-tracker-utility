import { describe, it, expect } from 'vitest'
import {
  cleanOcrText,
  normalizePlayerName,
  normalizeScoreText,
} from '@/shared/domain/normalization'

// ---------------------------------------------------------------------------
// cleanOcrText
// ---------------------------------------------------------------------------

describe('cleanOcrText', () => {
  it('trims leading and trailing whitespace', () => {
    expect(cleanOcrText('  hello  ')).toBe('hello')
  })

  it('collapses internal whitespace runs', () => {
    expect(cleanOcrText('hello   world')).toBe('hello world')
  })

  it('replaces pipe characters with lowercase L', () => {
    expect(cleanOcrText('P|ayer')).toBe('Player')
  })

  it('replaces non-breaking spaces with regular spaces', () => {
    expect(cleanOcrText('hello\u00a0world')).toBe('hello world')
  })

  it('returns an empty string unchanged', () => {
    expect(cleanOcrText('')).toBe('')
  })
})

// ---------------------------------------------------------------------------
// normalizePlayerName
// ---------------------------------------------------------------------------

describe('normalizePlayerName', () => {
  it('lowercases the input', () => {
    expect(normalizePlayerName('ARTHAS')).toBe('arthas')
  })

  it('trims surrounding whitespace', () => {
    expect(normalizePlayerName('  arthas  ')).toBe('arthas')
  })

  it('collapses internal spaces', () => {
    expect(normalizePlayerName('art  has')).toBe('art has')
  })

  it('preserves underscores and hyphens', () => {
    expect(normalizePlayerName('Art_Has-2')).toBe('art_has-2')
  })

  it('strips characters that are not alphanumeric, space, underscore, or hyphen', () => {
    expect(normalizePlayerName('Art@has!')).toBe('arthas')
  })

  it('handles an empty string', () => {
    expect(normalizePlayerName('')).toBe('')
  })
})

// ---------------------------------------------------------------------------
// normalizeScoreText
// ---------------------------------------------------------------------------

describe('normalizeScoreText', () => {
  it('parses a plain integer', () => {
    expect(normalizeScoreText('1000')).toBe(1000)
  })

  it('parses zero', () => {
    expect(normalizeScoreText('0')).toBe(0)
  })

  it('parses K suffix (case-insensitive)', () => {
    expect(normalizeScoreText('10K')).toBe(10_000)
    expect(normalizeScoreText('10k')).toBe(10_000)
  })

  it('parses fractional K', () => {
    expect(normalizeScoreText('1.5K')).toBe(1_500)
  })

  it('parses M suffix', () => {
    expect(normalizeScoreText('2M')).toBe(2_000_000)
    expect(normalizeScoreText('1.5m')).toBe(1_500_000)
  })

  it('parses B suffix', () => {
    expect(normalizeScoreText('1B')).toBe(1_000_000_000)
  })

  it('strips comma thousands separators', () => {
    expect(normalizeScoreText('1,500,000')).toBe(1_500_000)
  })

  it('handles whitespace between number and suffix', () => {
    expect(normalizeScoreText('5 K')).toBe(5_000)
  })

  it('returns null for alphabetic-only text', () => {
    expect(normalizeScoreText('abc')).toBeNull()
  })

  it('returns null for an empty string', () => {
    expect(normalizeScoreText('')).toBeNull()
  })

  it('returns null for mixed invalid text', () => {
    expect(normalizeScoreText('N/A')).toBeNull()
    expect(normalizeScoreText('-')).toBeNull()
  })
})
