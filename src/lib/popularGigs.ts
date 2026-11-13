import { distanceBetween, formatLocation } from '@/lib/location'
import { formatCategoryLabel } from '@/lib/taxonomy'
import { listingCoverImage, normalizeListingImages } from '@/lib/listingPhotos'
import { relativeTime } from '@/lib/matching'
import { US_STATE_NAMES } from '@/lib/usPlaces'
import type { HelpRequest, Offer } from '@/types'

export type PopularGigRow = {
  request: HelpRequest
  coverSrc: string
  categoryLabel: string
  neighborhood: string
  budgetLabel: string
  timingLabel: string
  asap: boolean
  offerCount: number
  miles: number | null
  score: number
}

function offerCountFor(request: HelpRequest, offers: Offer[]): number {
  if (typeof request.publicOfferCount === 'number' && Number.isFinite(request.publicOfferCount)) {
    return Math.max(0, request.publicOfferCount)
  }
  return offers.filter(
    (offer) => offer.requestId === request.id && offer.status !== 'withdrawn',
  ).length
}

/** Neighborhood / area only, never a street address. */
export function gigNeighborhood(request: HelpRequest): string {
  const label = formatLocation(request)
  const first = label.split(',')[0]?.trim() || ''
  if (!first || first === 'Local area' || first === 'Nearby') return 'Nearby'
  if (/\d/.test(first)) return 'Nearby'
  return first
}

/**
 * Budget for the gig card. Requests only model fixed | open today;
 * if live data ever stores hourly, show `$N/hr`.
 */
export function formatGigBudget(request: Pick<HelpRequest, 'budget' | 'budgetType'>): string {
  const type = String(request.budgetType ?? '')
  if (type === 'open' || request.budget === 0) return 'Open'
  if (type === 'hourly') return `$${Math.round(request.budget)}/hr`
  return `$${Math.round(request.budget)}`
}

export function gigTimingLabel(request: HelpRequest): { label: string; asap: boolean } {
  if (request.when === 'asap') return { label: 'ASAP', asap: true }
  const whenLabel = (request.whenLabel ?? '').trim()
  if (whenLabel) return { label: whenLabel, asap: false }
  return { label: relativeTime(request.createdAt), asap: false }
}

function popularityScore(offerCount: number, createdAt: string, miles: number | null): number {
  const ageHours = Math.max(0, (Date.now() - new Date(createdAt).getTime()) / 3_600_000)
  // Soft 14-day recency decay.
  const recency = Math.max(0, 1 - ageHours / (14 * 24))
  const engagement = Math.log1p(offerCount)
  const proximity =
    miles == null || !Number.isFinite(miles) ? 0.35 : Math.max(0, 1 - miles / 25)
  return engagement * 3 + recency * 2 + proximity
}

function normCity(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function normState(value: string): string {
  return value.trim().toUpperCase()
}

const STATE_NAME_TO_CODE = Object.fromEntries(
  Object.entries(US_STATE_NAMES).map(([code, name]) => [name.toLowerCase(), code]),
) as Record<string, string>

/**
 * Resolve a request's city + state for Popular gigs filtering.
 * Prefer structured city/stateCode when present; otherwise parse locationLabel.
 * Jobs without a usable city AND state are excluded (no radius fallback).
 */
export function resolveRequestCityState(request: {
  city?: string | null
  stateCode?: string | null
  locationLabel?: string | null
}): { city: string; stateCode: string } | null {
  const structuredCity = (request.city ?? '').trim()
  const structuredState = normState(request.stateCode ?? '')
  if (structuredCity && /^[A-Z]{2}$/.test(structuredState)) {
    return { city: structuredCity, stateCode: structuredState }
  }

  const label = (request.locationLabel ?? '').trim()
  if (!label) return null

  const parts = label
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length === 0) return null

  let stateCode = ''
  let cityParts = parts
  const last = parts[parts.length - 1] ?? ''
  if (/^[A-Za-z]{2}$/.test(last) && US_STATE_NAMES[last.toUpperCase()]) {
    stateCode = last.toUpperCase()
    cityParts = parts.slice(0, -1)
  } else {
    const asName = STATE_NAME_TO_CODE[last.toLowerCase()]
    if (asName) {
      stateCode = asName
      cityParts = parts.slice(0, -1)
    }
  }

  if (!stateCode || cityParts.length === 0) return null
  // "City, ST" or "Neighborhood, City, ST" → city is the last non-state segment.
  const city = cityParts[cityParts.length - 1]?.trim() || ''
  if (!city) return null
  return { city, stateCode }
}

