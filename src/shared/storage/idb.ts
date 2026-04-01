import type { GuildMember, ScoreRecord, SourceVideo } from '@/shared/contracts/types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const IDB_NAME = 'souls-tracker'
export const IDB_VERSION = 1

export const IDB_STORE = {
  members: 'members',
  sourceVideos: 'source-videos',
  scoreRecords: 'score-records',
} as const

export type IDBStoreName = (typeof IDB_STORE)[keyof typeof IDB_STORE]

// ---------------------------------------------------------------------------
// Repository interface
// ---------------------------------------------------------------------------

/**
 * Generic CRUD interface for a typed, id-keyed collection.
 * Both the IndexedDB and in-memory implementations satisfy this contract.
 */
export interface StorageRepository<T extends { id: string }> {
  /** Returns all records in the store. */
  getAll(): Promise<T[]>
  /** Returns the record with the given id, or `undefined` if absent. */
  getById(id: string): Promise<T | undefined>
  /** Inserts or updates a record (upsert semantics). */
  put(item: T): Promise<void>
  /** Removes the record with the given id.  No-op when absent. */
  deleteById(id: string): Promise<void>
  /** Removes all records from the store. */
  clear(): Promise<void>
}

/** App-level storage façade exposing one typed repository per entity. */
export interface AppIDB {
  members: StorageRepository<GuildMember>
  sourceVideos: StorageRepository<SourceVideo>
  scoreRecords: StorageRepository<ScoreRecord>
  /** Closes the underlying database connection. */
  close(): void
}

// ---------------------------------------------------------------------------
// In-memory implementation (testing / offline use)
// ---------------------------------------------------------------------------

function createMemoryRepository<T extends { id: string }>(): StorageRepository<T> {
  const store = new Map<string, T>()
  return {
    async getAll() {
      return Array.from(store.values())
    },
    async getById(id) {
      return store.get(id)
    },
    async put(item) {
      store.set(item.id, item)
    },
    async deleteById(id) {
      store.delete(id)
    },
    async clear() {
      store.clear()
    },
  }
}

/**
 * Creates an in-memory `AppIDB` suitable for tests and server-side rendering.
 * Data is not persisted between calls to this function.
 */
export function createMemoryAppIDB(): AppIDB {
  return {
    members: createMemoryRepository<GuildMember>(),
    sourceVideos: createMemoryRepository<SourceVideo>(),
    scoreRecords: createMemoryRepository<ScoreRecord>(),
    close() {
      // nothing to release for the in-memory implementation
    },
  }
}

// ---------------------------------------------------------------------------
// IndexedDB implementation (browser)
// ---------------------------------------------------------------------------

function wrapRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

class IDBRepository<T extends { id: string }> implements StorageRepository<T> {
  constructor(
    private readonly db: IDBDatabase,
    private readonly storeName: string,
  ) {}

  private store(mode: IDBTransactionMode): IDBObjectStore {
    return this.db.transaction(this.storeName, mode).objectStore(this.storeName)
  }

  async getAll(): Promise<T[]> {
    return wrapRequest<T[]>(this.store('readonly').getAll())
  }

  async getById(id: string): Promise<T | undefined> {
    const result = await wrapRequest<T | undefined>(this.store('readonly').get(id))
    return result
  }

  async put(item: T): Promise<void> {
    await wrapRequest(this.store('readwrite').put(item))
  }

  async deleteById(id: string): Promise<void> {
    await wrapRequest(this.store('readwrite').delete(id))
  }

  async clear(): Promise<void> {
    await wrapRequest(this.store('readwrite').clear())
  }
}

/**
 * Opens (and if necessary upgrades) the application IndexedDB database and
 * returns the typed `AppIDB` façade.
 *
 * Object stores created:
 *  - `members`       – keyPath: "id"
 *  - `source-videos` – keyPath: "id"
 *  - `score-records` – keyPath: "id", indexes: memberId, sourceVideoId, mimic
 */
export function openAppIDB(): Promise<AppIDB> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION)

    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      if (!db.objectStoreNames.contains(IDB_STORE.members)) {
        db.createObjectStore(IDB_STORE.members, { keyPath: 'id' })
      }

      if (!db.objectStoreNames.contains(IDB_STORE.sourceVideos)) {
        db.createObjectStore(IDB_STORE.sourceVideos, { keyPath: 'id' })
      }

      if (!db.objectStoreNames.contains(IDB_STORE.scoreRecords)) {
        const scoreStore = db.createObjectStore(IDB_STORE.scoreRecords, { keyPath: 'id' })
        scoreStore.createIndex('memberId', 'memberId', { unique: false })
        scoreStore.createIndex('sourceVideoId', 'sourceVideoId', { unique: false })
        scoreStore.createIndex('mimic', 'mimic', { unique: false })
      }
    }

    req.onsuccess = () => {
      const db = req.result
      resolve({
        members: new IDBRepository<GuildMember>(db, IDB_STORE.members),
        sourceVideos: new IDBRepository<SourceVideo>(db, IDB_STORE.sourceVideos),
        scoreRecords: new IDBRepository<ScoreRecord>(db, IDB_STORE.scoreRecords),
        close() {
          db.close()
        },
      })
    }

    req.onerror = () => reject(req.error)
  })
}
