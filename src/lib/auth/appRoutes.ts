import { sanitizeNext } from '@/lib/auth/safeNext'

/** Discovery routes that stay readable while logged out (live guests). */
const PUBLIC_APP_PREFIXES = ['/browse', '/safety', '/people/', '/requests/']

/**
 * Exact `/onboarding` is public so `?preview=1` QA can walk the flow and the
 * screen can redirect live guests to sign-up. `/onboarding/helper` stays gated.
 */
export function isPublicAppPath(pathname: string): boolean {
  if (pathname === '/onboarding') return true
  return PUBLIC_APP_PREFIXES.some(
    (p) => pathname === p.replace(/\/$/, '') || pathname.startsWith(p),
  )
}

/** Live-guest write / account routes that must never show inline auth chrome. */
export function isProtectedAppPath(pathname: string): boolean {
  if (pathname === '/home' || pathname === '/post' || pathname === '/you') return true
  if (pathname === '/messages' || pathname.startsWith('/messages/')) return true
  if (pathname === '/onboarding/helper' || pathname.startsWith('/onboarding/helper/')) return true
  if (pathname === '/verify' || pathname.startsWith('/verify/')) return true
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return true
  return false
}

/**
 * Canonical guest → `/auth` destination for a protected (or gated onboarding) URL.
 * Returns null when the path should stay public for live guests.
 */
export function guestAuthRedirectPath(
  pathname: string,
  search = '',
): string | null {
  const params = new URLSearchParams(
    search.startsWith('?') ? search.slice(1) : search,
  )

  if (pathname === '/onboarding') {
    if (params.get('preview') === '1') return null
    return '/auth?mode=signup&next=%2Fonboarding'
  }

  if (!isProtectedAppPath(pathname)) return null

  const q = params.toString()
  const next = sanitizeNext(q ? `${pathname}?${q}` : pathname)
  return `/auth?next=${encodeURIComponent(next)}`
}
