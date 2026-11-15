import type { HelpRequest, HelperVerification, Person } from '@/types'
import {
  readBrowseLocationPin,
  type BrowseLocationPin,
} from '@/lib/browseLocationPreference'
import { normalizeZipInput } from '@/lib/zip/format'

export type BrowseHomeSource =
  | 'verification'
  | 'verification_zip'
  | 'profile_zip'
  | 'recent_job'
  | 'local'
  | 'none'

export type BrowseHome = {
  lat: number | null
  lng: number | null
  zip: string | null
  label: string
  source: BrowseHomeSource
  /** True when we have a usable lat/lng origin for distance filtering. */
  hasOrigin: boolean
}

type ZipPlaceResponse = {
  zip: string
  lat: number
  lng: number
  city: string
  stateCode: string
  label: string
}

async function lookupZipPlace(zip: string): Promise<ZipPlaceResponse | null> {
  const normalized = normalizeZipInput(zip)
  if (!normalized) return null
  try {
    const res = await fetch(`/api/zip?zip=${encodeURIComponent(normalized)}`)
    if (!res.ok) return null
    return (await res.json()) as ZipPlaceResponse
  } catch {
    return null
  }
}

function zipFromPerson(person: Person | null | undefined): string | null {
  if (!person) return null
  // Person has no dedicated zip field; some clients may stash it on locationLabel.
  const fromLabel = (person.locationLabel || '').match(/\b(\d{5})\b/)
  return fromLabel ? fromLabel[1] : null
}

/** Sync home sources only (verification coords or local pin). */
export function resolveBrowseHomeSync(input: {
  helperVerification: HelperVerification | null
  pin?: BrowseLocationPin | null
}): BrowseHome | null {
  const pin = input.pin === undefined ? readBrowseLocationPin() : input.pin
  const verification = input.helperVerification

  if (
    verification?.status === 'approved' &&
    typeof verification.addressLat === 'number' &&
    typeof verification.addressLng === 'number' &&
    Number.isFinite(verification.addressLat) &&
    Number.isFinite(verification.addressLng)
  ) {
    return {
      lat: verification.addressLat,
      lng: verification.addressLng,
      zip: normalizeZipInput(verification.zip) || null,
      label: [verification.city, verification.stateCode].filter(Boolean).join(', ') || 'your area',
      source: 'verification',
      hasOrigin: true,
    }
  }

  if (
    pin &&
    typeof pin.lat === 'number' &&
    typeof pin.lng === 'number' &&
    Number.isFinite(pin.lat) &&
    Number.isFinite(pin.lng)
  ) {
    // Prefer verification/profile/job when async resolution finds them; pin is last resort.
    return {
      lat: pin.lat,
      lng: pin.lng,
      zip: normalizeZipInput(pin.zip || '') || null,
      label: pin.label || 'your area',
      source: 'local',
      hasOrigin: true,
    }
  }

  return null
}

/**
 * Resolve the viewer's home for browse distance.
 * Order: approved helper verification lat/lng → verification/profile ZIP →
 * most recent posted job ZIP center → localStorage pin → none.
 * Never writes to the database.
 */
export async function resolveBrowseHome(input: {
  person: Person
  helperVerification: HelperVerification | null
  requests: HelpRequest[]
  pin?: BrowseLocationPin | null
}): Promise<BrowseHome> {
  const pin = input.pin === undefined ? readBrowseLocationPin() : input.pin
  const verification = input.helperVerification

  const sync = resolveBrowseHomeSync({ helperVerification: verification, pin: null })
  if (sync?.source === 'verification') return sync

  const verificationZip = verification ? normalizeZipInput(verification.zip) : null
  if (verificationZip) {
    const place = await lookupZipPlace(verificationZip)
    if (place) {
      return {
        lat: place.lat,
        lng: place.lng,
        zip: place.zip,
        label: place.label,
        source: 'verification_zip',
        hasOrigin: true,
      }
    }
  }

  const profileZip = zipFromPerson(input.person)
  if (profileZip) {
    const place = await lookupZipPlace(profileZip)
    if (place) {
      return {
        lat: place.lat,
        lng: place.lng,
        zip: place.zip,
        label: place.label,
        source: 'profile_zip',
        hasOrigin: true,
      }
    }
  }

  const mine = input.requests
    .filter((r) => r.requesterId === input.person.id)
    .slice()
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))

  for (const job of mine) {
    if (
      typeof job.lat === 'number' &&
      typeof job.lng === 'number' &&
      Number.isFinite(job.lat) &&
      Number.isFinite(job.lng)
    ) {
      return {
        lat: job.lat,
        lng: job.lng,
        zip: normalizeZipInput(job.zip || '') || null,
        label: job.locationLabel || job.city || 'your area',
        source: 'recent_job',
        hasOrigin: true,
      }
    }
    const jobZip = normalizeZipInput(job.zip || '')
    if (jobZip) {
      const place = await lookupZipPlace(jobZip)
      if (place) {
        return {
          lat: place.lat,
          lng: place.lng,
          zip: place.zip,
          label: place.label,
          source: 'recent_job',
          hasOrigin: true,
        }
      }
    }
  }

  if (
    pin &&
    typeof pin.lat === 'number' &&
    typeof pin.lng === 'number' &&
    Number.isFinite(pin.lat) &&
    Number.isFinite(pin.lng)
  ) {
    return {
      lat: pin.lat,
      lng: pin.lng,
      zip: normalizeZipInput(pin.zip || '') || null,
      label: pin.label || 'your area',
      source: 'local',
      hasOrigin: true,
    }
  }

  return {
    lat: null,
    lng: null,
    zip: null,
    label: 'your area',
    source: 'none',
    hasOrigin: false,
  }
}
