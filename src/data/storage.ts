import type { AppState } from '../types'
import { createSeedState } from './seed'

const STORAGE_KEY = 'beam-demo-v1'

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const seed = createSeedState()
      saveState(seed)
      return seed
    }
    const parsed = JSON.parse(raw) as AppState
    if (!parsed.version || !parsed.people?.length) {
      const seed = createSeedState()
      saveState(seed)
      return seed
    }
    return parsed
  } catch {
    const seed = createSeedState()
    saveState(seed)
    return seed
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function resetState(): AppState {
  const seed = createSeedState()
  saveState(seed)
  return seed
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}
