/**
 * U.S. Census Bureau address geocoder (rooftop / range-interpolated).
 * Used by server-side verification only. Do not use /api/geocode (city/ZIP labels).
 */

export type CensusGeocodeResult = {
  lat: number
  lng: number
  quality: 'rooftop' | 'range_interpolated'
  matchedAddress: string | null
}

export async function censusGeocodeUsAddress(input: {
  street: string
  city: string
  stateCode: string
  zip: string
  signal?: AbortSignal
}): Promise<CensusGeocodeResult | null> {
  const params = new URLSearchParams({
    street: input.street.trim(),
    city: input.city.trim(),
    state: input.stateCode.trim().toUpperCase(),
    zip: input.zip.trim(),
    benchmark: 'Public_AR_Current',
    format: 'json',
  })
  const url = `https://geocoding.geo.census.gov/geocoder/locations/address?${params}`
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: input.signal,
    cache: 'no-store',
  })
  if (!res.ok) return null
  const json = (await res.json()) as {
    result?: {
      addressMatches?: Array<{
        matchedAddress?: string
        coordinates?: { x?: number; y?: number }
        addressComponents?: { fromAddress?: string; toAddress?: string }
      }>
    }
  }
  const match = json.result?.addressMatches?.[0]
  const lat = match?.coordinates?.y
  const lng = match?.coordinates?.x
  if (typeof lat !== 'number' || typeof lng !== 'number') return null
  if (lat < 15 || lat > 72 || lng < -180 || lng > -60) return null
  const from = match?.addressComponents?.fromAddress
  const to = match?.addressComponents?.toAddress
  const quality =
    from != null && to != null && from === to ? 'rooftop' : 'range_interpolated'
  return {
    lat,
    lng,
    quality,
    matchedAddress: match?.matchedAddress ?? null,
  }
}
