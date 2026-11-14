import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { assertLiveConfig } from '@/lib/config'
import type { Database } from '@/lib/supabase/database.types'

/** Service-role client for server routes. Returns null when the secret is unset. */
export function createAdminClient(): SupabaseClient<Database> | null {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!serviceKey) {
    console.warn('[supabase-admin] SUPABASE_SERVICE_ROLE_KEY missing; skipping privileged work')
    return null
  }
  const { url } = assertLiveConfig()
  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
