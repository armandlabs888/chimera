import 'server-only'
import { Resend } from 'resend'
import { ACCOUNT_DELETE_ERASE_ITEMS } from '@/lib/account/deleteAccountCopy'
import {
  ACCOUNT_DELETED_EMAIL_SUBJECT,
  buildAccountDeletedEmailHtml,
  buildAccountDeletedEmailText,
  type AccountDeletedEmailInput,
} from '@/lib/email/accountDeletedEmailContent'

const DEFAULT_FROM = 'HouseCall <no-reply@yariapp.com>'

export type SendAccountDeletedEmailResult =
  | { ok: true; skipped: true; reason: string }
  | { ok: true; skipped?: false; id: string }
  | { ok: false; error: string }

type SendInput = Omit<AccountDeletedEmailInput, 'eraseItems'> & {
  eraseItems?: readonly string[]
}

/**
 * Best-effort confirmation email after account hard-delete.
 * Missing RESEND_API_KEY skips sending with a warning. Never throws.
 */
export async function sendAccountDeletedEmail(
  input: SendInput,
): Promise<SendAccountDeletedEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    const reason = 'RESEND_API_KEY missing; account-deleted email skipped'
    console.warn(`[email] ${reason}`)
    return { ok: true, skipped: true, reason }
  }

  const from = process.env.EMAIL_FROM?.trim() || DEFAULT_FROM
  const to = input.email.trim()
  if (!to) {
    const reason = 'No recipient email; account-deleted email skipped'
    console.warn(`[email] ${reason}`)
    return { ok: true, skipped: true, reason }
  }

  const payload: AccountDeletedEmailInput = {
    email: to,
    firstName: input.firstName,
    deletedAt: input.deletedAt,
    eraseItems: input.eraseItems ?? ACCOUNT_DELETE_ERASE_ITEMS,
  }

  try {
    const resend = new Resend(apiKey)
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject: ACCOUNT_DELETED_EMAIL_SUBJECT,
      html: buildAccountDeletedEmailHtml(payload),
      text: buildAccountDeletedEmailText(payload),
    })

    if (error) {
      console.error('[email] account-deleted send failed', error.message)
      return { ok: false, error: error.message }
    }

    return { ok: true, id: data?.id ?? '' }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown email error'
    console.error('[email] account-deleted send threw', message)
    return { ok: false, error: message }
  }
}

/** Await a promise for up to `ms`, then continue. Errors are swallowed. */
export async function awaitWithTimeout<T>(
  promise: Promise<T>,
  ms = 5000,
): Promise<T | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise.catch((err) => {
        console.error('[email] account-deleted await error', err)
        return undefined
      }),
      new Promise<undefined>((resolve) => {
        timer = setTimeout(() => resolve(undefined), ms)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}
