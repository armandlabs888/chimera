import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { assertLiveConfig } from '@/lib/config'

export async function createClient() {
  const { url, key } = assertLiveConfig()
  const cookieStore = await cookies()

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet, headers) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
          // headers are applied by the Proxy on Next.js 16 when refreshing sessions
          void headers
        } catch {
          // Called from a Server Component; Proxy will refresh the session.
        }
      },
    },
  })
}
