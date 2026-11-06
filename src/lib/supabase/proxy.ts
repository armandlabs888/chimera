import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { redirectStrandedAuth } from '@/lib/auth/strandedAuth'
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/config'

export async function updateSession(request: NextRequest) {
  // Site-URL fallback: /?code=... (or OTP / OAuth error params) → real auth routes.
  // Runs even in demo / unconfigured mode so production never drops the code on `/`.
  const stranded = redirectStrandedAuth(request)
  if (stranded) return stranded

  const url = getSupabaseUrl()
  const key = getSupabasePublishableKey()
  if (!url || !key || process.env.NEXT_PUBLIC_BEAM_DEMO_MODE === '1') {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(url, key, {
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
  await supabase.auth.getClaims()

  return supabaseResponse
}
