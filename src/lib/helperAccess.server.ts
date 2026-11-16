import 'server-only'
import { redirect } from 'next/navigation'
import { canAccessHelperProfileEditor } from '@/lib/helperAccess'
import { getSupabasePublishableKey, getSupabaseUrl, isExplicitDemoMode } from '@/lib/config'
import { createClient } from '@/lib/supabase/server'

/**
 * Server-side gate for helper profile editor routes.
 * Demo / unconfigured environments skip here; the client guard still applies.
 */
export async function enforceHelperProfileEditorAccess(): Promise<void> {
  if (isExplicitDemoMode()) return
  if (!getSupabaseUrl() || !getSupabasePublishableKey()) return

  let supabase
  try {
    supabase = await createClient()
  } catch {
    return
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const [{ data: profile }, { data: verification }] = await Promise.all([
    supabase
      .from('profiles')
      .select('is_helper, account_role, skills')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('helper_verifications')
      .select('status')
      .eq('profile_id', user.id)
      .maybeSingle(),
  ])

  const person = profile
    ? {
        isHelper: Boolean(profile.is_helper),
        accountRole:
          profile.account_role === 'customer' || profile.account_role === 'helper'
            ? profile.account_role
            : null,
        skills: (profile.skills ?? []) as string[],
      }
    : null

  if (
    !canAccessHelperProfileEditor(
      person,
      verification ? { status: verification.status } : null,
    )
  ) {
    redirect('/verify')
  }
}
