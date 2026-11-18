import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  formatOtpVerifySms,
  generatePhoneCode,
  hashPhoneCode,
  PHONE_ALREADY_USED_MESSAGE,
  PHONE_CODE_TTL_MS,
  PHONE_MAX_SENDS_PER_WINDOW,
  PHONE_SEND_WINDOW_MS,
} from '@/lib/phone/verify'
import {
  sendTwilioSms,
  toE164,
  twilioConfigured,
  TWILIO_SEND_FAILED_USER_MESSAGE,
} from '@/lib/urgent/twilio'

export const runtime = 'nodejs'

/** Fallback: send a 6-digit OTP by SMS to the entered number. */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { phone?: string }
    const phone = toE164(body.phone || '')
    if (!phone) {
      return NextResponse.json(
        { error: 'Enter a valid US phone number.' },
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
      console.warn('[phone/send-code] admin unavailable')
      return NextResponse.json(
        { error: 'Phone confirmation is not configured yet.' },
        { status: 503 },
      )
    }

    if (!twilioConfigured()) {
      console.warn('[phone/send-code] Twilio env missing')
      return NextResponse.json(
        { error: 'Text messaging is not available right now. Try again later.' },
        { status: 503 },
      )
    }

    // Uniqueness: another verified account already owns this number.
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

    const { data: row } = await admin
      .from('phone_verifications')
      .select(
        'pending_send_count, pending_send_window_start, verified_at, phone_e164',
      )
      .eq('user_id', user.id)
      .maybeSingle()

    if (row?.verified_at && row.phone_e164 === phone) {
      return NextResponse.json({ ok: true, alreadyVerified: true })
    }

    const now = Date.now()
    let sendCount = row?.pending_send_count ?? 0
    let windowStart = row?.pending_send_window_start
      ? new Date(row.pending_send_window_start).getTime()
      : 0

    if (!windowStart || now - windowStart > PHONE_SEND_WINDOW_MS) {
      sendCount = 0
      windowStart = now
    }

    if (sendCount >= PHONE_MAX_SENDS_PER_WINDOW) {
      return NextResponse.json(
        { error: 'Too many codes sent. Try again in a bit.' },
        { status: 429 },
      )
    }

    const code = generatePhoneCode()
    const expiresAt = new Date(now + PHONE_CODE_TTL_MS).toISOString()

    const { error: upsertError } = await admin.from('phone_verifications').upsert(
      {
        user_id: user.id,
        pending_code_hash: hashPhoneCode(code),
        pending_code_expires_at: expiresAt,
        pending_attempts: 0,
        pending_channel: 'otp',
        pending_send_count: sendCount + 1,
        pending_send_window_start: new Date(windowStart).toISOString(),
        // Stash the number being confirmed (not verified until code matches).
        phone_e164: phone,
        verified_at: null,
      },
      { onConflict: 'user_id' },
    )

    if (upsertError) {
      console.error('[phone/send-code] upsert', upsertError.message)
      return NextResponse.json({ error: 'Could not start verification.' }, { status: 500 })
    }

    const result = await sendTwilioSms({
      to: phone,
      body: formatOtpVerifySms(code),
    })

    if (result.ok && result.skipped) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: result.reason,
        ...(process.env.NODE_ENV !== 'production' ? { debugCode: code } : {}),
      })
    }
    if (!result.ok) {
      // Provider text is logged inside sendTwilioSms; never return it to clients.
      return NextResponse.json(
        { error: TWILIO_SEND_FAILED_USER_MESSAGE },
        { status: 502 },
      )
    }

    return NextResponse.json({ ok: true, sid: result.sid, expiresAt })
  } catch (err) {
    console.error('[phone/send-code]', err)
    return NextResponse.json({ error: 'Could not send code.' }, { status: 500 })
  }
}
