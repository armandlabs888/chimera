import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizeNext } from '@/lib/auth/safeNext'
import type { EmailOtpType } from '@supabase/supabase-js'

/** Email confirmation / OTP verification via token_hash. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = sanitizeNext(searchParams.get('next'))

  if (token_hash && type) {
    try {
      const supabase = await createClient()
      const { error } = await supabase.auth.verifyOtp({ type, token_hash })
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`)
      }
      return NextResponse.redirect(
        `${origin}/auth?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`,
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not confirm email'
      return NextResponse.redirect(
        `${origin}/auth?error=${encodeURIComponent(message)}&next=${encodeURIComponent(next)}`,
      )
    }
  }

  return NextResponse.redirect(
    `${origin}/auth?error=${encodeURIComponent('Invalid confirmation link')}&next=${encodeURIComponent(next)}`,
  )
}
