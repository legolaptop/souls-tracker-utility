import {
  EMPTY_STORAGE_STATE,
  STORAGE_KEYS,
  type AppStorageState,
} from '@/shared/contracts/storage'

export function readAppStorage(): AppStorageState {
  const raw = localStorage.getItem(STORAGE_KEYS.appState)

  if (!raw) {
    return EMPTY_STORAGE_STATE
  }

  try {
    return JSON.parse(raw) as AppStorageState
  } catch {
    return EMPTY_STORAGE_STATE
  }
}

export function writeAppStorage(nextState: AppStorageState): void {
  localStorage.setItem(STORAGE_KEYS.appState, JSON.stringify(nextState))
}
