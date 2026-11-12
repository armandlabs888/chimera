import { distanceBetween, formatLocation } from '@/lib/location'
import { formatCategoryLabel } from '@/lib/taxonomy'
import { listingCoverImage, normalizeListingImages } from '@/lib/listingPhotos'
import { relativeTime } from '@/lib/matching'
import type { HelpRequest, Offer } from '@/types'

/** Default radius for “near you” when the browse origin has coordinates. */
export const POPULAR_GIGS_RADIUS_MILES = 25
export const POPULAR_GIGS_LIMIT = 10

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

function offerCountFor(
  request: HelpRequest,
  offers: Offer[],
): number {
  if (typeof request.publicOfferCount === 'number' && Number.isFinite(request.publicOfferCount)) {
    return Math.max(0, request.publicOfferCount)
  }
  return offers.filter(
    (offer) => offer.requestId === request.id && offer.status !== 'withdrawn',
  ).length
}

/** Neighborhood / area only — never a street address. */
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

function popularityScore(
  offerCount: number,
  createdAt: string,
  miles: number | null,
  radiusMiles: number,
): number {
  const ageHours = Math.max(0, (Date.now() - new Date(createdAt).getTime()) / 3_600_000)
  // Soft 14-day recency decay.
  const recency = Math.max(0, 1 - ageHours / (14 * 24))
  const engagement = Math.log1p(offerCount)
  const proximity =
    miles == null || !Number.isFinite(miles)
      ? 0.35
      : Math.max(0, 1 - miles / Math.max(radiusMiles, 1))
  return engagement * 3 + recency * 2 + proximity
}

/**
 * Open jobs near the browse origin, ranked by engagement + recency (+ proximity).
 * Never pads with samples. Returns at most `limit` real rows.
 */
export function selectPopularGigs(input: {
  requests: HelpRequest[]
  offers: Offer[]
  origin: { lat?: number | null; lng?: number | null }
  radiusMiles?: number
  limit?: number
}): PopularGigRow[] {
  const radiusMiles = input.radiusMiles ?? POPULAR_GIGS_RADIUS_MILES
  const limit = input.limit ?? POPULAR_GIGS_LIMIT
  const hasOrigin =
    typeof input.origin.lat === 'number' &&
    Number.isFinite(input.origin.lat) &&
    typeof input.origin.lng === 'number' &&
    Number.isFinite(input.origin.lng)

  const rows: PopularGigRow[] = []
  for (const request of input.requests) {
    if (request.status !== 'open') continue
    const miles = hasOrigin ? distanceBetween(input.origin, request) : null
    if (hasOrigin && miles != null && miles > radiusMiles) continue
    // Jobs without coords still appear when we have an origin (same as Browse radius filter).
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
      score: popularityScore(count, request.createdAt, miles, radiusMiles),
    })
  }

  rows.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return +new Date(b.request.createdAt) - +new Date(a.request.createdAt)
  })

  return rows.slice(0, limit)
}

export function shortCityLabel(locationLabel: string, city: string): string {
  const fromCity = (city ?? '').trim()
  if (fromCity) return fromCity
  const first = (locationLabel ?? '').split(',')[0]?.trim() || ''
  return first || 'Nearby'
}

/** True when the browse origin has a real city (not the unset Nearby fallback). */
export function hasBrowseCity(origin: {
  source: 'preference' | 'profile' | 'none'
  city: string
  locationLabel: string
}): boolean {
  if (origin.source === 'none') return false
  const label = shortCityLabel(origin.locationLabel, origin.city)
  return Boolean(label) && label !== 'Nearby'
}

/**
 * Heading / mobile CTA copy for the popular gigs section.
 * Never inserts the word "Nearby" after "near".
 */
export function popularGigsCopy(origin: {
  source: 'preference' | 'profile' | 'none'
  city: string
  locationLabel: string
}): {
  hasCity: boolean
  city: string
  headingLead: string
  locationChipLabel: string
  mobileSeeAll: string
  subtext: string
} {
  const hasCity = hasBrowseCity(origin)
  const city = shortCityLabel(origin.locationLabel, origin.city)
  if (hasCity) {
    return {
      hasCity: true,
      city,
      headingLead: 'Popular gigs near',
      locationChipLabel: city,
      mobileSeeAll: `See all jobs near ${city}`,
      subtext: `Everyday jobs neighbors post around ${city}.`,
    }
  }
  return {
    hasCity: false,
    city: 'Nearby',
    headingLead: 'Popular gigs near you',
    locationChipLabel: 'Choose a city',
    mobileSeeAll: 'See all jobs near you',
    subtext: 'Everyday jobs neighbors post nearby.',
  }
}
