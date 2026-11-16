/** Contact form topics. DB slugs + UI labels. No em or en dashes. */

export const SUPPORT_TOPICS = [
  { value: 'account_sign_in', label: 'Account or sign in' },
  { value: 'job_or_offer', label: 'A job or offer' },
  { value: 'verification', label: 'Verification' },
  { value: 'safety_concern', label: 'Safety concern' },
  { value: 'billing', label: 'Billing' },
  { value: 'something_else', label: 'Something else' },
] as const

export type SupportTopic = (typeof SUPPORT_TOPICS)[number]['value']

const TOPIC_SET = new Set<string>(SUPPORT_TOPICS.map((t) => t.value))

export function isSupportTopic(value: unknown): value is SupportTopic {
  return typeof value === 'string' && TOPIC_SET.has(value)
}

export function supportTopicLabel(topic: SupportTopic): string {
  return SUPPORT_TOPICS.find((t) => t.value === topic)?.label ?? topic
}

export const FEEDBACK_KINDS = [
  { value: 'idea', label: 'Idea' },
  { value: 'bug', label: 'Something broke' },
  { value: 'praise', label: 'Praise' },
] as const

export type FeedbackKind = (typeof FEEDBACK_KINDS)[number]['value']

const KIND_SET = new Set<string>(FEEDBACK_KINDS.map((k) => k.value))

export function isFeedbackKind(value: unknown): value is FeedbackKind {
  return typeof value === 'string' && KIND_SET.has(value)
}
