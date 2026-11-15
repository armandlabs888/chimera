import 'server-only'

import { haversineMiles } from '@/lib/location'
import usZips from '@/data/us-zips.v1.json'
import {
  normalizeZipInput,
  type ZipPlace,
} from '@/lib/zip/format'

export type { ZipPlace } from '@/lib/zip/format'
export {
  formatZipLocationLabel,
  formatZipPlaceLabel,
  isValidZipFormat,
  normalizeZipInput,
} from '@/lib/zip/format'

/** Compact gazetteer rows: [zip, lat, lng, city, state]. */
type ZipRow = [string, number, number, string, string]

const ROWS = usZips as ZipRow[]

let byZip: Map<string, ZipPlace> | null = null

function index(): Map<string, ZipPlace> {
  if (byZip) return byZip
  const map = new Map<string, ZipPlace>()
  for (const row of ROWS) {
    const zip = String(row[0]).padStart(5, '0')
    map.set(zip, {
      zip,
      lat: Number(row[1]),
      lng: Number(row[2]),
      city: String(row[3] ?? ''),
      stateCode: String(row[4] ?? '').toUpperCase(),
    })
  }
  byZip = map
  return map
}

export function lookupZip(raw: string): ZipPlace | null {
  const zip = normalizeZipInput(raw)
  if (!zip) return null
  return index().get(zip) ?? null
}

/**
 * Nearest ZCTA centroid to a lat/lng (for "Use my current location").
 * Scans the full gazetteer; ~33k rows is fine for a one-shot lookup.
 */
export function nearestZip(lat: number, lng: number): ZipPlace | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  let best: ZipPlace | null = null
  let bestMiles = Number.POSITIVE_INFINITY
  for (const place of index().values()) {
    const miles = haversineMiles(lat, lng, place.lat, place.lng)
    if (miles < bestMiles) {
      bestMiles = miles
      best = place
    }
  }
  return best
}

/**
 * When a new helper verification somehow lacks a usable ZIP but has coordinates,
 * derive the nearest ZCTA. Do not call this to backfill existing rows.
 */
export function deriveZipForNewVerification(input: {
  zip?: string | null
  lat?: number | null
  lng?: number | null
}): ZipPlace | null {
  const fromZip = lookupZip(String(input.zip ?? ''))
  if (fromZip) return fromZip
  if (
    typeof input.lat === 'number' &&
    typeof input.lng === 'number' &&
    Number.isFinite(input.lat) &&
    Number.isFinite(input.lng)
  ) {
    return nearestZip(input.lat, input.lng)
  }
  return null
}