export function requestMatchesCityState(
  request: {
    city?: string | null
    stateCode?: string | null
    locationLabel?: string | null
  },
  city: string,
  stateCode: string,
): boolean {
  const wantCity = normCity(city)
  const wantState = normState(stateCode)
  if (!wantCity || !/^[A-Z]{2}$/.test(wantState)) return false
  const resolved = resolveRequestCityState(request)
  if (!resolved) return false
  return normCity(resolved.city) === wantCity && normState(resolved.stateCode) === wantState
}

/**
 * Open jobs in the selected city + state, ranked by engagement + recency.
 * Never pads with samples. No radius filter and no display cap.
 */
export function selectPopularGigs(input: {
  requests: HelpRequest[]
  offers: Offer[]
  origin: {
    city?: string | null
    stateCode?: string | null
    lat?: number | null
    lng?: number | null
  }
}): PopularGigRow[] {
  const city = (input.origin.city ?? '').trim()
  const stateCode = normState(input.origin.stateCode ?? '')
  if (!city || city === 'Nearby' || !/^[A-Z]{2}$/.test(stateCode)) {
    return []
  }

  const hasOrigin =
    typeof input.origin.lat === 'number' &&
    Number.isFinite(input.origin.lat) &&
    typeof input.origin.lng === 'number' &&
    Number.isFinite(input.origin.lng)

  const rows: PopularGigRow[] = []
  for (const request of input.requests) {
    if (request.status !== 'open') continue
    if (!requestMatchesCityState(request, city, stateCode)) continue
    const miles = hasOrigin ? distanceBetween(input.origin, request) : null
    const count = offerCountFor(request, input.offers)
    const timing = gigTimingLabel(request)
    const photos = normalizeListingImages(request.images, request.image)
    rows.push({
      request,
      coverSrc: listingCoverImage(photos),
      categoryLabel: formatCategoryLabel(request.category, request.categoryCustom),
      neighborhood: gigNeighborhood(request),
      budgetLabel: formatGigBudget(request),
      timingLabel: timing.label,
      asap: timing.asap,
      offerCount: count,
      miles,
      score: popularityScore(count, request.createdAt, miles),
    })
  }

  rows.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return +new Date(b.request.createdAt) - +new Date(a.request.createdAt)
  })

  return rows
}

export function shortCityLabel(locationLabel: string, city: string): string {
  const fromCity = (city ?? '').trim()
  if (fromCity) return fromCity
  const first = (locationLabel ?? '').split(',')[0]?.trim() || ''
  return first || 'Nearby'
}

/** True when the browse origin has a real city and state (not the unset Nearby fallback). */
export function hasBrowseCity(origin: {
  source: 'preference' | 'profile' | 'none'
  city: string
  stateCode?: string
  locationLabel: string
}): boolean {
  if (origin.source === 'none') return false
  const label = shortCityLabel(origin.locationLabel, origin.city)
  const state = normState(origin.stateCode ?? '')
  return Boolean(label) && label !== 'Nearby' && /^[A-Z]{2}$/.test(state)
}

/**
 * Heading / mobile CTA copy for the popular gigs section.
 * Never inserts the word "Nearby" after "near".
 */
export function popularGigsCopy(origin: {
  source: 'preference' | 'profile' | 'none'
  city: string
  stateCode?: string
  locationLabel: string
}): {
  hasCity: boolean
  city: string
  stateCode: string
  stateName: string
  heading: string
  mobileSeeAll: string
  subtext: string
  emptyTitle: string
  emptyBody: string
} {
  const hasCity = hasBrowseCity(origin)
  const city = shortCityLabel(origin.locationLabel, origin.city)
  const stateCode = normState(origin.stateCode ?? '')
  if (hasCity) {
    const stateName = US_STATE_NAMES[stateCode] ?? stateCode
    return {
      hasCity: true,
      city,
      stateCode,
      stateName,
      heading: `Popular gigs in ${city}, ${stateCode}`,
      mobileSeeAll: `See all jobs in ${city}`,
      subtext: `All open jobs neighbors have posted in ${city}, ${stateName}.`,
      emptyTitle: `No open gigs in ${city} yet`,
      emptyBody: 'Be the first to post a task.',
    }
  }
  return {
    hasCity: false,
    city: 'Nearby',
    stateCode: '',
    stateName: '',
    heading: 'Popular gigs near you',
    mobileSeeAll: 'See all jobs near you',
    subtext: 'Open jobs will show up here once your city is set.',
    emptyTitle: 'No open gigs here yet',
    emptyBody: 'Be the first to post a task.',
  }
}
