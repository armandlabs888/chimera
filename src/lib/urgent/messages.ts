import {
  URGENT_JOB_PUBLIC_ORIGIN,
} from '@/lib/urgent/constants'
import { formatCategoryLabel } from '@/lib/taxonomy'

export function formatUrgentMatchSms(input: {
  category: string
  categoryCustom?: string | null
  distanceMiles: number
  budget: number
  budgetType?: string | null
  requestId: string
}): string {
  const category = formatCategoryLabel(input.category, input.categoryCustom)
  const miles = Math.max(0, input.distanceMiles).toFixed(1)
  const price =
    input.budget <= 0
      ? 'Open to offers'
      : `$${Math.round(input.budget)}`
  const link = `${URGENT_JOB_PUBLIC_ORIGIN}/requests/${input.requestId}`
  return `BlockSide: ${category} ${miles} mi away, ${price}, needs help now. Send an offer: ${link}`
}

export function formatUrgentTakenSms(input: {
  category: string
  categoryCustom?: string | null
}): string {
  const category = formatCategoryLabel(input.category, input.categoryCustom)
  return `BlockSide: The ${category} job near you was taken. Thanks for being ready.`
}

export function formatPhoneVerifySms(code: string): string {
  return `BlockSide: Your verification code is ${code}. It expires in 10 minutes.`
}
