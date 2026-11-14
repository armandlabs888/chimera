import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  TWILIO_INBOUND_PUBLIC_URL,
  toE164,
  validateTwilioRequestSignature,
} from '@/lib/urgent/twilio'

export const runtime = 'nodejs'

function twiml(message: string): NextResponse {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(
    message,
  )}</Message></Response>`
  return new NextResponse(xml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
  })
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function forbidden(): NextResponse {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

/**
 * Twilio inbound SMS webhook for STOP / START / HELP.
 * Requires a valid X-Twilio-Signature. Configure in Twilio console:
 *   https://www.yariapp.com/api/twilio/inbound
 */
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || ''
    const params: Record<string, string> = {}

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const form = await request.formData()
      for (const [key, value] of form.entries()) {
        if (typeof value === 'string') params[key] = value
      }
    } else {
      // Twilio webhooks are form-urlencoded; reject other bodies without mutating state.
      return forbidden()
    }

    const signature = request.headers.get('x-twilio-signature')
    const valid = validateTwilioRequestSignature({
      signatureHeader: signature,
      publicUrl: TWILIO_INBOUND_PUBLIC_URL,
      params,
    })
    if (!valid) {
      console.warn('[twilio/inbound] Invalid or missing X-Twilio-Signature')
      return forbidden()
    }

    const from = params.From || ''
    const body = params.Body || ''
    const phone = toE164(from)
    const keyword = body.trim().split(/\s+/)[0]?.toUpperCase() || ''

    if (!phone) {
      return twiml('HouseCall: We could not read that phone number.')
    }

    const admin = createAdminClient()
    if (!admin) {
      console.warn('[twilio/inbound] No service role')
      return twiml('HouseCall: Temporary issue. Try again later.')
    }

    if (keyword === 'HELP' || keyword === 'INFO') {
      return twiml(
        'HouseCall urgent job alerts. Msg & data rates may apply. Reply STOP to opt out, START to opt back in.',
      )
    }

    if (
      keyword === 'STOP' ||
      keyword === 'STOPALL' ||
      keyword === 'UNSUBSCRIBE' ||
      keyword === 'CANCEL' ||
      keyword === 'END' ||
      keyword === 'QUIT'
    ) {
      const { data: rows } = await admin
        .from('helper_urgent_sms_settings')
        .select('profile_id')
        .eq('phone_e164', phone)
      for (const row of rows ?? []) {
        await admin
          .from('helper_urgent_sms_settings')
          .update({ sms_opt_in: false })
          .eq('profile_id', row.profile_id)
      }
      return twiml(
        'HouseCall: You are opted out of urgent job texts. Reply START to opt back in anytime.',
      )
    }

    if (keyword === 'START' || keyword === 'YES' || keyword === 'UNSTOP') {
      const { data: rows } = await admin
        .from('helper_urgent_sms_settings')
        .select('profile_id, phone_confirmed_at')
        .eq('phone_e164', phone)
      if (!rows?.length) {
        return twiml(
          'HouseCall: Confirm your phone in Profile & account first, then you can opt in to optional urgent job texts.',
        )
      }
      for (const row of rows) {
        if (!row.phone_confirmed_at) continue
        await admin
          .from('helper_urgent_sms_settings')
          .update({ sms_opt_in: true })
          .eq('profile_id', row.profile_id)
      }
      return twiml(
        'HouseCall: You are opted in to optional urgent job texts near you. Reply STOP to opt out.',
      )
    }

    return twiml(
      'HouseCall: Reply STOP to opt out, START to opt in, or HELP for info. Manage settings in the app.',
    )
  } catch (err) {
    console.error('[twilio/inbound]', err)
    return twiml('HouseCall: Temporary issue. Try again later.')
  }
}
