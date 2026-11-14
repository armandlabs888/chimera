import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { guestAuthRedirectPath } from '@/lib/auth/appRoutes'
import { redirectToCanonicalHost } from '@/lib/auth/canonicalHost'
import { redirectStrandedAuth } from '@/lib/auth/strandedAuth'
import { cookieDomainForHost } from '@/lib/auth/siteOrigin'
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/config'
import { rewriteIfMissingPublicDetail } from '@/lib/seo/missingPublicDetail'

export async function updateSession(request: NextRequest) {
  // Apex → www so Google OAuth redirectTo matches Site URL + PKCE cookies.
  const canonical = redirectToCanonicalHost(request)
  if (canonical) return canonical

  // Site-URL fallback: /?code=... (or OTP / OAuth error params) → real auth routes.
  // Runs even in demo / unconfigured mode so production never drops the code on `/`.
  const stranded = redirectStrandedAuth(request)
  if (stranded) return stranded

  // Hard 404 for missing public detail URLs before (app)/loading streams a 200.
  const missingDetail = await rewriteIfMissingPublicDetail(request)
  if (missingDetail) return missingDetail

  const url = getSupabaseUrl()
  const key = getSupabasePublishableKey()
  if (!url || !key || process.env.NEXT_PUBLIC_BEAM_DEMO_MODE === '1') {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })
  const domain = cookieDomainForHost(request.headers.get('host'))

  const supabase = createServerClient(url, key, {
    ...(domain ? { cookieOptions: { domain } } : {}),
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options)
        })
        Object.entries(headers).forEach(([headerKey, headerValue]) => {
          supabaseResponse.headers.set(headerKey, headerValue)
        })
      },
    },
  })

  // Verify JWT on every request; do not trust getSession() in Proxy.
  const { data } = await supabase.auth.getClaims()
  const authed = Boolean(data?.claims?.sub)

  // Live guests hitting write/account routes → canonical /auth (no inline gate UI).
  if (!authed) {
    const { pathname, search } = request.nextUrl
    const destPath = guestAuthRedirectPath(pathname, search)
    if (destPath) {
      const dest = new URL(destPath, request.url)
      const redirect = NextResponse.redirect(dest)
      // Preserve any refreshed cookies from getClaims().
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirect.cookies.set(cookie.name, cookie.value)
      })
      redirect.headers.set('Cache-Control', 'no-store')
      return redirect
    }
  }

  return supabaseResponse
}
