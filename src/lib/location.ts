import { NEIGHBORHOODS, getNeighborhood } from '@/data/neighborhoods'
import type { NeighborhoodId } from '@/types'

/** Approximate lat/lng for legacy Austin neighborhood slugs (for Haversine fallbacks). */
export const NEIGHBORHOOD_COORDS: Record<NeighborhoodId, { lat: number; lng: number }> = {
  'east-austin': { lat: 30.2672, lng: -97.7205 },
  'hyde-park': { lat: 30.3085, lng: -97.7268 },
  mueller: { lat: 30.298, lng: -97.7045 },
  zilker: { lat: 30.2642, lng: -97.7728 },
  'south-congress': { lat: 30.2489, lng: -97.749 },
  'travis-heights': { lat: 30.2435, lng: -97.7455 },
  clarksville: { lat: 30.2815, lng: -97.762 },
  'the-domain': { lat: 30.402, lng: -97.726 },
}

const LEGACY_SLUGS = new Set(NEIGHBORHOODS.map((n) => n.id))

export function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const R = 3958.8
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.min(1, Math.sqrt(a)))
}

export function resolveCoords(entity: {
  lat?: number | null
  lng?: number | null
  neighborhood?: string
}): { lat: number; lng: number } | null {
  if (
    typeof entity.lat === 'number' &&
    typeof entity.lng === 'number' &&
    Number.isFinite(entity.lat) &&
    Number.isFinite(entity.lng)
  ) {
    return { lat: entity.lat, lng: entity.lng }
  }
  const slug = entity.neighborhood
  if (slug && LEGACY_SLUGS.has(slug as NeighborhoodId)) {
    return NEIGHBORHOOD_COORDS[slug as NeighborhoodId]
  }
  return null
}

/** Prefer locationLabel; fall back to legacy neighborhood shortName; else Nearby. */
export function formatLocationLabel(entity: {
  locationLabel?: string | null
  neighborhood?: string | null
}): string {
  const label = (entity.locationLabel ?? '').trim()
  if (label) return label
  const slug = (entity.neighborhood ?? '').trim()
  if (slug && LEGACY_SLUGS.has(slug as NeighborhoodId)) {
    return getNeighborhood(slug as NeighborhoodId)?.shortName ?? 'Nearby'
  }
  return 'Nearby'
}

/** Prefer locationLabel; fall back to legacy shortName; else Local area. */
export function formatLocation(entity: {
  locationLabel?: string | null
  neighborhood?: string | null
}): string {
  const label = (entity.locationLabel ?? '').trim()
  if (label) return label
  const slug = (entity.neighborhood ?? '').trim()
  if (slug && LEGACY_SLUGS.has(slug as NeighborhoodId)) {
    return getNeighborhood(slug as NeighborhoodId)?.shortName ?? 'Local area'
  }
  return 'Local area'
}

export function distanceBetween(
  a: { lat?: number | null; lng?: number | null; neighborhood?: string },
  b: { lat?: number | null; lng?: number | null; neighborhood?: string },
): number | null {
  const ca = resolveCoords(a)
  const cb = resolveCoords(b)
  if (!ca || !cb) return null
  return haversineMiles(ca.lat, ca.lng, cb.lat, cb.lng)
}
