/**
 * Casual launch taxonomy (HouseCall).
 * Active selections are parent → service leaves (+ Other custom text).
 * Legacy six-category IDs remain readable for historical records only.
 */

import { LIFESTYLE } from '@/data/media'

export const OTHER_CUSTOM_MIN = 2
export const OTHER_CUSTOM_MAX = 60

/** Selectable service / skill IDs stored on new requests & helper skills. */
export type ServiceCategoryId =
  | 'house-cleaning'
  | 'carpet-cleaning'
  | 'auto-detailing'
  | 'junk-removal'
  | 'pet-sitting'
  | 'grooming'
  | 'other'

/** Browse / marketing parent filters (All is separate). */
export type BrowseParentId = 'home' | 'auto' | 'junk-removal' | 'pets' | 'other'

export type LegacyCategoryId =
  | 'moving'
  | 'cleaning'
  | 'handyman'
  | 'petcare'
  | 'tutoring'
  | 'events'

/** @deprecated Prefer ServiceCategoryId — kept as alias for gradual migration. */
export type CategoryId = ServiceCategoryId

export type AnyKnownCategoryId = ServiceCategoryId | LegacyCategoryId | BrowseParentId

export type ServiceCategory = {
  id: ServiceCategoryId
  parentId: BrowseParentId
  label: string
  shortLabel: string
  description: string
  image: string
  tintBg: string
  tintFg: string
  typicalRange: string
  arrival: string
  templates: { title: string; details: string; budgetHint: number }[]
}

export type BrowseParent = {
  id: BrowseParentId
  label: string
  shortLabel: string
  description: string
  /** Service ids included when this parent is selected as a Browse filter. */
  serviceIds: ServiceCategoryId[]
  /** Standalone parents have a single service equal to themselves. */
  standalone: boolean
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    id: 'house-cleaning',
    parentId: 'home',
    label: 'House Cleaning',
    shortLabel: 'House Cleaning',
    description: 'Homes, apartments, kitchens & baths',
    image: LIFESTYLE.cleaning,
    tintBg: '#F5F9FF',
    tintFg: '#1D5CE5',
    typicalRange: '$60 to $140',
    arrival: 'Same day or next',
    templates: [
      {
        title: 'Post-brunch kitchen reset',
        details:
          'Kitchen and dining area after a small brunch. Dishes, counters, floors. Supplies are here. Just need an extra pair of hands for ~90 minutes.',
        budgetHint: 65,
      },
      {
        title: 'Move-out tidy before keys',
        details:
          'Studio apartment needs a solid clean before walkthrough tomorrow. Bathrooms, kitchen, floors, wipe surfaces. I have cleaning supplies.',
        budgetHint: 110,
      },
    ],
  },
  {
    id: 'carpet-cleaning',
    parentId: 'home',
    label: 'Carpet Cleaning',
    shortLabel: 'Carpet Cleaning',
    description: 'Rooms, stairs, spot treatment',
    image: LIFESTYLE.cleaning,
    tintBg: '#F5F9FF',
    tintFg: '#1D5CE5',
    typicalRange: '$80 to $180',
    arrival: 'Same day or next',
    templates: [
      {
        title: 'Living room carpet clean',
        details:
          'Need a thorough clean of living room wall-to-wall carpet after a weekend with kids. Machine welcome if you have one; otherwise deep vacuum + spot treat.',
        budgetHint: 95,
      },
    ],
  },
  {
    id: 'auto-detailing',
    parentId: 'auto',
    label: 'Auto Detailing',
    shortLabel: 'Auto Detailing',
    description: 'Interior / exterior car detailing',
    // No dedicated auto-detailing photo in the asset set — do not reuse assembly imagery.
    // Cards fall back to requester photo / neutral placeholder when image is empty.
    image: '',
    tintBg: '#F5F9FF',
    tintFg: '#071330',
    typicalRange: '$75 to $200',
    arrival: 'Book ahead or same day',
    templates: [
      {
        title: 'Interior car detail',
        details:
          'SUV interior needs vacuum, wipe-down, and glass. Parked in driveway. About 90 minutes expected.',
        budgetHint: 110,
      },
    ],
  },
  {
    id: 'junk-removal',
    parentId: 'junk-removal',
    label: 'Junk Removal',
    shortLabel: 'Junk Removal',
    description: 'Haul-away of household junk & debris',
    image: LIFESTYLE.moving,
    tintBg: '#E2E8F0',
    tintFg: '#334155',
    typicalRange: '$60 to $250',
    arrival: 'Often same day',
    templates: [
      {
        title: 'Haul away garage clutter',
        details:
          'Pile of broken furniture and cardboard in the garage. Need it loaded and taken away this weekend. Curb access for a pickup.',
        budgetHint: 120,
      },
    ],
  },
  {
    id: 'pet-sitting',
    parentId: 'pets',
    label: 'Pet Sitting',
    shortLabel: 'Pet Sitting',
    description: 'Drop-ins, walks, overnight sitting',
    image: LIFESTYLE.petcare,
    tintBg: '#F5F9FF',
    tintFg: '#071330',
    typicalRange: '$25 to $75',
    arrival: 'Walks within hours',
    templates: [
      {
        title: 'Afternoon dog walk (friendly lab)',
        details:
          'Need someone to walk our 3-year-old lab for 30 to 40 minutes. Friendly with people and dogs. Leash and bags ready by the door.',
        budgetHint: 30,
      },
      {
        title: 'Cat drop-in while at a wedding',
        details:
          'Two chill indoor cats. Need a 20-minute drop-in this evening: fresh water, food, litter scoop, quick play.',
        budgetHint: 35,
      },
    ],
  },
  {
    id: 'grooming',
    parentId: 'pets',
    label: 'Grooming',
    shortLabel: 'Grooming',
    description: 'Bath, brush, nail trim, non-clinic',
    image: LIFESTYLE.petcare,
    tintBg: '#F5F9FF',
    tintFg: '#071330',
    typicalRange: '$40 to $120',
    arrival: 'Book ahead',
    templates: [
      {
        title: 'Dog bath and brush',
        details:
          'Medium golden mix needs a bath and brush-out at home. Towels on site. Prefer gentle with water-shy dogs.',
        budgetHint: 55,
      },
    ],
  },
  {
    id: 'other',
    parentId: 'other',
    label: 'Other',
    shortLabel: 'Other',
    description: 'Describe the everyday task you need',
    image: LIFESTYLE.events,
    tintBg: '#F1F5F9',
    tintFg: '#475569',
    typicalRange: 'Varies',
    arrival: 'Flexible',
    templates: [],
  },
]

