import { NextResponse, type NextRequest } from 'next/server'
import { PRODUCTION_APEX_HOST, PRODUCTION_SITE_HOST } from '@/lib/auth/siteOrigin'

/**
 * Send apex traffic to the www canonical host so OAuth redirectTo, Site URL,
 * and PKCE cookies stay on one host. Query strings (including ?code=) are kept.
 */
export function redirectToCanonicalHost(request: NextRequest): NextResponse | null {
  const host = request.headers.get('host')?.split(':')[0]?.toLowerCase()
  if (host !== PRODUCTION_APEX_HOST) return null

  const url = request.nextUrl.clone()
  url.hostname = PRODUCTION_SITE_HOST
  url.protocol = 'https:'
  // Drop accidental default ports from clone on some runtimes.
  url.port = ''
  return NextResponse.redirect(url, 308)
}
