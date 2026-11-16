/** Mask E.164 for UI: +1•••••1212 */
export function maskPhoneE164(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 4) return '••••'
  const last4 = digits.slice(-4)
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1•••••${last4}`
  }
  if (digits.length === 10) {
    return `+1•••••${last4}`
  }
  const country = digits.slice(0, Math.max(1, digits.length - 10))
  return `+${country}•••••${last4}`
}

export const PHONE_ALREADY_USED_MESSAGE =
  'This number is already used on another Bunk account.'

/**
 * Parse a Bunk inbound confirmation code from an SMS body.
 * Accepts forms like "Bunk code 482913", "bunk code:482913", or a bare 6-digit code.
 */
export function parseInboundPhoneCode(body: string): string | null {
  const text = (body || '').trim()
  if (!text) return null

  const labeled =
    text.match(/\bbunk\s*code[:\s#-]*([0-9]{6})\b/i) ||
    text.match(/\bcode[:\s#-]*([0-9]{6})\b/i)
  if (labeled?.[1]) return labeled[1]

  const bare = text.match(/^\s*([0-9]{6})\s*$/)
  if (bare?.[1]) return bare[1]

  return null
}

/** Build the pre-filled sms: URI for QR / mobile deep link. */
export function buildPhoneConfirmSmsUri(input: {
  toE164: string
  code: string
}): string {
  const digits = input.toE164.replace(/\D/g, '')
  const body = encodeURIComponent(`Bunk code ${input.code}`)
  return `sms:+${digits}?&body=${body}`
}
