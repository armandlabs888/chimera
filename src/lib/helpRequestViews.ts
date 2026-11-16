/** Anonymous / session viewer key + demo view dedupe for help_request view counts. */

export const ANON_VIEWER_KEY_STORAGE = 'beam-anon-viewer-key'
export const DEMO_VIEWED_JOBS_KEY = 'beam-demo-viewed-jobs-v1'

const sessionRecorded = new Set<string>()

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function randomViewerKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 32)
  }
  return `anon${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`
}

/** Auth user id when signed in; otherwise a stable anonymous id (8–64 chars). */
export function getViewerKey(authUserId?: string | null): string {
  const uid = typeof authUserId === 'string' ? authUserId.trim() : ''
  if (uid.length >= 8 && uid.length <= 64) return uid

  if (!canUseStorage()) return randomViewerKey()

  try {
    const existing = localStorage.getItem(ANON_VIEWER_KEY_STORAGE)?.trim() ?? ''
    if (existing.length >= 8 && existing.length <= 64) return existing
    const next = randomViewerKey()
    localStorage.setItem(ANON_VIEWER_KEY_STORAGE, next)
    return next
  } catch {
    return randomViewerKey()
  }
}

export function formatViewCountLabel(count: number | null | undefined): string | null {
  const n = Number(count ?? 0)
  if (!Number.isFinite(n) || n <= 0) return null
  return n === 1 ? '1 view' : `${Math.floor(n)} views`
}

export function sessionAlreadyRecorded(requestId: string): boolean {
  return sessionRecorded.has(requestId)
}

export function markSessionRecorded(requestId: string): void {
  sessionRecorded.add(requestId)
}

function readDemoViewed(): Set<string> {
  if (!canUseStorage()) return new Set()
  try {
    const raw = localStorage.getItem(DEMO_VIEWED_JOBS_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((id): id is string => typeof id === 'string' && id.length > 0))
  } catch {
    return new Set()
  }
}

export function hasDemoViewedJob(requestId: string): boolean {
  return readDemoViewed().has(requestId)
}

export function markDemoViewedJob(requestId: string): void {
  if (!canUseStorage()) return
  const next = readDemoViewed()
  next.add(requestId)
  try {
    localStorage.setItem(DEMO_VIEWED_JOBS_KEY, JSON.stringify([...next]))
  } catch {
    // ignore quota / private mode
  }
}
