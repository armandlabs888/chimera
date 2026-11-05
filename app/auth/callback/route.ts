import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizeNext } from '@/lib/auth/safeNext'

/** PKCE OAuth / email-confirm code exchange. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = sanitizeNext(searchParams.get('next'))
  const oauthError = searchParams.get('error')
  const oauthDesc = searchParams.get('error_description')

  if (oauthError) {
    const message = oauthDesc || oauthError
    return NextResponse.redirect(
      `${origin}/auth?error=${encodeURIComponent(message)}&next=${encodeURIComponent(next)}`,
    )
  }

  if (code) {
    try {
      const supabase = await createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`)
      }
      return NextResponse.redirect(
        `${origin}/auth?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`,
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not complete sign-in'
      return NextResponse.redirect(
        `${origin}/auth?error=${encodeURIComponent(message)}&next=${encodeURIComponent(next)}`,
      )
    }
  }

  return NextResponse.redirect(
    `${origin}/auth?error=${encodeURIComponent('Missing auth code')}&next=${encodeURIComponent(next)}`,
  )
}
