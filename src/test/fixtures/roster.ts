import type { GuildMember } from '@/shared/contracts/types'

/**
 * Minimal roster fixtures for unit tests.
 * Names are intentionally simple so normalisation / matcher tests
 * can assert exact transformations without wrestling with real data.
 */
export const sampleRoster: GuildMember[] = [
  {
    id: 'member-001',
    displayName: 'Ardath',
    aliases: ['ardath', 'Ardath_GS'],
    createdAtIso: '2024-01-01T00:00:00.000Z',
    updatedAtIso: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'member-002',
    displayName: 'Zephyros',
    aliases: ['zeph', 'Zephyros'],
    createdAtIso: '2024-02-15T12:00:00.000Z',
    updatedAtIso: '2024-03-01T08:30:00.000Z',
  },
  {
    id: 'member-003',
    displayName: 'Lysara',
    aliases: ['lys', 'Lysara'],
    createdAtIso: '2024-03-10T09:00:00.000Z',
    updatedAtIso: '2024-03-10T09:00:00.000Z',
  },
]
