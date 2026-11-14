import { createHmac, timingSafeEqual } from 'node:crypto'

type TwilioSendResult =
  | { ok: true; sid: string; skipped?: false }
  | { ok: true; sid: null; skipped: true; reason: string }
  | { ok: false; error: string }

/** Canonical public webhook URL used for X-Twilio-Signature validation. */
export const TWILIO_INBOUND_PUBLIC_URL = 'https://www.yariapp.com/api/twilio/inbound'

function twilioAuthHeader(): string | null {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim()
  const token = process.env.TWILIO_AUTH_TOKEN?.trim()
  if (!sid || !token) return null
  return `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`
}

/**
 * Validate Twilio's X-Twilio-Signature (HMAC-SHA1 of full URL + sorted POST params).
 * Returns false when the auth token is missing or the signature does not match.
 */
export function validateTwilioRequestSignature(input: {
  signatureHeader: string | null
  publicUrl: string
  params: Record<string, string>
}): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim()
  const signature = input.signatureHeader?.trim()
  if (!authToken || !signature) return false

  const sortedKeys = Object.keys(input.params).sort()
  let data = input.publicUrl
  for (const key of sortedKeys) {
    data += key + (input.params[key] ?? '')
  }

  const expected = createHmac('sha1', authToken).update(data, 'utf8').digest('base64')
  try {
    const a = Buffer.from(expected)
    const b = Buffer.from(signature)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export function twilioConfigured(): boolean {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim()
  const token = process.env.TWILIO_AUTH_TOKEN?.trim()
  const from =
    process.env.TWILIO_FROM_NUMBER?.trim() ||
    process.env.TWILIO_MESSAGING_SERVICE_SID?.trim()
  return Boolean(sid && token && from)
}

/** Send an SMS via Twilio REST. Missing env → skip gracefully (no throw). */
export async function sendTwilioSms(input: {
  to: string
  body: string
}): Promise<TwilioSendResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim()
  const auth = twilioAuthHeader()
  const fromNumber = process.env.TWILIO_FROM_NUMBER?.trim()
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim()

  if (!accountSid || !auth || (!fromNumber && !messagingServiceSid)) {
    const reason = 'Twilio env vars missing; SMS skipped'
    console.warn(`[twilio] ${reason}`)
    return { ok: true, sid: null, skipped: true, reason }
  }

  const params = new URLSearchParams()
  params.set('To', input.to)
  params.set('Body', input.body)
  if (messagingServiceSid) {
    params.set('MessagingServiceSid', messagingServiceSid)
  } else if (fromNumber) {
    params.set('From', fromNumber)
  }

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: auth,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      },
    )
    const json = (await res.json().catch(() => ({}))) as {
      sid?: string
      message?: string
      error_message?: string
    }
    if (!res.ok) {
      const error = json.message || json.error_message || `Twilio HTTP ${res.status}`
      console.error('[twilio] send failed', error)
      return { ok: false, error }
    }
    return { ok: true, sid: json.sid || '' }
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Twilio request failed'
    console.error('[twilio] send exception', error)
    return { ok: false, error }
  }
}

/** Normalize US-ish phone input to E.164 (+1…). Returns null if invalid. */
export function toE164(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (raw.trim().startsWith('+') && digits.length >= 8 && digits.length <= 15) {
    return `+${digits}`
  }
  return null
}
