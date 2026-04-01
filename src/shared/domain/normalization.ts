/**
 * Cleans common OCR artefacts from raw extracted text before further
 * processing.  Intentionally conservative – only safe substitutions that
 * are unambiguous in the leaderboard context are applied.
 */
export function cleanOcrText(raw: string): string {
  return raw
    .trim()
    .replace(/\|/g, 'l') // pipe is commonly misread as lowercase L
    .replace(/\u00a0/g, ' ') // non-breaking space → regular space
    .replace(/\s+/g, ' ') // collapse any whitespace run to a single space
    .trim()
}

/**
 * Normalises a raw player name extracted from OCR into a canonical form
 * used for roster matching and cross-frame deduplication.
 *
 * - Trims surrounding whitespace
 * - Converts to lowercase
 * - Removes characters that are not alphanumeric, space, underscore, or hyphen
 * - Collapses internal whitespace runs to a single space
 */
export function normalizePlayerName(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9 _-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Parses a raw score text (e.g. "10K", "1.5M", "100,000") into a numeric
 * value.  Returns `null` when the text cannot be interpreted as a number.
 *
 * Supported formats:
 *   - Plain integers / decimals:  "1000", "12345.67"
 *   - Comma-separated thousands:  "1,000", "1,234,567"
 *   - K suffix (thousands):       "10K", "1.5k"
 *   - M suffix (millions):        "1M", "2.5m"
 *   - B suffix (billions):        "1B", "1.2b"
 */
export function normalizeScoreText(raw: string): number | null {
  if (!raw || typeof raw !== 'string') return null

  const text = raw.trim().replace(/,/g, '') // strip thousands separators
  const match = text.match(/^([\d.]+)\s*([KkMmBb]?)$/)
  if (!match) return null

  const base = parseFloat(match[1])
  if (isNaN(base)) return null

  const suffix = (match[2] ?? '').toUpperCase()
  if (suffix === 'K') return Math.round(base * 1_000)
  if (suffix === 'M') return Math.round(base * 1_000_000)
  if (suffix === 'B') return Math.round(base * 1_000_000_000)
  return Math.round(base)
}
