import { createClient as createSupabaseJs } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
  resolveBeamMode,
} from '@/lib/config'
import { isHelperPerson } from '@/lib/roles'
import { isUuid } from '@/lib/seo/ids'
import { formatCategoryLabel } from '@/lib/taxonomy'
import type { AccountRole, CategoryId } from '@/types'
import type { Database } from '@/lib/supabase/database.types'

export { isUuid } from '@/lib/seo/ids'

export type HelperSeoData = {
  id: string
  name: string
  categoryLabel: string
  cityLabel: string
}

export type RequestSeoData = {
  id: string
  title: string
  areaLabel: string
}

export type LookupResult<T> =
  | { status: 'found'; data: T }
  | { status: 'missing' }
  | { status: 'unknown' }

type ProfileSeoRow = {
  id: string
  name: string
  skills: string[] | null
  other_skill_label: string | null
  city: string | null
  location_label: string | null
  neighborhood: string | null
  is_helper: boolean
  account_role: string | null
}

type RequestSeoRow = {
  id: string
  title: string
  location_label: string | null
  neighborhood: string | null
  status: string
}

function anonClient() {
  const url = getSupabaseUrl()
  const key = getSupabasePublishableKey()
  if (!url || !key) return null
  return createSupabaseJs<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function cityLabelFrom(row: {
  city?: string | null
  location_label?: string | null
  neighborhood?: string | null
}): string {
  const city = (row.city ?? '').trim()
  if (city) return city
  const location = (row.location_label ?? '').trim()
  if (location) return location
  const neighborhood = (row.neighborhood ?? '').trim()
  return neighborhood || 'Nearby'
}

function toHelperSeo(row: ProfileSeoRow): HelperSeoData | null {
  const skills = (row.skills ?? []) as CategoryId[]
  const role =
    row.account_role === 'customer' || row.account_role === 'helper'
      ? (row.account_role as AccountRole)
      : null
  if (
    !isHelperPerson({
      isHelper: Boolean(row.is_helper),
      accountRole: role,
      skills,
    })
  ) {
    return null
  }
  const primary = skills[0]
  return {
    id: row.id,
    name: (row.name || 'Helper').trim() || 'Helper',
    categoryLabel: formatCategoryLabel(
      primary,
      primary === 'other' ? row.other_skill_label : null,
    ),
    cityLabel: cityLabelFrom(row),
  }
}

function toRequestSeo(row: RequestSeoRow): RequestSeoData {
  return {
    id: row.id,
    title: (row.title || 'Open job').trim() || 'Open job',
    areaLabel: cityLabelFrom(row),
  }
}

/**
 * Resolve a public helper for metadata / hard 404.
 * `missing` only when the server can prove the profile is absent (or not a helper).
 * Demo / unconfigured / RLS-blocked reads return `unknown` so the client gate still runs.
 */
export async function lookupPublicHelper(id: string): Promise<LookupResult<HelperSeoData>> {
  if (!isUuid(id)) return { status: 'missing' }
  if (resolveBeamMode() !== 'live') return { status: 'unknown' }

  const selectCols =
    'id, name, skills, other_skill_label, city, location_label, neighborhood, is_helper, account_role'

  const admin = createAdminClient()
  if (admin) {
    const { data, error } = await admin
      .from('profiles')
      .select(selectCols)
      .eq('id', id)
      .maybeSingle()
    if (error) return { status: 'unknown' }
    if (!data) return { status: 'missing' }
    const helper = toHelperSeo(data as ProfileSeoRow)
    if (!helper) return { status: 'missing' }
    return { status: 'found', data: helper }
  }

  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const { data, error } = await supabase
        .from('profiles')
        .select(selectCols)
        .eq('id', id)
        .maybeSingle()
      if (error) return { status: 'unknown' }
      if (!data) return { status: 'missing' }
      const helper = toHelperSeo(data as ProfileSeoRow)
      if (!helper) return { status: 'missing' }
      return { status: 'found', data: helper }
    }
  } catch {
    // Fall through to anon-readable marketplace RPC.
  }

  const anon = anonClient()
  if (!anon) return { status: 'unknown' }
  const { data, error } = await anon.rpc('get_public_marketplace')
  if (error || !data) return { status: 'unknown' }
  const payload = data as { profiles?: ProfileSeoRow[] }
  const row = (payload.profiles ?? []).find((p) => p.id === id)
  if (!row) return { status: 'unknown' }
  const helper = toHelperSeo(row)
  if (!helper) return { status: 'unknown' }
  return { status: 'found', data: helper }
}

/**
 * Resolve a help request for metadata / hard 404.
 * Definitive missing only via admin or an authenticated select that returns null.
 */
export async function lookupPublicRequest(id: string): Promise<LookupResult<RequestSeoData>> {
  if (!isUuid(id)) return { status: 'missing' }
  if (resolveBeamMode() !== 'live') return { status: 'unknown' }

  const selectCols = 'id, title, location_label, neighborhood, status'

  const admin = createAdminClient()
  if (admin) {
    const { data, error } = await admin
      .from('help_requests')
      .select(selectCols)
      .eq('id', id)
      .maybeSingle()
    if (error) return { status: 'unknown' }
    if (!data) return { status: 'missing' }
    return { status: 'found', data: toRequestSeo(data as RequestSeoRow) }
  }

  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const { data, error } = await supabase
        .from('help_requests')
        .select(selectCols)
        .eq('id', id)
        .maybeSingle()
      if (error) return { status: 'unknown' }
      if (!data) return { status: 'missing' }
      return { status: 'found', data: toRequestSeo(data as RequestSeoRow) }
    }
  } catch {
    // Fall through.
  }

  const anon = anonClient()
  if (!anon) return { status: 'unknown' }
  const { data, error } = await anon.rpc('get_public_marketplace')
  if (error || !data) return { status: 'unknown' }
  const payload = data as { requests?: RequestSeoRow[] }
  const row = (payload.requests ?? []).find((r) => r.id === id)
  if (!row) return { status: 'unknown' }
  return { status: 'found', data: toRequestSeo(row) }
}

/** Anon-readable helper ids for the sitemap (capped by get_public_marketplace). */
export async function listPublicHelperIdsForSitemap(): Promise<string[]> {
  if (resolveBeamMode() !== 'live') return []
  const anon = anonClient()
  if (!anon) return []
  try {
    const { data, error } = await anon.rpc('get_public_marketplace')
    if (error || !data) return []
    const payload = data as { profiles?: Array<{ id?: string; is_helper?: boolean; skills?: unknown[] }> }
    return (payload.profiles ?? [])
      .filter((p) => p.id && (p.is_helper || (Array.isArray(p.skills) && p.skills.length > 0)))
      .map((p) => String(p.id))
  } catch {
    return []
  }
}
