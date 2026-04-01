import type { MimicColor, ScoreRecord } from '@/shared/contracts/types'

/**
 * A single OCR observation extracted from one video frame.
 * Multiple FrameCandidates for the same player-mimic pair are produced when
 * the same leaderboard entry appears across several sampled frames.
 */
export interface FrameCandidate {
  /** Timestamp (milliseconds) of the source video frame. */
  frameMs: number
  /** Raw player name as returned by OCR. */
  rawPlayerName: string
  /** Normalised player name used for grouping. */
  normalizedPlayerName: string
  /** Resolved guild member ID, or null when roster matching found no match. */
  memberId: string | null
  mimic: MimicColor
  /** Leaderboard rank as read from OCR, or null if unreadable. */
  rank: number | null
  /** Raw score text as returned by OCR (e.g. "10K", "1,500,000"). */
  rawScoreText: string
  /** Parsed numeric score, or null if the text could not be parsed. */
  scoreValue: number | null
}

/**
 * The result of deduplicating multiple FrameCandidate observations for a
 * single (normalizedPlayerName, mimic) pair.  Preserves the full set of
 * contributing frame timestamps for provenance.
 */
export interface DeduplicatedRecord {
  /** Normalised player name used as the deduplication key. */
  normalizedPlayerName: string
  /** Raw player name sourced from the most representative frame. */
  rawPlayerName: string
  /** Resolved guild member ID (null when no roster match was found). */
  memberId: string | null
  mimic: MimicColor
  /** Most agreed-upon rank across all contributing frames. */
  rank: number | null
  /** Raw score text sourced from the most representative frame. */
  rawScoreText: string
  /** Most agreed-upon numeric score across all contributing frames. */
  scoreValue: number | null
  /** Frame timestamps of every observation that contributed to this record. */
  sourceFrames: number[]
  /** Frame timestamp of the observation chosen as most representative. */
  bestFrameMs: number | null
  /**
   * Average fraction of frames agreeing on the chosen rank and score values,
   * in the range [0, 1].  Higher values indicate greater consistency.
   */
  confidence: number
  sourceVideoId: string
  capturedAtIso: string
}

/**
 * Returns the most common value in an array together with the fraction of
 * elements that match it.  Returns `null` for an empty array.
 */
function mostCommon<T>(values: T[]): { value: T; fraction: number } | null {
  if (values.length === 0) return null

  const counts = new Map<string, { value: T; count: number }>()
  for (const v of values) {
    const key = String(v)
    const entry = counts.get(key)
    if (entry) {
      entry.count++
    } else {
      counts.set(key, { value: v, count: 1 })
    }
  }

  let best: { value: T; count: number } | null = null
  for (const entry of counts.values()) {
    if (!best || entry.count > best.count) best = entry
  }
  return best ? { value: best.value, fraction: best.count / values.length } : null
}

/**
 * Deduplicates a set of FrameCandidate observations that all belong to the
 * same (normalizedPlayerName, mimic) group into a single DeduplicatedRecord.
 *
 * Rank and score are chosen by majority vote across frames.  The "best frame"
 * is the one whose observations agree with both majority values; if no single
 * frame satisfies both criteria the frame agreeing on score is preferred.
 *
 * @throws When `candidates` is empty.
 */
export function deduplicateCandidates(
  candidates: FrameCandidate[],
  sourceVideoId: string,
  capturedAtIso: string,
): DeduplicatedRecord {
  if (candidates.length === 0) throw new Error('candidates must not be empty')

  const { normalizedPlayerName, memberId, mimic } = candidates[0]

  const rankResult = mostCommon(candidates.map((c) => c.rank))
  const scoreResult = mostCommon(candidates.map((c) => c.scoreValue))

  const chosenRank = rankResult?.value ?? null
  const chosenScore = scoreResult?.value ?? null
  const rankConfidence = rankResult?.fraction ?? 0
  const scoreConfidence = scoreResult?.fraction ?? 0

  const bestCandidate =
    candidates.find((c) => c.rank === chosenRank && c.scoreValue === chosenScore) ??
    candidates.find((c) => c.scoreValue === chosenScore) ??
    candidates[0]

  return {
    normalizedPlayerName,
    rawPlayerName: bestCandidate.rawPlayerName,
    memberId,
    mimic,
    rank: chosenRank,
    rawScoreText: bestCandidate.rawScoreText,
    scoreValue: chosenScore,
    sourceFrames: candidates.map((c) => c.frameMs),
    bestFrameMs: bestCandidate.frameMs,
    confidence: (rankConfidence + scoreConfidence) / 2,
    sourceVideoId,
    capturedAtIso,
  }
}

/**
 * Groups a flat list of FrameCandidates by `(normalizedPlayerName, mimic)`,
 * deduplicates each group, and returns one DeduplicatedRecord per unique
 * player-mimic pair.
 */
export function deduplicateFrameBatch(
  candidates: FrameCandidate[],
  sourceVideoId: string,
  capturedAtIso: string,
): DeduplicatedRecord[] {
  const groups = new Map<string, FrameCandidate[]>()

  for (const c of candidates) {
    const key = `${c.normalizedPlayerName}::${c.mimic}`
    const group = groups.get(key) ?? []
    group.push(c)
    groups.set(key, group)
  }

  return Array.from(groups.values()).map((group) =>
    deduplicateCandidates(group, sourceVideoId, capturedAtIso),
  )
}

/**
 * Converts a DeduplicatedRecord into a ScoreRecord suitable for storage.
 * The caller must supply a pre-generated unique `id`.
 */
export function toScoreRecord(deduped: DeduplicatedRecord, id: string): ScoreRecord {
  return {
    id,
    memberId: deduped.memberId,
    rawPlayerName: deduped.rawPlayerName,
    normalizedPlayerName: deduped.normalizedPlayerName,
    mimic: deduped.mimic,
    rank: deduped.rank,
    rawScoreText: deduped.rawScoreText,
    scoreValue: deduped.scoreValue,
    sourceFrameMs: deduped.bestFrameMs,
    sourceVideoId: deduped.sourceVideoId,
    capturedAtIso: deduped.capturedAtIso,
  }
}
