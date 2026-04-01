import type { GuildMember } from '@/shared/contracts/types'
import { normalizePlayerName } from './normalization'

export type MatchType = 'exact' | 'alias' | 'fuzzy' | 'none'

export interface MatchResult {
  memberId: string | null
  matchType: MatchType
  /** Confidence in the match, in the range [0, 1]. */
  confidence: number
  /** The roster name (displayName or alias) that was matched, if any. */
  matchedName: string | null
}

/**
 * Minimum similarity ratio for a fuzzy match to be accepted.
 * Candidates below this threshold are treated as no match.
 */
const FUZZY_THRESHOLD = 0.75

/**
 * Computes the Levenshtein edit distance between two strings.
 * Uses the standard single-row dynamic-programming approach.
 */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  let prevRow: number[] = Array.from({ length: a.length + 1 }, (_, i) => i)

  for (let i = 1; i <= b.length; i++) {
    const currRow: number[] = new Array<number>(a.length + 1)
    currRow[0] = i
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        currRow[j] = prevRow[j - 1]
      } else {
        currRow[j] = 1 + Math.min(prevRow[j - 1], prevRow[j], currRow[j - 1])
      }
    }
    prevRow = currRow
  }

  return prevRow[a.length]
}

/** Returns a similarity ratio in [0, 1] based on Levenshtein distance. */
function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return 1 - levenshtein(a, b) / maxLen
}

/**
 * Matches a normalised player name against the guild roster using a
 * three-tier strategy:
 *
 * 1. **Exact** – normalised displayName equals the query (confidence 1.0)
 * 2. **Alias** – normalised alias equals the query (confidence 0.95)
 * 3. **Fuzzy** – highest similarity above `FUZZY_THRESHOLD`
 *    (confidence = similarity ratio)
 * 4. **None**  – no acceptable match found
 */
export function matchToRoster(normalizedName: string, roster: GuildMember[]): MatchResult {
  // 1. Exact match on display name
  for (const member of roster) {
    if (normalizePlayerName(member.displayName) === normalizedName) {
      return {
        memberId: member.id,
        matchType: 'exact',
        confidence: 1.0,
        matchedName: member.displayName,
      }
    }
  }

  // 2. Alias match
  for (const member of roster) {
    for (const alias of member.aliases) {
      if (normalizePlayerName(alias) === normalizedName) {
        return {
          memberId: member.id,
          matchType: 'alias',
          confidence: 0.95,
          matchedName: alias,
        }
      }
    }
  }

  // 3. Fuzzy match – pick the best scoring candidate above the threshold
  let best: MatchResult = { memberId: null, matchType: 'none', confidence: 0, matchedName: null }

  for (const member of roster) {
    const candidates = [member.displayName, ...member.aliases]
    for (const name of candidates) {
      const score = similarity(normalizePlayerName(name), normalizedName)
      if (score >= FUZZY_THRESHOLD && score > best.confidence) {
        best = {
          memberId: member.id,
          matchType: 'fuzzy',
          confidence: score,
          matchedName: name,
        }
      }
    }
  }

  return best
}
