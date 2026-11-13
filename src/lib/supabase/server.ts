import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { cookieDomainForHost } from '@/lib/auth/siteOrigin'
import { assertLiveConfig } from '@/lib/config'

export async function createClient() {
  const { url, key } = assertLiveConfig()
  const cookieStore = await cookies()
  const headerStore = await headers()
  const domain = cookieDomainForHost(headerStore.get('host'))

  return createServerClient(url, key, {
    ...(domain ? { cookieOptions: { domain } } : {}),
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet, responseHeaders) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
          // headers are applied by the Proxy on Next.js 16 when refreshing sessions
          void responseHeaders
        } catch {
          // Called from a Server Component; Proxy will refresh the session.
        }
      },
    },
  })
}
