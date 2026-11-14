type TwilioSendResult =
  | { ok: true; sid: string; skipped?: false }
  | { ok: true; sid: null; skipped: true; reason: string }
  | { ok: false; error: string }

function twilioAuthHeader(): string | null {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim()
  const token = process.env.TWILIO_AUTH_TOKEN?.trim()
  if (!sid || !token) return null
  return `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`
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
