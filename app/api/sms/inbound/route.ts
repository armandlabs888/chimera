import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  consumeInboundPhoneCode,
} from '@/lib/phone/applyVerified'
import {
  hashPhoneCode,
  parseInboundPhoneCode,
  PHONE_SMS_INBOUND_PUBLIC_URL,
  phoneCodeHashesEqual,
} from '@/lib/phone/verify'
import { toE164, validateTwilioRequestSignature } from '@/lib/urgent/twilio'

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
 * Twilio inbound SMS webhook for phone confirmation codes (and STOP/START/HELP).
 * Requires a valid X-Twilio-Signature. Configure in Twilio console:
 *   https://www.joinbunk.xyz/api/sms/inbound
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
      return forbidden()
    }

    const signature = request.headers.get('x-twilio-signature')
    const valid = validateTwilioRequestSignature({
      signatureHeader: signature,
      publicUrl: PHONE_SMS_INBOUND_PUBLIC_URL,
      params,
    })
    if (!valid) {
      console.warn('[sms/inbound] Invalid or missing X-Twilio-Signature')
      return forbidden()
    }

    const from = params.From || ''
    const body = params.Body || ''
    const phone = toE164(from)
    const keyword = body.trim().split(/\s+/)[0]?.toUpperCase() || ''

    if (!phone) {
      return twiml('BlockSide: We could not read that phone number.')
    }

    const admin = createAdminClient()
    if (!admin) {
      console.warn('[sms/inbound] No service role')
      return twiml('BlockSide: Temporary issue. Try again later.')
    }

    if (keyword === 'HELP' || keyword === 'INFO') {
      return twiml(
        'BlockSide urgent job alerts. Msg & data rates may apply. Reply STOP to opt out, START to opt back in.',
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
          .update({ sms_opt_in: false, sms_opt_in_pending: false })
          .eq('profile_id', row.profile_id)
      }
      return twiml(
        'BlockSide: You are opted out of urgent job texts. Reply START to opt back in anytime.',
      )
    }

    if (keyword === 'START' || keyword === 'YES' || keyword === 'UNSTOP') {
      const { data: rows } = await admin
        .from('helper_urgent_sms_settings')
        .select('profile_id, phone_confirmed_at')
        .eq('phone_e164', phone)
      if (!rows?.length) {
        return twiml(
          'BlockSide: Confirm your phone in Profile & account first, then you can opt in to optional urgent job texts.',
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
        'BlockSide: You are opted in to optional urgent job texts near you. Reply STOP to opt out.',
      )
    }

    const code = parseInboundPhoneCode(body)
    if (code) {
      const result = await consumeInboundPhoneCode({
        admin,
        code,
        fromE164: phone,
        hashCode: hashPhoneCode,
        hashesEqual: phoneCodeHashesEqual,
      })
      if (result.ok) {
        return twiml('Thanks, your BlockSide phone is confirmed.')
      }
      if (result.reason === 'taken') {
        return twiml(
          'BlockSide: This number is already used on another BlockSide account.',
        )
      }
      if (result.reason === 'expired') {
        return twiml('BlockSide: That code expired. Open the app to get a new one.')
      }
      return twiml('BlockSide: We could not match that code. Open the app and try again.')
    }

    return twiml(
      'BlockSide: Reply STOP to opt out, START to opt in, or HELP for info. Manage settings in the app.',
    )
  } catch (err) {
    console.error('[sms/inbound]', err)
    return twiml('BlockSide: Temporary issue. Try again later.')
  }
}
