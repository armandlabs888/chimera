/**
 * Static neighborhood and city centroids for map fallback and new posts.
 * Used when a job has no lat/lng. Matching is case-insensitive on
 * neighborhood, the first part of location_label, then city.
 */

export type AreaCentroid = { lat: number; lng: number }

/** Canonical name -> centroid. Keys are stored lowercase. */
const AREA_CENTROIDS: Record<string, AreaCentroid> = {
  // San Jose neighborhoods (live production labels)
  almaden: { lat: 37.2216, lng: -121.862 },
  'alum rock': { lat: 37.3674, lng: -121.826 },
  berryessa: { lat: 37.3861, lng: -121.86 },
  'blossom valley': { lat: 37.2505, lng: -121.837 },
  cambrian: { lat: 37.2552, lng: -121.9284 },
  'downtown san jose': { lat: 37.3352, lng: -121.8901 },
  evergreen: { lat: 37.3047, lng: -121.783 },
  japantown: { lat: 37.3489, lng: -121.8956 },
  'north san jose': { lat: 37.3897, lng: -121.928 },
  'rose garden': { lat: 37.3316, lng: -121.9285 },
  'santana row': { lat: 37.3217, lng: -121.9477 },
  'willow glen': { lat: 37.3035, lng: -121.8975 },

  // South Bay cities
  campbell: { lat: 37.2872, lng: -121.95 },
  cupertino: { lat: 37.323, lng: -122.0322 },
  'los gatos': { lat: 37.2266, lng: -121.9747 },
  milpitas: { lat: 37.4283, lng: -121.9066 },
  'mountain view': { lat: 37.3861, lng: -122.0839 },
  'santa clara': { lat: 37.3541, lng: -121.9552 },
  saratoga: { lat: 37.2639, lng: -122.023 },
  sunnyvale: { lat: 37.3688, lng: -122.0363 },
  'san jose': { lat: 37.3382, lng: -121.8863 },

  // Other common Bay Area cities
  'palo alto': { lat: 37.4419, lng: -122.143 },
  menlo: { lat: 37.4538, lng: -122.1822 },
  'menlo park': { lat: 37.4538, lng: -122.1822 },
  'redwood city': { lat: 37.4852, lng: -122.2364 },
  fremont: { lat: 37.5483, lng: -121.9886 },
  newark: { lat: 37.5297, lng: -122.0402 },
  union: { lat: 37.5934, lng: -122.0439 },
  'union city': { lat: 37.5934, lng: -122.0439 },
  hayward: { lat: 37.6688, lng: -122.0808 },
  gilroy: { lat: 37.0058, lng: -121.5683 },
  morgan: { lat: 37.1305, lng: -121.6544 },
  'morgan hill': { lat: 37.1305, lng: -121.6544 },

  // Austin demo neighborhoods (names + short names + slugs)
  'east austin': { lat: 30.2672, lng: -97.7205 },
  'east-austin': { lat: 30.2672, lng: -97.7205 },
  'hyde park': { lat: 30.3085, lng: -97.7268 },
  'hyde-park': { lat: 30.3085, lng: -97.7268 },
  mueller: { lat: 30.298, lng: -97.7045 },
  zilker: { lat: 30.2642, lng: -97.7728 },
  'south congress': { lat: 30.2489, lng: -97.749 },
  'south-congress': { lat: 30.2489, lng: -97.749 },
  soco: { lat: 30.2489, lng: -97.749 },
  'travis heights': { lat: 30.2435, lng: -97.7455 },
  'travis-heights': { lat: 30.2435, lng: -97.7455 },
  'travis hts': { lat: 30.2435, lng: -97.7455 },
  clarksville: { lat: 30.2815, lng: -97.762 },
  'the domain': { lat: 30.402, lng: -97.726 },
  'the-domain': { lat: 30.402, lng: -97.726 },
  domain: { lat: 30.402, lng: -97.726 },
  austin: { lat: 30.2672, lng: -97.7431 },
}

function normalizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/,+\s*$/g, '')
}

function lookupKey(raw: string): AreaCentroid | null {
  const key = normalizeKey(raw)
  if (!key) return null
  if (AREA_CENTROIDS[key]) return AREA_CENTROIDS[key]

  // Drop trailing state tokens: "San Jose, CA" / "San Jose, California"
  const noState = key
    .replace(/,?\s*\b(ca|california|tx|texas)\b\.?$/i, '')
    .trim()
    .replace(/,+\s*$/g, '')
  if (noState && AREA_CENTROIDS[noState]) return AREA_CENTROIDS[noState]

  return null
}

/** Split a location label into ordered candidate tokens. */
function labelCandidates(locationLabel: string): string[] {
  const parts = locationLabel
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
  const out: string[] = []
  if (parts[0]) out.push(parts[0])
  // Prefer multi-word city phrases before single leftover tokens.
  if (parts.length >= 2) {
    out.push(parts.slice(0, 2).join(', '))
    out.push(parts[1])
  }
  if (parts.length >= 3) out.push(parts[2])
  out.push(locationLabel.trim())
  return out
}

/**
 * Resolve a map/post coordinate from explicit lat/lng, else a static centroid.
 * Matching order: lat/lng, neighborhood, first part of location_label, city.
 */
export function resolveAreaCentroid(input: {
  lat?: number | null
  lng?: number | null
  locationLabel?: string | null
  neighborhood?: string | null
  city?: string | null
}): AreaCentroid | null {
  if (
    typeof input.lat === 'number' &&
    typeof input.lng === 'number' &&
    Number.isFinite(input.lat) &&
    Number.isFinite(input.lng) &&
    Math.abs(input.lat) <= 90 &&
    Math.abs(input.lng) <= 180
  ) {
    return { lat: input.lat, lng: input.lng }
  }

  const neighborhood = (input.neighborhood ?? '').trim()
  if (neighborhood) {
    const hit = lookupKey(neighborhood)
    if (hit) return hit
  }

  const label = (input.locationLabel ?? '').trim()
  if (label) {
    for (const candidate of labelCandidates(label)) {
      const hit = lookupKey(candidate)
      if (hit) return hit
    }
  }

  const city = (input.city ?? '').trim()
  if (city) {
    const hit = lookupKey(city)
    if (hit) return hit
  }

  return null
}

/** Test helper: list of known area keys. */
export function listAreaCentroidKeys(): string[] {
  return Object.keys(AREA_CENTROIDS).sort()
}
