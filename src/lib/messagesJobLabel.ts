import { formatCategoryLabel } from '@/lib/taxonomy'
import type { HelpRequest } from '@/types'

/** Thread / header subtitle: "Carpet cleaning · 95112" or "Direct message". */
export function jobThreadSubtitle(request: HelpRequest | undefined | null): string {
  if (!request) return 'Direct message'
  const category = formatCategoryLabel(request.category, request.categoryCustom)
  const zip = (request.zip ?? '').trim()
  if (zip) return `${category} · ${zip}`
  return category
}
