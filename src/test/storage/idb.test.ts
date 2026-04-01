import { describe, it, expect, beforeEach } from 'vitest'
import { createMemoryAppIDB } from '@/shared/storage/idb'
import type { AppIDB } from '@/shared/storage/idb'
import type { GuildMember, ScoreRecord, SourceVideo } from '@/shared/contracts/types'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const member: GuildMember = {
  id: 'mem-1',
  displayName: 'Arthas',
  aliases: ['lk'],
  createdAtIso: '2024-01-01T00:00:00Z',
  updatedAtIso: '2024-01-01T00:00:00Z',
}

const video: SourceVideo = {
  id: 'vid-1',
  label: 'Week 1 Red',
  capturedDateIso: '2024-01-15',
}

const record: ScoreRecord = {
  id: 'rec-1',
  memberId: 'mem-1',
  rawPlayerName: 'Arthas',
  normalizedPlayerName: 'arthas',
  mimic: 'red',
  rank: 1,
  rawScoreText: '10K',
  scoreValue: 10_000,
  sourceFrameMs: 5000,
  sourceVideoId: 'vid-1',
  capturedAtIso: '2024-01-15T00:00:00Z',
}

// ---------------------------------------------------------------------------
// Tests – each suite gets a fresh in-memory store
// ---------------------------------------------------------------------------

describe('createMemoryAppIDB – members store', () => {
  let idb: AppIDB

  beforeEach(() => {
    idb = createMemoryAppIDB()
  })

  it('starts empty', async () => {
    expect(await idb.members.getAll()).toEqual([])
  })

  it('puts and retrieves a member by id', async () => {
    await idb.members.put(member)
    expect(await idb.members.getById(member.id)).toEqual(member)
  })

  it('returns undefined for an unknown id', async () => {
    expect(await idb.members.getById('nonexistent')).toBeUndefined()
  })

  it('upserts an existing record', async () => {
    await idb.members.put(member)
    const updated: GuildMember = { ...member, displayName: 'The Lich King' }
    await idb.members.put(updated)
    expect((await idb.members.getById(member.id))?.displayName).toBe('The Lich King')
  })

  it('deletes a record by id', async () => {
    await idb.members.put(member)
    await idb.members.deleteById(member.id)
    expect(await idb.members.getById(member.id)).toBeUndefined()
  })

  it('no-ops when deleting a non-existent id', async () => {
    await expect(idb.members.deleteById('ghost')).resolves.toBeUndefined()
  })

  it('clears all records', async () => {
    await idb.members.put(member)
    await idb.members.clear()
    expect(await idb.members.getAll()).toEqual([])
  })

  it('getAll returns all stored records', async () => {
    const m2: GuildMember = { ...member, id: 'mem-2', displayName: 'Sylvanas' }
    await idb.members.put(member)
    await idb.members.put(m2)
    const all = await idb.members.getAll()
    expect(all).toHaveLength(2)
  })
})

describe('createMemoryAppIDB – sourceVideos store', () => {
  let idb: AppIDB

  beforeEach(() => {
    idb = createMemoryAppIDB()
  })

  it('stores and retrieves a source video', async () => {
    await idb.sourceVideos.put(video)
    expect(await idb.sourceVideos.getById(video.id)).toEqual(video)
  })
})

describe('createMemoryAppIDB – scoreRecords store', () => {
  let idb: AppIDB

  beforeEach(() => {
    idb = createMemoryAppIDB()
  })

  it('stores and retrieves a score record', async () => {
    await idb.scoreRecords.put(record)
    expect(await idb.scoreRecords.getById(record.id)).toEqual(record)
  })

  it('stores multiple records and returns all', async () => {
    const r2: ScoreRecord = { ...record, id: 'rec-2', rank: 2 }
    await idb.scoreRecords.put(record)
    await idb.scoreRecords.put(r2)
    expect(await idb.scoreRecords.getAll()).toHaveLength(2)
  })
})

describe('createMemoryAppIDB – isolation between instances', () => {
  it('does not share state between two createMemoryAppIDB calls', async () => {
    const idb1 = createMemoryAppIDB()
    const idb2 = createMemoryAppIDB()
    await idb1.members.put(member)
    expect(await idb2.members.getAll()).toHaveLength(0)
  })
})

describe('createMemoryAppIDB – close', () => {
  it('calling close does not throw', () => {
    const idb = createMemoryAppIDB()
    expect(() => idb.close()).not.toThrow()
  })
})
