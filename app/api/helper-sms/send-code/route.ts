import { createHash, randomInt } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatPhoneVerifySms } from '@/lib/urgent/messages'
import { sendTwilioSms, toE164 } from '@/lib/urgent/twilio'

export const runtime = 'nodejs'

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}

/** Send a 6-digit SMS verification code to confirm the helper phone. Optional feature. */
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
      return NextResponse.json(
        { error: 'SMS verification is not configured yet.' },
        { status: 503 },
      )
    }

    // Ensure settings row exists (opt-in stays false until the helper checks the box).
    await admin.from('helper_urgent_sms_settings').upsert(
      {
        profile_id: user.id,
        sms_opt_in: false,
      },
      { onConflict: 'profile_id', ignoreDuplicates: true },
    )

    const code = String(randomInt(100000, 999999))
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    const { error: otpError } = await admin.from('helper_sms_otp_codes').insert({
      profile_id: user.id,
      phone_e164: phone,
      code_hash: hashCode(code),
      expires_at: expiresAt,
    })
    if (otpError) {
      console.error('[helper-sms/send-code] otp insert', otpError.message)
      return NextResponse.json({ error: 'Could not start verification.' }, { status: 500 })
    }

    const result = await sendTwilioSms({
      to: phone,
      body: formatPhoneVerifySms(code),
    })
    if (result.ok && result.skipped) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: result.reason,
        // Dev-friendly when Twilio is unset: do not expose code in production responses.
        ...(process.env.NODE_ENV !== 'production' ? { debugCode: code } : {}),
      })
    }
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 })
    }

    return NextResponse.json({ ok: true, sid: result.sid })
  } catch (err) {
    console.error('[helper-sms/send-code]', err)
    return NextResponse.json({ error: 'Could not send code.' }, { status: 500 })
  }
}
