import { NextRequest, NextResponse } from 'next/server'
import {
  formatZipPlaceLabel,
  lookupZip,
  nearestZip,
  normalizeZipInput,
} from '@/lib/zip/lookup'

export const runtime = 'nodejs'

export type ZipLookupResponse = {
  zip: string
  lat: number
  lng: number
  city: string
  stateCode: string
  label: string
}

/**
 * ZIP centroid lookup (Census ZCTA + city/state names).
 * GET ?zip=95124  or  GET ?lat=37.25&lng=-121.92 (nearest ZCTA)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const zipParam = searchParams.get('zip')
  const latParam = searchParams.get('lat')
  const lngParam = searchParams.get('lng')

  if (latParam != null && lngParam != null) {
    const lat = Number(latParam)
    const lng = Number(lngParam)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: 'Invalid lat/lng' }, { status: 400 })
    }
    const place = nearestZip(lat, lng)
    if (!place) {
      return NextResponse.json({ error: 'No ZIP near that location' }, { status: 404 })
    }
    const body: ZipLookupResponse = {
      zip: place.zip,
      lat: place.lat,
      lng: place.lng,
      city: place.city,
      stateCode: place.stateCode,
      label: formatZipPlaceLabel(place),
    }
    return NextResponse.json(body)
  }

  const zip = normalizeZipInput(zipParam ?? '')
  if (!zip) {
    return NextResponse.json(
      { error: 'Enter a 5-digit US ZIP code' },
      { status: 400 },
    )
  }

  const place = lookupZip(zip)
  if (!place) {
    return NextResponse.json(
      { error: 'We could not find that ZIP code' },
      { status: 404 },
    )
  }

  const body: ZipLookupResponse = {
    zip: place.zip,
    lat: place.lat,
    lng: place.lng,
    city: place.city,
    stateCode: place.stateCode,
    label: formatZipPlaceLabel(place),
  }
  return NextResponse.json(body)
}
