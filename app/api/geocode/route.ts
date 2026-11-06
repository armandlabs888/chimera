import { NextRequest, NextResponse } from 'next/server'

export type GeocodeResult = {
  label: string
  lat: number | null
  lng: number | null
}

/** Instant offline dictionary for common US cities & ZIP prefixes. */
const CITY_LOOKUP: Record<string, { label: string; lat: number; lng: number }> = {
  seattle: { label: 'Seattle, WA', lat: 47.6062, lng: -122.3321 },
  'seattle wa': { label: 'Seattle, WA', lat: 47.6062, lng: -122.3321 },
  'new york': { label: 'New York, NY', lat: 40.7128, lng: -74.006 },
  nyc: { label: 'New York, NY', lat: 40.7128, lng: -74.006 },
  brooklyn: { label: 'Brooklyn, NY', lat: 40.6782, lng: -73.9442 },
  williamsburg: { label: 'Williamsburg, Brooklyn, NY', lat: 40.7081, lng: -73.9571 },
  austin: { label: 'Austin, TX', lat: 30.2672, lng: -97.7431 },
  'austin tx': { label: 'Austin, TX', lat: 30.2672, lng: -97.7431 },
  chicago: { label: 'Chicago, IL', lat: 41.8781, lng: -87.6298 },
  'los angeles': { label: 'Los Angeles, CA', lat: 34.0522, lng: -118.2437 },
  la: { label: 'Los Angeles, CA', lat: 34.0522, lng: -118.2437 },
  'san francisco': { label: 'San Francisco, CA', lat: 37.7749, lng: -122.4194 },
  sf: { label: 'San Francisco, CA', lat: 37.7749, lng: -122.4194 },
  denver: { label: 'Denver, CO', lat: 39.7392, lng: -104.9903 },
  portland: { label: 'Portland, OR', lat: 45.5152, lng: -122.6784 },
  boston: { label: 'Boston, MA', lat: 42.3601, lng: -71.0589 },
  miami: { label: 'Miami, FL', lat: 25.7617, lng: -80.1918 },
  atlanta: { label: 'Atlanta, GA', lat: 33.749, lng: -84.388 },
  dallas: { label: 'Dallas, TX', lat: 32.7767, lng: -96.797 },
  houston: { label: 'Houston, TX', lat: 29.7604, lng: -95.3698 },
  phoenix: { label: 'Phoenix, AZ', lat: 33.4484, lng: -112.074 },
  philadelphia: { label: 'Philadelphia, PA', lat: 39.9526, lng: -75.1652 },
  minneapolis: { label: 'Minneapolis, MN', lat: 44.9778, lng: -93.265 },
  nashville: { label: 'Nashville, TN', lat: 36.1627, lng: -86.7816 },
  'washington dc': { label: 'Washington, DC', lat: 38.9072, lng: -77.0369 },
  dc: { label: 'Washington, DC', lat: 38.9072, lng: -77.0369 },
}

const ZIP_PREFIX: Record<string, { label: string; lat: number; lng: number }> = {
  '981': { label: 'Seattle, WA', lat: 47.6062, lng: -122.3321 },
  '100': { label: 'New York, NY', lat: 40.7128, lng: -74.006 },
  '112': { label: 'Brooklyn, NY', lat: 40.6782, lng: -73.9442 },
  '787': { label: 'Austin, TX', lat: 30.2672, lng: -97.7431 },
  '606': { label: 'Chicago, IL', lat: 41.8781, lng: -87.6298 },
  '900': { label: 'Los Angeles, CA', lat: 34.0522, lng: -118.2437 },
  '941': { label: 'San Francisco, CA', lat: 37.7749, lng: -122.4194 },
  '802': { label: 'Denver, CO', lat: 39.7392, lng: -104.9903 },
  '972': { label: 'Portland, OR', lat: 45.5152, lng: -122.6784 },
  '021': { label: 'Boston, MA', lat: 42.3601, lng: -71.0589 },
  '331': { label: 'Miami, FL', lat: 25.7617, lng: -80.1918 },
  '303': { label: 'Atlanta, GA', lat: 33.749, lng: -84.388 },
  '752': { label: 'Dallas, TX', lat: 32.7767, lng: -96.797 },
  '770': { label: 'Houston, TX', lat: 29.7604, lng: -95.3698 },
  '850': { label: 'Phoenix, AZ', lat: 33.4484, lng: -112.074 },
  '191': { label: 'Philadelphia, PA', lat: 39.9526, lng: -75.1652 },
}

