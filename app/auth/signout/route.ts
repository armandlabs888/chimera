import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { cookieDomainForHost } from '@/lib/auth/siteOrigin'
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/config'

/**
 * Canonical sign-out entry. Clears Supabase session cookies (when live),
 * then 303-redirects to a clean `/auth` — never back to the prior route.
 * Supports GET (location.replace) and POST (form actions).
 */
async function handleSignOut(request: NextRequest) {
  const dest = new URL('/auth', request.url)
  dest.search = ''

  const url = getSupabaseUrl()
  const key = getSupabasePublishableKey()
  const demo = process.env.NEXT_PUBLIC_BEAM_DEMO_MODE === '1'

  if (!url || !key || demo) {
    const response = NextResponse.redirect(dest, 303)
    response.headers.set('Cache-Control', 'no-store')
    return response
  }

  let response = NextResponse.redirect(dest, 303)
  response.headers.set('Cache-Control', 'no-store')

  const domain = cookieDomainForHost(request.headers.get('host'))
  const supabase = createServerClient(url, key, {
    ...(domain ? { cookieOptions: { domain } } : {}),
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  await supabase.auth.signOut()
  return response
}

export async function GET(request: NextRequest) {
  return handleSignOut(request)
}

export async function POST(request: NextRequest) {
  return handleSignOut(request)
}
