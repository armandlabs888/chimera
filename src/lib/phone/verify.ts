import { createHash, randomInt, timingSafeEqual } from 'node:crypto'
export {
  buildPhoneConfirmSmsUri,
  maskPhoneE164,
  parseInboundPhoneCode,
  PHONE_ALREADY_USED_MESSAGE,
} from '@/lib/phone/format'

/** Public Twilio inbound webhook for phone-confirm SMS (prod). */
export const PHONE_SMS_INBOUND_PUBLIC_URL =
  'https://www.joinbunk.xyz/api/sms/inbound'

export const PHONE_CODE_TTL_MS = 10 * 60 * 1000
export const PHONE_MAX_ATTEMPTS = 5
export const PHONE_MAX_SENDS_PER_WINDOW = 5
export const PHONE_SEND_WINDOW_MS = 60 * 60 * 1000

/** Hash a one-time code for server-side storage. */
export function hashPhoneCode(code: string): string {
  return createHash('sha256').update(code.trim()).digest('hex')
}

/** Timing-safe compare of two hex digests. */
export function phoneCodeHashesEqual(a: string, b: string): boolean {
  try {
    const left = Buffer.from(a, 'hex')
    const right = Buffer.from(b, 'hex')
    if (left.length !== right.length || left.length === 0) return false
    return timingSafeEqual(left, right)
  } catch {
    return false
  }
}

/** Six-digit numeric code for inbound SMS or OTP. */
export function generatePhoneCode(): string {
  return String(randomInt(100000, 999999))
}

export function isPhoneUniqueViolation(error: {
  code?: string
  message?: string
} | null): boolean {
  if (!error) return false
  if (error.code === '23505') return true
  const msg = (error.message || '').toLowerCase()
  return (
    msg.includes('phone_verifications_phone_unique') ||
    (msg.includes('duplicate key') && msg.includes('phone_e164'))
  )
}

export function formatOtpVerifySms(code: string): string {
  return `Bunk: Your verification code is ${code}. It expires in 10 minutes.`
}

export type PhoneVerifyStatus =
  | 'unstarted'
  | 'pending'
  | 'verified'
  | 'expired'
  | 'error'
