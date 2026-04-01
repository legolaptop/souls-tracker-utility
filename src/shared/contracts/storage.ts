import type { GuildMember, ScoreRecord, SourceVideo } from '@/shared/contracts/types'

export const APP_SCHEMA_VERSION = 1

export const STORAGE_KEYS = {
  appState: 'souls-tracker/app-state',
} as const

export interface AppStorageState {
  schemaVersion: typeof APP_SCHEMA_VERSION
  updatedAtIso: string
  roster: GuildMember[]
  sourceVideos: SourceVideo[]
  scoreRecords: ScoreRecord[]
}

export const EMPTY_STORAGE_STATE: AppStorageState = {
  schemaVersion: APP_SCHEMA_VERSION,
  updatedAtIso: '',
  roster: [],
  sourceVideos: [],
  scoreRecords: [],
}
