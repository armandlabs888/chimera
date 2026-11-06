import { NextResponse, type NextRequest } from 'next/server'
import { sanitizeNext } from '@/lib/auth/safeNext'

/**
 * When Supabase rejects `redirect_to` (not in Redirect URLs) it falls back to
 * Dashboard Site URL — often the bare origin (`https://www.yariapp.com/?code=...`
 * or historically `http://localhost:3000/?code=...`). Same can happen for OTP
 * confirmation links and OAuth error query params.
 *
 * Intercept those stranded params on `/` or bare `/auth` and forward into the
 * real PKCE / confirm handlers (or the daylight `/auth` error banner).
 */

export type StrandedAuthTarget =
  | { pathname: '/auth/callback'; params: Record<string, string> }
  | { pathname: '/auth/confirm'; params: Record<string, string> }
  | { pathname: '/auth'; params: Record<string, string> }

/** Pure detector — safe to unit-test without NextRequest. */
export function detectStrandedAuth(
  pathname: string,
  searchParams: URLSearchParams,
): StrandedAuthTarget | null {
  // Only the Site-URL fallback surfaces (`/` and bare `/auth`).
  // Never touch `/auth/callback` or `/auth/confirm`.
  if (pathname !== '/' && pathname !== '/auth') return null

  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  const next = sanitizeNext(searchParams.get('next'))

  if (code) {
    return {
      pathname: '/auth/callback',
      params: { code, next },
    }
  }

  if (tokenHash && type) {
    return {
      pathname: '/auth/confirm',
      params: { token_hash: tokenHash, type, next },
    }
  }

  // OAuth provider / GoTrue errors on Site URL root → daylight auth banner.
  // Bare `/auth?error=...` is already the intentional error surface — leave it.
  if (error && pathname === '/') {
    const params: Record<string, string> = {
      error: errorDescription || error,
      next,
    }
    return { pathname: '/auth', params }
  }

  return null
}

export function redirectStrandedAuth(request: NextRequest): NextResponse | null {
  const { pathname, searchParams } = request.nextUrl
  const target = detectStrandedAuth(pathname, searchParams)
  if (!target) return null

  const dest = request.nextUrl.clone()
  dest.pathname = target.pathname
  dest.search = ''
  for (const [key, value] of Object.entries(target.params)) {
    dest.searchParams.set(key, value)
  }
  return NextResponse.redirect(dest)
}
