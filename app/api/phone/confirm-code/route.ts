import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { applyVerifiedPhone } from '@/lib/phone/applyVerified'
import {
  hashPhoneCode,
  maskPhoneE164,
  PHONE_ALREADY_USED_MESSAGE,
  PHONE_MAX_ATTEMPTS,
  phoneCodeHashesEqual,
} from '@/lib/phone/verify'
import { toE164 } from '@/lib/urgent/twilio'

export const runtime = 'nodejs'

/** Fallback: confirm the 6-digit OTP for the entered phone. */
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
        { error: 'Phone confirmation is not configured yet.' },
        { status: 503 },
      )
    }

    const { data: row, error } = await admin
      .from('phone_verifications')
      .select(
        'pending_code_hash, pending_code_expires_at, pending_attempts, phone_e164, pending_channel',
      )
      .eq('user_id', user.id)
      .maybeSingle()

    if (error || !row?.pending_code_hash) {
      return NextResponse.json(
        { error: 'Code expired or not found. Send a new one.' },
        { status: 400 },
      )
    }

    if (row.phone_e164 && row.phone_e164 !== phone) {
      return NextResponse.json(
        { error: 'That code was sent to a different number. Send a new one.' },
        { status: 400 },
      )
    }

    if (
      !row.pending_code_expires_at ||
      new Date(row.pending_code_expires_at).getTime() < Date.now()
    ) {
      return NextResponse.json(
        { error: 'Code expired or not found. Send a new one.' },
        { status: 400 },
      )
    }

    if ((row.pending_attempts ?? 0) >= PHONE_MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: 'Too many attempts. Send a new code.' },
        { status: 429 },
      )
    }

    if (!phoneCodeHashesEqual(row.pending_code_hash, hashPhoneCode(code))) {
      await admin
        .from('phone_verifications')
        .update({ pending_attempts: (row.pending_attempts ?? 0) + 1 })
        .eq('user_id', user.id)
      return NextResponse.json({ error: 'That code did not match.' }, { status: 400 })
    }

    // Pre-check uniqueness for a clearer error before upsert.
    const { data: taken } = await admin
      .from('phone_verifications')
      .select('user_id')
      .eq('phone_e164', phone)
      .not('verified_at', 'is', null)
      .neq('user_id', user.id)
      .maybeSingle()

    if (taken) {
      return NextResponse.json({ error: PHONE_ALREADY_USED_MESSAGE }, { status: 409 })
    }

    const applied = await applyVerifiedPhone({
      admin,
      userId: user.id,
      phoneE164: phone,
    })
    if (!applied.ok) {
      return NextResponse.json({ error: applied.error }, { status: applied.status })
    }

    return NextResponse.json({
      ok: true,
      status: 'verified',
      phoneE164: phone,
      maskedPhone: maskPhoneE164(phone),
    })
  } catch (err) {
    console.error('[phone/confirm-code]', err)
    return NextResponse.json({ error: 'Could not confirm code.' }, { status: 500 })
  }
}
