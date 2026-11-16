/** Pure subject/body builders for support inbox email (safe for unit scripts). */

export type SupportTopic =
  | 'account_sign_in'
  | 'job_or_offer'
  | 'verification'
  | 'safety_concern'
  | 'billing'
  | 'something_else'

const TOPIC_LABELS: Record<SupportTopic, string> = {
  account_sign_in: 'Account or sign in',
  job_or_offer: 'A job or offer',
  verification: 'Verification',
  safety_concern: 'Safety concern',
  billing: 'Billing',
  something_else: 'Something else',
}

export type SupportEmailInput = {
  name: string
  email: string
  topic: SupportTopic
  message: string
  jobLink?: string | null
  screenshotPath?: string | null
  userId?: string | null
}

function firstWords(message: string, max = 48): string {
  const compact = message.replace(/\s+/g, ' ').trim()
  if (compact.length <= max) return compact
  const cut = compact.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > 20 ? cut.slice(0, lastSpace) : cut).trim()}...`
}

export function buildSupportEmailSubject(topic: SupportTopic, message: string): string {
  const label = TOPIC_LABELS[topic]
  const prefix = topic === 'safety_concern' ? '[SAFETY] ' : ''
  return `${prefix}[Bunk support] ${label}: ${firstWords(message)}`
}

export function buildSupportEmailText(input: SupportEmailInput): string {
  const lines = [
    `Topic: ${TOPIC_LABELS[input.topic]}`,
    `From: ${input.name} <${input.email}>`,
    input.userId ? `User id: ${input.userId}` : 'User id: (guest)',
    input.jobLink ? `Job link: ${input.jobLink}` : null,
    input.screenshotPath ? `Screenshot path: ${input.screenshotPath}` : null,
    '',
    input.message,
  ]
  return lines.filter((l) => l != null).join('\n')
}