export const BROWSE_PARENTS: BrowseParent[] = [
  {
    id: 'home',
    label: 'Home',
    shortLabel: 'Home',
    description: 'House & carpet cleaning',
    serviceIds: ['house-cleaning', 'carpet-cleaning'],
    standalone: false,
  },
  {
    id: 'auto',
    label: 'Auto',
    shortLabel: 'Auto',
    description: 'Auto detailing',
    serviceIds: ['auto-detailing'],
    standalone: false,
  },
  {
    id: 'junk-removal',
    label: 'Junk Removal',
    shortLabel: 'Junk Removal',
    description: 'Haul-away help',
    serviceIds: ['junk-removal'],
    standalone: true,
  },
  {
    id: 'pets',
    label: 'Pets',
    shortLabel: 'Pets',
    description: 'Sitting & grooming',
    serviceIds: ['pet-sitting', 'grooming'],
    standalone: false,
  },
  {
    id: 'other',
    label: 'Other',
    shortLabel: 'Other',
    description: 'Custom everyday help',
    serviceIds: ['other'],
    standalone: true,
  },
]

/** Historical labels — never offered for new selection. */
export const LEGACY_CATEGORY_LABELS: Record<LegacyCategoryId, string> = {
  moving: 'Moving & lifting',
  cleaning: 'Home cleaning',
  handyman: 'Handyman & assembly',
  petcare: 'Pet care',
  tutoring: 'Tutoring & tech help',
  events: 'Events & photo',
}

const SERVICE_BY_ID = Object.fromEntries(
  SERVICE_CATEGORIES.map((c) => [c.id, c]),
) as Record<ServiceCategoryId, ServiceCategory>

const PARENT_BY_ID = Object.fromEntries(BROWSE_PARENTS.map((p) => [p.id, p])) as Record<
  BrowseParentId,
  BrowseParent
>

const ACTIVE_SERVICE_IDS = new Set<string>(SERVICE_CATEGORIES.map((c) => c.id))
const BROWSE_PARENT_IDS = new Set<string>(BROWSE_PARENTS.map((p) => p.id))
const LEGACY_IDS = new Set<string>(Object.keys(LEGACY_CATEGORY_LABELS))

