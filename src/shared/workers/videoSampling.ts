import type { MimicColor } from '@/shared/contracts/types'

export interface MimicSection {
  mimic: MimicColor
  startMs: number
  endMs: number
}

export interface SampleFrame {
  timestampMs: number
  sectionMimic: MimicColor
}

export interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

export interface RelativeRect {
  x: number
  y: number
  width: number
  height: number
}

export interface FrameDimensions {
  width: number
  height: number
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Deterministically segments one score video into mimic sections. If explicit
 * boundaries are not supplied, sections are split evenly by duration.
 */
export function segmentMimicSections(
  durationMs: number,
  mimics: MimicColor[] = ['red', 'green', 'white'],
  explicitBoundaryMs: number[] = [],
): MimicSection[] {
  if (durationMs <= 0 || mimics.length === 0) {
    return []
  }

  const safeDuration = Math.max(1, Math.round(durationMs))
  const boundaries: number[] = [0]

  if (explicitBoundaryMs.length === mimics.length - 1) {
    for (const value of explicitBoundaryMs) {
      boundaries.push(clampNumber(Math.round(value), 0, safeDuration))
    }
  } else {
    for (let i = 1; i < mimics.length; i++) {
      boundaries.push(Math.round((safeDuration * i) / mimics.length))
    }
  }

  boundaries.push(safeDuration)

  return mimics.map((mimic, index) => ({
    mimic,
    startMs: boundaries[index],
    endMs: boundaries[index + 1],
  }))
}

/** Samples frames at fixed spacing inside one section. */
export function sampleSectionFrames(
  section: MimicSection,
  options: { spacingMs?: number; maxFrames?: number } = {},
): SampleFrame[] {
  const spacingMs = Math.max(100, Math.round(options.spacingMs ?? 1200))
  const maxFrames = Math.max(1, Math.round(options.maxFrames ?? 30))
  const duration = Math.max(0, section.endMs - section.startMs)

  if (duration === 0) {
    return [{ timestampMs: section.startMs, sectionMimic: section.mimic }]
  }

  const samples: SampleFrame[] = []
  let cursor = section.startMs
  while (cursor < section.endMs && samples.length < maxFrames) {
    samples.push({ timestampMs: cursor, sectionMimic: section.mimic })
    cursor += spacingMs
  }

  if (samples.length === 0 || samples[samples.length - 1].timestampMs !== section.endMs) {
    samples.push({ timestampMs: section.endMs, sectionMimic: section.mimic })
  }

  return samples.slice(0, maxFrames)
}

/**
 * Converts a normalized rectangle [0..1] into frame pixels and clamps it to
 * frame bounds for predictable crop behavior.
 */
export function toPixelCropRect(frame: FrameDimensions, normalized: RelativeRect): CropRect {
  const x = clampNumber(Math.round(normalized.x * frame.width), 0, frame.width)
  const y = clampNumber(Math.round(normalized.y * frame.height), 0, frame.height)
  const width = clampNumber(Math.round(normalized.width * frame.width), 1, frame.width - x)
  const height = clampNumber(Math.round(normalized.height * frame.height), 1, frame.height - y)

  return { x, y, width, height }
}

export interface RosterCandidate {
  rawPlayerName: string
  normalizedPlayerName: string
  firstSeenMs: number
  seenCount: number
}

export function dedupeRosterCandidates(
  items: Array<{ rawPlayerName: string; normalizedPlayerName: string; sampleMs: number }>,
): RosterCandidate[] {
  const grouped = new Map<string, RosterCandidate>()

  for (const item of items) {
    if (!item.normalizedPlayerName) continue

    const existing = grouped.get(item.normalizedPlayerName)
    if (existing) {
      existing.seenCount += 1
      existing.firstSeenMs = Math.min(existing.firstSeenMs, item.sampleMs)
    } else {
      grouped.set(item.normalizedPlayerName, {
        rawPlayerName: item.rawPlayerName,
        normalizedPlayerName: item.normalizedPlayerName,
        firstSeenMs: item.sampleMs,
        seenCount: 1,
      })
    }
  }

  return Array.from(grouped.values()).sort((a, b) => a.normalizedPlayerName.localeCompare(b.normalizedPlayerName))
}
