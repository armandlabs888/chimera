import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handlePkceCodeExchange } from '@/lib/auth/handlePkceCallback'
import { isAuthCallbackPrefetch, pkceCallbackErrorMessage } from '@/lib/auth/pkceCallback'
import { sanitizeNext } from '@/lib/auth/safeNext'
import { canonicalPublicOrigin } from '@/lib/auth/siteOrigin'

export const dynamic = 'force-dynamic'

function redirectNoStore(url: string): NextResponse {
  const response = NextResponse.redirect(url, 303)
  response.headers.set('Cache-Control', 'no-store, max-age=0')
  return response
}

/** PKCE OAuth / email-confirm code exchange (server-only; browser detectSessionInUrl is off). */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = sanitizeNext(searchParams.get('next'))
  const oauthError = searchParams.get('error')
  const oauthDesc = searchParams.get('error_description')
  const publicOrigin = canonicalPublicOrigin(origin, request.headers.get('host'))

  // Never let Link prefetch consume a one-time auth code.
  if (isAuthCallbackPrefetch(request.headers)) {
    return new NextResponse(null, {
      status: 204,
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  if (oauthError) {
    const message = pkceCallbackErrorMessage(oauthDesc || oauthError)
    return redirectNoStore(
      `${publicOrigin}/auth?error=${encodeURIComponent(message)}&next=${encodeURIComponent(next)}`,
    )
  }

  if (code) {
    try {
      const supabase = await createClient()
      return await handlePkceCodeExchange({
        auth: supabase.auth,
        code,
        next,
        publicOrigin,
      })
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Could not complete sign-in'
      const message = pkceCallbackErrorMessage(raw)
      return redirectNoStore(
        `${publicOrigin}/auth?error=${encodeURIComponent(message)}&next=${encodeURIComponent(next)}`,
      )
    }
  }

  return redirectNoStore(
    `${publicOrigin}/auth?error=${encodeURIComponent('Missing auth code')}&next=${encodeURIComponent(next)}`,
  )
}