export function isServiceCategoryId(value: string | null | undefined): value is ServiceCategoryId {
  return Boolean(value && ACTIVE_SERVICE_IDS.has(value))
}

export function isBrowseParentId(value: string | null | undefined): value is BrowseParentId {
  return Boolean(value && BROWSE_PARENT_IDS.has(value))
}

export function isLegacyCategoryId(value: string | null | undefined): value is LegacyCategoryId {
  return Boolean(value && LEGACY_IDS.has(value))
}

/** Active posting/skill IDs only. */
export function isCategoryId(value: string | null | undefined): value is ServiceCategoryId {
  return isServiceCategoryId(value)
}

export function getServiceCategory(id: ServiceCategoryId): ServiceCategory {
  return SERVICE_BY_ID[id]
}

export function getBrowseParent(id: BrowseParentId): BrowseParent {
  return PARENT_BY_ID[id]
}

export function servicesForParent(parentId: BrowseParentId): ServiceCategory[] {
  return PARENT_BY_ID[parentId].serviceIds.map((id) => SERVICE_BY_ID[id])
}

/** Display label for cards, filters, and profiles. */
export function formatCategoryLabel(
  id: string | null | undefined,
  custom?: string | null,
): string {
  if (!id) return 'Local help'
  if (id === 'other') {
    const trimmed = (custom ?? '').trim()
    return trimmed || 'Other'
  }
  if (isServiceCategoryId(id)) return SERVICE_BY_ID[id].label
  if (isBrowseParentId(id)) return PARENT_BY_ID[id].label
  if (isLegacyCategoryId(id)) return LEGACY_CATEGORY_LABELS[id]
  // Unknown historical value — readable, not inventing a remap.
  return id.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function getCategoryImage(id: string | null | undefined): string {
  if (id && isServiceCategoryId(id)) {
    const image = SERVICE_BY_ID[id].image
    // Empty = no matching asset (e.g. auto-detailing); do not substitute mismatched photos.
    return image || ''
  }
  if (id && isLegacyCategoryId(id)) {
    const map: Record<LegacyCategoryId, string> = {
      moving: LIFESTYLE.moving,
      cleaning: LIFESTYLE.cleaning,
      handyman: LIFESTYLE.handyman,
      petcare: LIFESTYLE.petcare,
      tutoring: LIFESTYLE.tutoring,
      events: LIFESTYLE.events,
    }
    return map[id]
  }
  return LIFESTYLE.cleaning
}

/** Expand a Browse filter id into matching stored request/skill category ids. */
export function expandBrowseFilter(filter: string | null | undefined): string[] | null {
  if (!filter || filter === 'all') return null
  if (isBrowseParentId(filter)) return [...PARENT_BY_ID[filter].serviceIds]
  if (isServiceCategoryId(filter)) return [filter]
  // Legacy deep link: match that exact historical id only.
  if (isLegacyCategoryId(filter)) return [filter]
  return [filter]
}

export function matchesBrowseCategory(
  requestCategory: string,
  filter: string | null | undefined,
): boolean {
  const expanded = expandBrowseFilter(filter)
  if (!expanded) return true
  return expanded.includes(requestCategory)
}

export function normalizeOtherCustom(
  raw: string,
): { ok: true; value: string } | { ok: false; error: string } {
  // Trim, collapse whitespace, strip control chars; React escapes on render.
  const value = raw
    // eslint-disable-next-line no-control-regex -- strip control chars before persist
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (value.length < OTHER_CUSTOM_MIN) {
    return {
      ok: false,
      error: `Describe the task in at least ${OTHER_CUSTOM_MIN} characters.`,
    }
  }
  if (value.length > OTHER_CUSTOM_MAX) {
    return {
      ok: false,
      error: `Keep it under ${OTHER_CUSTOM_MAX} characters.`,
    }
  }
  return { ok: true, value }
}

/** Default leaf when a parent is chosen without a child yet. */
export function defaultServiceForParent(parentId: BrowseParentId): ServiceCategoryId {
  return PARENT_BY_ID[parentId].serviceIds[0]
}

export function parentIdForService(serviceId: ServiceCategoryId): BrowseParentId {
  return SERVICE_BY_ID[serviceId].parentId
}
