import type { Person } from '@/types'

export const BROWSE_LOCATION_STORAGE_KEY = 'beam-browse-location-v1'
export const BROWSE_LOCATION_CHANGED_EVENT = 'beam:browse-location-changed'
export const BROWSE_LOCATION_OPEN_EVENT = 'beam:browse-location-open'

/** Browse-only pin — never written to profile / home city. */
export type BrowseLocationPin = {
  city: string
  stateCode: string
  lat: number
  lng: number
  label: string
}

export type BrowseOrigin = {
  city: string
  stateCode: string
  locationLabel: string
  lat: number | null
  lng: number | null
  source: 'preference' | 'profile' | 'none'
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function isValidPin(value: unknown): value is BrowseLocationPin {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.city === 'string' &&
    v.city.trim().length > 0 &&
    typeof v.stateCode === 'string' &&
    v.stateCode.trim().length === 2 &&
    typeof v.label === 'string' &&
    v.label.trim().length > 0 &&
    typeof v.lat === 'number' &&
    Number.isFinite(v.lat) &&
    typeof v.lng === 'number' &&
    Number.isFinite(v.lng)
  )
}

export function readBrowseLocationPin(): BrowseLocationPin | null {
  if (!canUseStorage()) return null
  try {
    const raw = localStorage.getItem(BROWSE_LOCATION_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    return isValidPin(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function writeBrowseLocationPin(pin: BrowseLocationPin | null): void {
  if (!canUseStorage()) return
  if (pin) localStorage.setItem(BROWSE_LOCATION_STORAGE_KEY, JSON.stringify(pin))
  else localStorage.removeItem(BROWSE_LOCATION_STORAGE_KEY)
  window.dispatchEvent(new CustomEvent(BROWSE_LOCATION_CHANGED_EVENT))
}

export function subscribeBrowseLocationPin(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const handler = () => onChange()
  window.addEventListener(BROWSE_LOCATION_CHANGED_EVENT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(BROWSE_LOCATION_CHANGED_EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}

export function requestBrowseLocationPicker(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(BROWSE_LOCATION_OPEN_EVENT))
}

export function subscribeBrowseLocationPickerOpen(onOpen: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const handler = () => onOpen()
  window.addEventListener(BROWSE_LOCATION_OPEN_EVENT, handler)
  return () => window.removeEventListener(BROWSE_LOCATION_OPEN_EVENT, handler)
}

export function pinFromUsCity(city: {
  name: string
  stateCode: string
  lat: number
  lng: number
  label: string
}): BrowseLocationPin {
  return {
    city: city.name,
    stateCode: city.stateCode,
    lat: city.lat,
    lng: city.lng,
    label: city.label,
  }
}

export function resolveBrowseOrigin(
  pin: BrowseLocationPin | null,
  person: Pick<Person, 'city' | 'stateCode' | 'locationLabel' | 'lat' | 'lng'>,
): BrowseOrigin {
  if (pin) {
    return {
      city: pin.city,
      stateCode: pin.stateCode,
      locationLabel: pin.label,
      lat: pin.lat,
      lng: pin.lng,
      source: 'preference',
    }
  }

  const city = (person.city ?? '').trim()
  const stateCode = (person.stateCode ?? '').trim()
  const locationLabel = (person.locationLabel ?? '').trim()
  const label =
    locationLabel ||
    (city && stateCode ? `${city}, ${stateCode}` : city || '')

  if (label || (person.lat != null && person.lng != null)) {
    return {
      city: city || (label ? label.split(',')[0]?.trim() || '' : ''),
      stateCode,
      locationLabel: label || 'Nearby',
      lat: typeof person.lat === 'number' ? person.lat : null,
      lng: typeof person.lng === 'number' ? person.lng : null,
      source: 'profile',
    }
  }

  return {
    city: '',
    stateCode: '',
    locationLabel: 'Nearby',
    lat: null,
    lng: null,
    source: 'none',
  }
}
