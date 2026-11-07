import type { AppState, Person, HelpRequest } from '../types'
import { createSeedState } from './seed'

export const STORAGE_KEY = 'beam-demo-v1'

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function normalizePerson(p: Person): Person {
  return {
    ...p,
    locationLabel: p.locationLabel ?? '',
    lat: p.lat ?? null,
    lng: p.lng ?? null,
    serviceRadiusMiles: p.serviceRadiusMiles ?? 5,
    rateType: p.rateType ?? 'hourly',
    availableNow: p.availableNow ?? false,
    isHelper: p.isHelper ?? p.skills.length > 0,
    accountRole:
      p.accountRole === 'customer' || p.accountRole === 'helper'
        ? p.accountRole
        : // Migrate legacy demo helpers that only had isHelper/skills set.
          p.isHelper || (p.skills?.length ?? 0) > 0
          ? 'helper'
          : null,
    city: p.city ?? null,
    stateCode: p.stateCode ?? null,
    cityGeoid: p.cityGeoid ?? null,
    onboardingCompletedAt: p.onboardingCompletedAt ?? null,
    safetyDisclaimerAcceptedAt: p.safetyDisclaimerAcceptedAt ?? null,
    safetyDisclaimerVersion: p.safetyDisclaimerVersion ?? null,
  }
}

function normalizeRequest(r: HelpRequest): HelpRequest {
  return {
    ...r,
    locationLabel: r.locationLabel ?? '',
    lat: r.lat ?? null,
    lng: r.lng ?? null,
    radiusMiles: r.radiusMiles ?? 5,
    budgetType: r.budgetType ?? (r.budget === 0 ? 'open' : 'fixed'),
    scheduledFor: r.scheduledFor ?? null,
    preferredHelperId: r.preferredHelperId ?? null,
  }
}

/** Migration-safe hydrate: fill missing invites/saved/notifications arrays (version stays 1). */
export function hydrateAppState(raw: Partial<AppState> & { people?: Person[] }): AppState {
  const seed = createSeedState()
  return {
    version: 1,
    currentUserId: raw.currentUserId ?? seed.currentUserId,
    people: (raw.people?.length ? raw.people : seed.people).map(normalizePerson),
    requests: (raw.requests ?? seed.requests).map(normalizeRequest),
    offers: raw.offers ?? seed.offers,
    threads: raw.threads ?? seed.threads,
    messages: raw.messages ?? seed.messages,
    reviews: raw.reviews ?? seed.reviews,
    invites: raw.invites ?? [],
    savedHelperIds: raw.savedHelperIds ?? [],
    notifications: raw.notifications ?? [],
  }
}

export function loadState(): AppState {
  if (!canUseStorage()) {
    return createSeedState()
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const seed = createSeedState()
      saveState(seed)
      return seed
    }
    const parsed = JSON.parse(raw) as Partial<AppState>
    if (!parsed.version || !parsed.people?.length) {
      const seed = createSeedState()
      saveState(seed)
      return seed
    }
    const hydrated = hydrateAppState(parsed)
    saveState(hydrated)
    return hydrated
  } catch {
    const seed = createSeedState()
    saveState(seed)
    return seed
  }
}

export function saveState(state: AppState): void {
  if (!canUseStorage()) return
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