function instantLookup(q: string): GeocodeResult[] {
  const raw = q.trim()
  if (!raw) return []
  const key = raw.toLowerCase().replace(/,/g, ' ').replace(/\s+/g, ' ').trim()
  const city = CITY_LOOKUP[key]
  if (city) return [{ label: city.label, lat: city.lat, lng: city.lng }]

  const zipMatch = raw.match(/\b(\d{5})(-\d{4})?\b/)
  if (zipMatch) {
    const zip = zipMatch[1]
    const prefix = ZIP_PREFIX[zip.slice(0, 3)]
    if (prefix) {
      return [{ label: `${prefix.label} ${zip}`, lat: prefix.lat, lng: prefix.lng }]
    }
  }
  return []
}

async function nominatimSearch(q: string): Promise<GeocodeResult[]> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 3000)
  try {
    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.set('q', q)
    url.searchParams.set('format', 'json')
    url.searchParams.set('limit', '5')
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'BeamMarketplace/1.0' },
      signal: controller.signal,
    })
    if (!res.ok) return []
    const data = (await res.json()) as Array<{
      display_name?: string
      lat?: string
      lon?: string
    }>
    return data
      .map((row) => ({
        label: (row.display_name ?? q).split(',').slice(0, 3).join(',').trim(),
        lat: row.lat ? Number(row.lat) : null,
        lng: row.lon ? Number(row.lon) : null,
      }))
      .filter((r) => r.label)
  } catch {
    return []
  } finally {
    clearTimeout(timer)
  }
}

async function nominatimReverse(lat: number, lng: number): Promise<GeocodeResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 3000)
  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse')
    url.searchParams.set('lat', String(lat))
    url.searchParams.set('lon', String(lng))
    url.searchParams.set('format', 'json')
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'BeamMarketplace/1.0' },
      signal: controller.signal,
    })
    if (!res.ok) throw new Error('reverse failed')
    const data = (await res.json()) as {
      address?: {
        city?: string
        town?: string
        village?: string
        suburb?: string
        state?: string
        postcode?: string
      }
      display_name?: string
    }
    const a = data.address ?? {}
    const city = a.city || a.town || a.village || a.suburb || ''
    const state = a.state || ''
    const label =
      [city, state].filter(Boolean).join(', ') ||
      (data.display_name ?? '').split(',').slice(0, 2).join(',').trim() ||
      `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    return { label, lat, lng }
  } catch {
    return { label: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, lat, lng }
  } finally {
    clearTimeout(timer)
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const latParam = searchParams.get('lat')
  const lngParam = searchParams.get('lng')
  const q = searchParams.get('q') ?? ''

  if (latParam != null && lngParam != null) {
    const lat = Number(latParam)
    const lng = Number(lngParam)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: 'Invalid lat/lng' }, { status: 400 })
    }
    const result = await nominatimReverse(lat, lng)
    return NextResponse.json(result)
  }

  const trimmed = q.trim()
  if (!trimmed) {
    return NextResponse.json([] satisfies GeocodeResult[])
  }

  const instant = instantLookup(trimmed)
  if (instant.length) {
    return NextResponse.json(instant)
  }

  const remote = await nominatimSearch(trimmed)
  if (remote.length) {
    return NextResponse.json(remote)
  }

  // Never block the user — fall back to label-only result.
  return NextResponse.json([{ label: trimmed, lat: null, lng: null }] satisfies GeocodeResult[])
}
