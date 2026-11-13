/**
 * Category surface for HouseCall UI.
 * Source of truth for active taxonomy lives in `@/lib/taxonomy`.
 * This module re-exports helpers used across post / browse / landing.
 */

import type { WhenOption } from '@/types'
import {
  SERVICE_CATEGORIES,
  type ServiceCategory,
  formatCategoryLabel,
  getServiceCategory,
  isServiceCategoryId,
} from '@/lib/taxonomy'

export type { ServiceCategoryId as CategoryId } from '@/lib/taxonomy'
export type { ServiceCategory as Category } from '@/lib/taxonomy'

/** Active selectable services (not Browse parents, not legacy). */
export const CATEGORIES: ServiceCategory[] = SERVICE_CATEGORIES

export function getCategory(id: string): ServiceCategory {
  if (isServiceCategoryId(id)) return getServiceCategory(id)
  // Fallback image/meta for unknown — never invent a remap of legacy into a new service.
  return getServiceCategory('other')
}

export function categoryLabel(id: string, custom?: string | null): string {
  return formatCategoryLabel(id, custom)
}

/**
 * Browse filter chips + legacy when ids.
 * New posts only write asap | scheduled; today/tomorrow/this-week remain for read/filter.
 * ASAP filter stays short "ASAP"; full phrase is used on new listing whenLabel.
 */
export const WHEN_OPTIONS = [
  { id: 'asap' as const, label: 'ASAP', detail: 'Looking for help now' },
  { id: 'today' as const, label: 'Today', detail: 'Sometime today' },
  { id: 'tomorrow' as const, label: 'Tomorrow', detail: 'Anytime tomorrow' },
  { id: 'this-week' as const, label: 'This week', detail: 'Flexible this week' },
]

export function whenLabel(id: WhenOption): string {
  if (id === 'scheduled') return 'Scheduled'
  if (id === 'asap') return 'As soon as possible'
  return WHEN_OPTIONS.find((w) => w.id === id)?.label ?? id
}
