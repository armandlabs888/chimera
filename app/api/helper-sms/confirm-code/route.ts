import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { toE164 } from '@/lib/urgent/twilio'

export const runtime = 'nodejs'

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}

/** Confirm the helper phone with the SMS code. Does not turn on opt-in. */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      phone?: string
      code?: string
    }
    const phone = toE164(body.phone || '')
    const code = (body.code || '').replace(/\D/g, '')
    if (!phone || code.length !== 6) {
      return NextResponse.json(
        { error: 'Enter the 6-digit code from your text.' },
        { status: 400 },
      )
    }

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
        { error: 'SMS verification is not configured yet.' },
        { status: 503 },
      )
    }

    const { data: otp, error } = await admin
      .from('helper_sms_otp_codes')
      .select('*')
      .eq('profile_id', user.id)
      .eq('phone_e164', phone)
      .is('consumed_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !otp) {
      return NextResponse.json(
        { error: 'Code expired or not found. Send a new one.' },
        { status: 400 },
      )
    }

    if (otp.attempt_count >= 5) {
      return NextResponse.json(
        { error: 'Too many attempts. Send a new code.' },
        { status: 429 },
      )
    }

    if (otp.code_hash !== hashCode(code)) {
      await admin
        .from('helper_sms_otp_codes')
        .update({ attempt_count: otp.attempt_count + 1 })
        .eq('id', otp.id)
      return NextResponse.json({ error: 'That code did not match.' }, { status: 400 })
    }

    await admin
      .from('helper_sms_otp_codes')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', otp.id)

    const { data: existing } = await admin
      .from('helper_urgent_sms_settings')
      .select('sms_opt_in, daily_text_limit, quiet_hours_start, quiet_hours_end')
      .eq('profile_id', user.id)
      .maybeSingle()

    const { error: upsertError } = await admin.from('helper_urgent_sms_settings').upsert(
      {
        profile_id: user.id,
        phone_e164: phone,
        phone_confirmed_at: new Date().toISOString(),
        // Preserve existing opt-in; never force ON. Default remains false for new rows.
        sms_opt_in: existing?.sms_opt_in ?? false,
        daily_text_limit: existing?.daily_text_limit ?? 5,
        quiet_hours_start: existing?.quiet_hours_start ?? null,
        quiet_hours_end: existing?.quiet_hours_end ?? null,
      },
      { onConflict: 'profile_id' },
    )

    if (upsertError) {
      console.error('[helper-sms/confirm-code] upsert', upsertError.message)
      return NextResponse.json({ error: 'Could not save phone.' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      phoneConfirmed: true,
      note: 'Phone confirmed. Turn on Text me urgent jobs near me if you want alerts (optional).',
    })
  } catch (err) {
    console.error('[helper-sms/confirm-code]', err)
    return NextResponse.json({ error: 'Could not confirm code.' }, { status: 500 })
  }
}
