import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { toE164 } from '@/lib/urgent/twilio'

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

/**
 * Twilio inbound SMS webhook for STOP / START / HELP.
 * Configure in Twilio console:
 *   https://www.yariapp.com/api/twilio/inbound
 */
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || ''
    let from = ''
    let body = ''
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const form = await request.formData()
      from = String(form.get('From') || '')
      body = String(form.get('Body') || '')
    } else {
      const json = (await request.json().catch(() => ({}))) as {
        From?: string
        Body?: string
      }
      from = json.From || ''
      body = json.Body || ''
    }

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

    if (keyword === 'STOP' || keyword === 'STOPALL' || keyword === 'UNSUBSCRIBE' || keyword === 'CANCEL' || keyword === 'END' || keyword === 'QUIT') {
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
