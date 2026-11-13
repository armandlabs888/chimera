'use client'

import { createBrowserClient } from '@supabase/ssr'
import { cookieDomainForHost } from '@/lib/auth/siteOrigin'
import { assertLiveConfig } from '@/lib/config'

export function createClient() {
  const { url, key } = assertLiveConfig()
  const domain =
    typeof window !== 'undefined' ? cookieDomainForHost(window.location.hostname) : undefined

  return createBrowserClient(url, key, {
    ...(domain ? { cookieOptions: { domain } } : {}),
    auth: {
      // Server route `/auth/callback` owns the one-time code exchange.
      // Leaving detectSessionInUrl on would race a second PKCE /token call.
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  })
}
