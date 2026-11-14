/**
 * Privacy helpers for job area maps.
 * Exact address stays hidden until an offer is accepted; the map only
 * shows a neighborhood-level pin derived from lat/lng.
 */

export type FuzzedJobPoint = {
  lat: number
  lng: number
  /** Soft circle radius in meters for the approximate area. */
  radiusMeters: number
}

function hashJobId(jobId: string): number {
  let h = 2166136261
  for (let i = 0; i < jobId.length; i += 1) {
    h ^= jobId.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Snap coordinates to a stable neighborhood-level point per job id.
 * Applies a small deterministic offset, then rounds to ~2 decimal places
 * (~1.1 km) so the UI never exposes the raw pin.
 */
export function fuzzJobCoordinates(
  jobId: string,
  lat: number,
  lng: number,
  radiusMiles?: number | null,
): FuzzedJobPoint | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null

  const hash = hashJobId(jobId)
  // Offset within roughly +/- 0.01 deg before rounding (~1 km class).
  const offsetLat = ((hash % 1000) / 1000 - 0.5) * 0.02
  const offsetLng = ((((hash / 1000) | 0) % 1000) / 1000 - 0.5) * 0.02

  const fuzzedLat = Math.round((lat + offsetLat) * 100) / 100
  const fuzzedLng = Math.round((lng + offsetLng) * 100) / 100

  const miles =
    typeof radiusMiles === 'number' && Number.isFinite(radiusMiles) && radiusMiles > 0
      ? Math.min(Math.max(radiusMiles, 0.4), 1.5)
      : 0.75

  return {
    lat: fuzzedLat,
    lng: fuzzedLng,
    radiusMeters: miles * 1609.34,
  }
}

/** Web Mercator helpers for a small static tile mosaic. */
export function latLngToWorldPixel(lat: number, lng: number, zoom: number) {
  const scale = 256 * 2 ** zoom
  const x = ((lng + 180) / 360) * scale
  const sinLat = Math.sin((lat * Math.PI) / 180)
  const y =
    (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale
  return { x, y, scale }
}

export function metersToPixels(meters: number, lat: number, zoom: number): number {
  const metersPerPixel =
    (Math.cos((lat * Math.PI) / 180) * 2 * Math.PI * 6378137) / (256 * 2 ** zoom)
  return meters / metersPerPixel
}
