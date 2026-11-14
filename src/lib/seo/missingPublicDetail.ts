import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/config'
import { isHelperPerson } from '@/lib/roles'
import { isUuid } from '@/lib/seo/ids'
import type { AccountRole, CategoryId } from '@/types'
import type { Database } from '@/lib/supabase/database.types'

/**
 * Path that does not exist in the app tree. Rewriting here forces a real HTTP 404
 * before (app)/loading.tsx starts streaming (which would lock status at 200).
 */
const MISSING_REWRITE_PATH = '/__housecall_missing__'

function rewriteMissing(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone()
  url.pathname = MISSING_REWRITE_PATH
  url.search = ''
  return NextResponse.rewrite(url)
}

/**
 * Return a rewrite to the global 404 when a public detail URL is known-missing.
 * Invalid ids always 404. Existing rows use the service-role client when present.
 * Demo mode and unreadability leave the request alone so the client gate still runs.
 */
export async function rewriteIfMissingPublicDetail(
  request: NextRequest,
): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl
  const match = pathname.match(/^\/(people|requests)\/([^/]+)\/?$/)
  if (!match) return null

  const kind = match[1] as 'people' | 'requests'
  const id = match[2]

  // Demo keeps soft client not-found for Austin seed ids (req-1, user-you, …).
  // Live still hard-404s non-UUID paths below.
  if (process.env.NEXT_PUBLIC_BEAM_DEMO_MODE === '1') return null

  if (!isUuid(id)) return rewriteMissing(request)

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  const url = getSupabaseUrl()
  const publishable = getSupabasePublishableKey()
  if (!serviceKey || !url || !publishable) return null

  try {
    const admin = createClient<Database>(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    if (kind === 'people') {
      const { data, error } = await admin
        .from('profiles')
        .select('id, is_helper, skills, account_role')
        .eq('id', id)
        .maybeSingle()
      if (error) return null
      if (!data) return rewriteMissing(request)
      const role =
        data.account_role === 'customer' || data.account_role === 'helper'
          ? (data.account_role as AccountRole)
          : null
      const helper = isHelperPerson({
        isHelper: Boolean(data.is_helper),
        accountRole: role,
        skills: (data.skills ?? []) as CategoryId[],
      })
      if (!helper) return rewriteMissing(request)
      return null
    }

    const { data, error } = await admin
      .from('help_requests')
      .select('id')
      .eq('id', id)
      .maybeSingle()
    if (error) return null
    if (!data) return rewriteMissing(request)
    return null
  } catch {
    return null
  }
}
