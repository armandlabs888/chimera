import 'server-only'
import { Resend } from 'resend'
import {
  buildSupportEmailSubject,
  buildSupportEmailText,
  type SupportEmailInput,
} from '@/lib/email/supportEmailContent'

export type { SupportEmailInput, SupportTopic } from '@/lib/email/supportEmailContent'
export { buildSupportEmailSubject } from '@/lib/email/supportEmailContent'

const DEFAULT_FROM = 'BlockSide <no-reply@joinbunk.xyz>'

export type SendSupportEmailResult =
  | { ok: true; skipped: true; reason: string }
  | { ok: true; skipped?: false; id: string }
  | { ok: false; error: string }

/**
 * Notify the support inbox of a contact form submission.
 * Missing RESEND_API_KEY or SUPPORT_INBOX_EMAIL skips silently. Never throws.
 */
export async function sendSupportEmail(
  input: SupportEmailInput,
): Promise<SendSupportEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const inbox = process.env.SUPPORT_INBOX_EMAIL?.trim()
  if (!apiKey || !inbox) {
    const reason =
      !apiKey && !inbox
        ? 'RESEND_API_KEY and SUPPORT_INBOX_EMAIL missing; support email skipped'
        : !apiKey
          ? 'RESEND_API_KEY missing; support email skipped'
          : 'SUPPORT_INBOX_EMAIL missing; support email skipped'
    console.warn(`[email] ${reason}`)
    return { ok: true, skipped: true, reason }
  }

  const from = process.env.EMAIL_FROM?.trim() || DEFAULT_FROM
  const subject = buildSupportEmailSubject(input.topic, input.message)
  const text = buildSupportEmailText(input)

  try {
    const resend = new Resend(apiKey)
    const { data, error } = await resend.emails.send({
      from,
      to: inbox,
      replyTo: input.email,
      subject,
      text,
    })

    if (error) {
      console.error('[email] support send failed', error.message)
      return { ok: false, error: error.message }
    }

    return { ok: true, id: data?.id ?? '' }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown email error'
    console.error('[email] support send threw', message)
    return { ok: false, error: message }
  }
}
