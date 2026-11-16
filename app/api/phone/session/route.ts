import { NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isPhoneConfirmEnabled } from '@/lib/phone/onboardingGate'
import {
  buildPhoneConfirmSmsUri,
  generatePhoneCode,
  hashPhoneCode,
  maskPhoneE164,
  PHONE_CODE_TTL_MS,
} from '@/lib/phone/verify'
import { twilioConfigured } from '@/lib/urgent/twilio'

export const runtime = 'nodejs'

function twilioToNumber(): string | null {
  return process.env.TWILIO_FROM_NUMBER?.trim() || null
}

function phoneConfirmFlag() {
  const enabled = isPhoneConfirmEnabled(twilioConfigured())
  return {
    phoneConfirmEnabled: enabled,
    twilioMissing: !enabled,
  }
}

/**
 * Start (or refresh) an inbound SMS phone-confirm session.
 * Returns a QR data URL + sms: deep link. Code is stored hashed with ~10 min expiry.
 * When Twilio env is missing, returns phoneConfirmEnabled: false (do not block signup).
 */
export async function POST() {
  try {
    const flags = phoneConfirmFlag()
    if (!flags.phoneConfirmEnabled) {
      console.warn('[phone/session] Twilio env missing; phone confirm disabled')
      return NextResponse.json({
        ok: true,
        status: 'disabled',
        ...flags,
      })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not signed in', ...flags }, { status: 401 })
    }

    const admin = createAdminClient()
    if (!admin) {
      console.warn('[phone/session] admin client unavailable')
      return NextResponse.json(
        {
          error: 'Phone confirmation is not configured yet.',
          phoneConfirmEnabled: false,
          twilioMissing: true,
        },
        { status: 503 },
      )
    }

    const { data: existing } = await admin
      .from('phone_verifications')
      .select('phone_e164, verified_at')
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing?.verified_at && existing.phone_e164) {
      return NextResponse.json({
        ok: true,
        status: 'verified',
        phoneE164: existing.phone_e164,
        maskedPhone: maskPhoneE164(existing.phone_e164),
        ...flags,
      })
    }

    const toNumber = twilioToNumber()
    if (!toNumber) {
      // Messaging Service alone can send OTP, but QR/inbound needs a From number.
      console.warn('[phone/session] TWILIO_FROM_NUMBER missing for QR inbound')
      return NextResponse.json({
        ok: true,
        status: 'disabled',
        phoneConfirmEnabled: false,
        twilioMissing: true,
        error: 'Text confirmation is not available right now.',
      })
    }

    const code = generatePhoneCode()
    const expiresAt = new Date(Date.now() + PHONE_CODE_TTL_MS).toISOString()
    const smsUri = buildPhoneConfirmSmsUri({ toE164: toNumber, code })

    const { error } = await admin.from('phone_verifications').upsert(
      {
        user_id: user.id,
        pending_code_hash: hashPhoneCode(code),
        pending_code_expires_at: expiresAt,
        pending_attempts: 0,
        pending_channel: 'inbound_sms',
        // Keep any previously verified fields cleared until inbound confirms.
        verified_at: null,
        phone_e164: null,
      },
      { onConflict: 'user_id' },
    )

    if (error) {
      console.error('[phone/session] upsert', error.message)
      return NextResponse.json({ error: 'Could not start confirmation.', ...flags }, { status: 500 })
    }

    let qrDataUrl: string | null = null
    try {
      qrDataUrl = await QRCode.toDataURL(smsUri, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 220,
        color: { dark: '#071330', light: '#FFFFFF' },
      })
    } catch (err) {
      console.error('[phone/session] qr encode', err)
      return NextResponse.json({ error: 'Could not build QR code.', ...flags }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      status: 'pending',
      smsUri,
      qrDataUrl,
      twilioTo: toNumber,
      expiresAt,
      ...flags,
      ...(process.env.NODE_ENV !== 'production' ? { debugCode: code } : {}),
    })
  } catch (err) {
    console.error('[phone/session]', err)
    return NextResponse.json({ error: 'Could not start confirmation.' }, { status: 500 })
  }
}

/**
 * Phone-confirm gate + status.
 * Always returns phoneConfirmEnabled (no auth required for the gate flag).
 * When enabled and signed in, also returns verification status for polling.
 */
export async function GET() {
  try {
    const flags = phoneConfirmFlag()
    if (!flags.phoneConfirmEnabled) {
      return NextResponse.json({
        ok: true,
        status: 'disabled',
        ...flags,
      })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      // Guests / preview can still learn that phone confirm is available.
      return NextResponse.json({
        ok: true,
        status: 'unstarted',
        ...flags,
      })
    }

    const { data, error } = await supabase
      .from('phone_verifications')
      .select('phone_e164, verified_at, pending_code_expires_at')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      // Table may not exist yet before migration is applied.
      console.warn('[phone/status]', error.message)
      return NextResponse.json({
        ok: true,
        status: 'unstarted',
        ...flags,
      })
    }

    if (data?.verified_at && data.phone_e164) {
      return NextResponse.json({
        ok: true,
        status: 'verified',
        phoneE164: data.phone_e164,
        maskedPhone: maskPhoneE164(data.phone_e164),
        ...flags,
      })
    }

    if (
      data?.pending_code_expires_at &&
      new Date(data.pending_code_expires_at).getTime() < Date.now()
    ) {
      return NextResponse.json({ ok: true, status: 'expired', ...flags })
    }

    if (data?.pending_code_expires_at) {
      return NextResponse.json({
        ok: true,
        status: 'pending',
        expiresAt: data.pending_code_expires_at,
        ...flags,
      })
    }

    return NextResponse.json({ ok: true, status: 'unstarted', ...flags })
  } catch (err) {
    console.error('[phone/session GET]', err)
    return NextResponse.json({ error: 'Could not read status.' }, { status: 500 })
  }
}
