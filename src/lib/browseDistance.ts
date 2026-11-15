import { haversineMiles, resolveCoords } from '@/lib/location'

export const BROWSE_RADIUS_OPTIONS = [
  { id: '1', label: '1 mi' },
  { id: '5', label: '5 mi' },
  { id: '10', label: '10 mi' },
  { id: 'all', label: 'Any' },
] as const

export type BrowseRadiusId = (typeof BROWSE_RADIUS_OPTIONS)[number]['id']

export const BROWSE_RADIUS_STEP: BrowseRadiusId[] = ['1', '5', '10', 'all']

/** Round for display: one decimal under 10 mi, whole miles at/above 10. */
export function roundBrowseMiles(miles: number): number {
  if (!Number.isFinite(miles)) return miles
  if (miles < 10) return Math.round(miles * 10) / 10
  return Math.round(miles)
}

export function formatBrowseMiles(miles: number): string {
  const rounded = roundBrowseMiles(miles)
  if (rounded < 10) {
    const text = Number.isInteger(rounded) ? rounded.toFixed(1) : String(rounded)
    return `${text} mi`
  }
  return `${rounded} mi`
}

export function formatBrowseMilesAway(miles: number): string {
  return `${formatBrowseMiles(miles)} away`
}

export function radiusMilesValue(radius: BrowseRadiusId): number | null {
  if (radius === 'all') return null
  return Number(radius)
}

export function nextBrowseRadius(radius: BrowseRadiusId): BrowseRadiusId {
  const idx = BROWSE_RADIUS_STEP.indexOf(radius)
  if (idx < 0 || idx >= BROWSE_RADIUS_STEP.length - 1) return 'all'
  return BROWSE_RADIUS_STEP[idx + 1]
}

export function radiusPhrase(radius: BrowseRadiusId): string {
  if (radius === 'all') return 'any distance'
  if (radius === '1') return '1 mile'
  return `${radius} miles`
}

export function parseBrowseRadius(
  value: string | null,
  hasHome: boolean,
): BrowseRadiusId {
  if (value === '1' || value === '5' || value === '10' || value === 'all') return value
  // Legacy query values from the old distance picker.
  if (value === '3' || value === '25') return 'all'
  return hasHome ? '1' : 'all'
}

export function computeEntityDistanceMiles(
  origin: { lat?: number | null; lng?: number | null },
  entity: { lat?: number | null; lng?: number | null; neighborhood?: string },
): number | null {
  const o = resolveCoords(origin)
  const e = resolveCoords(entity)
  if (!o || !e) return null
  return roundBrowseMiles(haversineMiles(o.lat, o.lng, e.lat, e.lng))
}

/**
 * Filter + distance map for browse lists.
 * When radius is set, entities without coordinates are excluded.
 * When Any, entities without coordinates remain with null distance.
 */
export function distanceMapForEntities<T extends { id: string }>(
  entities: T[],
  origin: { lat?: number | null; lng?: number | null } | null,
  radius: BrowseRadiusId,
  getCoords: (entity: T) => {
    lat?: number | null
    lng?: number | null
    neighborhood?: string
  },
): { ids: Set<string>; milesById: Map<string, number | null> } {
  const milesById = new Map<string, number | null>()
  const ids = new Set<string>()
  const radiusMiles = radiusMilesValue(radius)
  const hasOrigin =
    origin != null &&
    typeof origin.lat === 'number' &&
    typeof origin.lng === 'number' &&
    Number.isFinite(origin.lat) &&
    Number.isFinite(origin.lng)

  for (const entity of entities) {
    if (!hasOrigin) {
      milesById.set(entity.id, null)
      ids.add(entity.id)
      continue
    }
    const miles = computeEntityDistanceMiles(origin, getCoords(entity))
    if (radiusMiles != null) {
      if (miles == null || miles > radiusMiles) continue
      milesById.set(entity.id, miles)
      ids.add(entity.id)
      continue
    }
    milesById.set(entity.id, miles)
    ids.add(entity.id)
  }

  return { ids, milesById }
}
