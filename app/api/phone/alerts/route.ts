import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isBrowseParentId, type BrowseParentId } from '@/lib/taxonomy'

export const runtime = 'nodejs'

type Body = {
  enable?: boolean
  parents?: string[]
}

/**
 * Save helper urgent-SMS opt-in from onboarding.
 * If the helper is not home-verified yet, stores sms_opt_in_pending instead of
 * flipping sms_opt_in (DB gate would reject the latter).
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Body
    const enable = Boolean(body.enable)
    const parents = Array.isArray(body.parents)
      ? body.parents.filter((p): p is BrowseParentId => isBrowseParentId(p))
      : []

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const admin = createAdminClient()
    if (!admin) {
      return NextResponse.json(
        { error: 'Alerts are not configured yet.' },
        { status: 503 },
      )
    }

    const { data: phoneRow } = await admin
      .from('phone_verifications')
      .select('phone_e164, verified_at')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!phoneRow?.verified_at || !phoneRow.phone_e164) {
      return NextResponse.json(
        { error: 'Confirm your phone before turning on text alerts.' },
        { status: 400 },
      )
    }

    // helper_verifications is used elsewhere via loosely typed clients; treat
    // read failures as unverified so we store pending opt-in safely.
    let locationVerified = false
    try {
      const { data: verification } = await (
        admin as unknown as {
          from: (t: string) => {
            select: (cols: string) => {
              eq: (
                col: string,
                val: string,
              ) => {
                maybeSingle: () => Promise<{
                  data: { status?: string } | null
                }>
              }
            }
          }
        }
      )
        .from('helper_verifications')
        .select('status')
        .eq('profile_id', user.id)
        .maybeSingle()
      locationVerified = verification?.status === 'approved'
    } catch {
      locationVerified = false
    }

    const { data: existing } = await admin
      .from('helper_urgent_sms_settings')
      .select(
        'sms_opt_in, quiet_hours_start, quiet_hours_end, daily_text_limit',
      )
      .eq('profile_id', user.id)
      .maybeSingle()

    let smsOptIn = existing?.sms_opt_in ?? false
    let smsOptInPending = false

    if (enable) {
      if (locationVerified) {
        smsOptIn = true
        smsOptInPending = false
      } else {
        // Keep sms_opt_in false so the verification gate is not tripped;
        // activate automatically when Get verified succeeds.
        smsOptIn = false
        smsOptInPending = true
      }
    } else {
      smsOptIn = false
      smsOptInPending = false
    }

    const { error } = await admin.from('helper_urgent_sms_settings').upsert(
      {
        profile_id: user.id,
        phone_e164: phoneRow.phone_e164,
        phone_confirmed_at: phoneRow.verified_at,
        sms_opt_in: smsOptIn,
        sms_opt_in_pending: smsOptInPending,
        sms_alert_parents: parents,
        daily_text_limit: existing?.daily_text_limit ?? 5,
        quiet_hours_start: existing?.quiet_hours_start ?? null,
        quiet_hours_end: existing?.quiet_hours_end ?? null,
      },
      { onConflict: 'profile_id' },
    )

    if (error) {
      console.error('[phone/alerts]', error.message)
      return NextResponse.json({ error: 'Could not save alert preferences.' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      smsOptIn,
      smsOptInPending,
      parents,
      locationVerified,
      note: !enable
        ? null
        : locationVerified
          ? 'Text alerts are on.'
          : 'Alerts start once you get verified.',
    })
  } catch (err) {
    console.error('[phone/alerts]', err)
    return NextResponse.json({ error: 'Could not save alerts.' }, { status: 500 })
  }
}
