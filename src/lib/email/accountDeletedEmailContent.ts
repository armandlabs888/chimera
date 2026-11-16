/** Pure email body builders for account-deletion confirmation (safe for unit scripts). */

export const ACCOUNT_DELETED_EMAIL_SUBJECT = 'Your HouseCall account has been deleted'

export const ACCOUNT_DELETED_AUTH_URL = 'https://www.yariapp.com/auth'

const PRODUCT_NAME = 'HouseCall'
const TEXT = '#071330'
const META = '#4A5568'
const HAIRLINE = '#E3E8EF'
const PRIMARY = '#1D5CE5'

export type AccountDeletedEmailInput = {
  email: string
  firstName?: string | null
  deletedAt?: Date
  /** Usually ACCOUNT_DELETE_ERASE_ITEMS; passed in so this module stays import-light. */
  eraseItems: readonly string[]
}

/** Format deletion date in America/Los_Angeles without em/en dashes. */
export function formatAccountDeletedDate(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).formatToParts(date)

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? ''

  const month = get('month')
  const day = get('day')
  const year = get('year')
  const hour = get('hour')
  const minute = get('minute')
  const dayPeriod = get('dayPeriod')
  const timeZoneName = get('timeZoneName')

  return `${month} ${day}, ${year} at ${hour}:${minute} ${dayPeriod} ${timeZoneName}`
}

function greetingName(firstName?: string | null): string | null {
  const trimmed = firstName?.trim()
  if (!trimmed) return null
  return trimmed.split(/\s+/)[0] || null
}

export function buildAccountDeletedEmailText(input: AccountDeletedEmailInput): string {
  const name = greetingName(input.firstName)
  const greeting = name ? `Hi ${name},` : 'Hi,'
  const when = formatAccountDeletedDate(input.deletedAt ?? new Date())
  const eraseLines = input.eraseItems.map((item) => `- ${item}`).join('\n')

  return [
    greeting,
    '',
    `This confirms that your ${PRODUCT_NAME} account for ${input.email} was deleted on ${when}.`,
    '',
    'We erased the following from HouseCall:',
    eraseLines,
    '',
    'This is permanent and cannot be undone.',
    '',
    `To use ${PRODUCT_NAME} again, create a new account: ${ACCOUNT_DELETED_AUTH_URL}`,
    '',
    "If you didn't request this, reply to this email.",
    '',
    `${PRODUCT_NAME}`,
  ].join('\n')
}

export function buildAccountDeletedEmailHtml(input: AccountDeletedEmailInput): string {
  const name = greetingName(input.firstName)
  const greeting = name ? `Hi ${name},` : 'Hi,'
  const when = formatAccountDeletedDate(input.deletedAt ?? new Date())
  const eraseItems = input.eraseItems
    .map(
      (item) =>
        `<li style="margin:0 0 8px;padding:0;color:${TEXT};font-size:15px;line-height:1.45;">${escapeHtml(item)}</li>`,
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(ACCOUNT_DELETED_EMAIL_SUBJECT)}</title>
</head>
<body style="margin:0;padding:0;background:#FFFFFF;color:${TEXT};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;border:1px solid ${HAIRLINE};">
          <tr>
            <td style="padding:28px 28px 8px;">
              <div style="font-size:22px;line-height:1.2;font-weight:700;letter-spacing:-0.02em;">
                <span style="color:${TEXT};">House</span><span style="color:${PRIMARY};">Call</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 20px;">
              <div style="height:1px;background:${HAIRLINE};line-height:1px;font-size:1px;">&nbsp;</div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 24px;color:${TEXT};font-size:15px;line-height:1.55;">
              <p style="margin:0 0 16px;">${escapeHtml(greeting)}</p>
              <p style="margin:0 0 16px;">
                This confirms that your ${PRODUCT_NAME} account for
                <strong style="font-weight:600;">${escapeHtml(input.email)}</strong>
                was deleted on ${escapeHtml(when)}.
              </p>
              <p style="margin:0 0 10px;color:${META};font-size:13px;letter-spacing:0.02em;text-transform:uppercase;">
                What we erased
              </p>
              <ul style="margin:0 0 20px;padding:0 0 0 18px;">
                ${eraseItems}
              </ul>
              <p style="margin:0 0 16px;font-weight:600;">
                This is permanent and cannot be undone.
              </p>
              <p style="margin:0 0 20px;">
                To use ${PRODUCT_NAME} again, create a new account.
              </p>
              <p style="margin:0 0 24px;">
                <a href="${ACCOUNT_DELETED_AUTH_URL}"
                   style="display:inline-block;background:${PRIMARY};color:#FFFFFF;text-decoration:none;font-weight:600;font-size:14px;line-height:1;padding:12px 18px;">
                  Create a new account
                </a>
              </p>
              <p style="margin:0;color:${META};font-size:13px;line-height:1.5;">
                If you didn't request this, reply to this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;">
              <div style="height:1px;background:${HAIRLINE};line-height:1px;font-size:1px;">&nbsp;</div>
              <p style="margin:16px 0 0;color:${META};font-size:12px;line-height:1.4;">
                ${PRODUCT_NAME} · <a href="https://www.yariapp.com" style="color:${META};text-decoration:underline;">yariapp.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
