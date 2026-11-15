/** Query param used after sign-in to auto-save a job and land back on it. */
export const PENDING_SAVE_PARAM = 'pendingSave'

/** Build a same-job return path that includes pendingSave for post-auth auto-save. */
export function buildJobSaveReturnPath(requestId: string, currentPath?: string): string {
  const fallback =
    typeof window !== 'undefined'
      ? `${window.location.pathname}${window.location.search}`
      : `/requests/${requestId}`
  const raw = (currentPath ?? fallback).trim() || `/requests/${requestId}`
  const url = new URL(raw, 'http://local.invalid')
  if (url.pathname === '/browse' || url.pathname.startsWith('/browse/')) {
    url.searchParams.set('job', requestId)
  }
  url.searchParams.set(PENDING_SAVE_PARAM, requestId)
  const qs = url.searchParams.toString()
  return qs ? `${url.pathname}?${qs}` : url.pathname
}

export function authHrefForJobSave(requestId: string, currentPath?: string): string {
  return `/auth?next=${encodeURIComponent(buildJobSaveReturnPath(requestId, currentPath))}`
}

export function readPendingSaveRequestId(
  searchParams: { get: (key: string) => string | null },
): string | null {
  const value = (searchParams.get(PENDING_SAVE_PARAM) ?? '').trim()
  return value || null
}
