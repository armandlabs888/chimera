import { distanceMiles as neighborhoodDistance } from '../data/neighborhoods'
import { distanceBetween, formatLocation } from '@/lib/location'
import { getCategory } from '@/data/categories'
import type {
  AvailabilitySlot,
  HelpRequest,
  MatchScore,
  NeighborhoodId,
  Person,
  WhenOption,
} from '../types'

function slotsForWhen(when: WhenOption): AvailabilitySlot[] {
  switch (when) {
    case 'asap':
      return ['mornings', 'afternoons', 'evenings']
    case 'today':
      return ['afternoons', 'evenings']
    case 'tomorrow':
      return ['mornings', 'afternoons', 'evenings']
    case 'this-week':
    case 'scheduled':
      return ['weekends', 'afternoons', 'evenings', 'mornings']
  }
}

function resolveDistance(request: HelpRequest, person: Person): number {
  const geo = distanceBetween(request, person)
  if (geo != null) return Math.round(geo * 10) / 10
  if (request.neighborhood && person.neighborhood) {
    return neighborhoodDistance(
      request.neighborhood as NeighborhoodId,
      person.neighborhood as NeighborhoodId,
    )
  }
  return 5
}

/** Rank helpers for a request: skill fit + Haversine + available-now boost + rating. */
export function rankHelpersForRequest(
  request: HelpRequest,
  people: Person[],
  excludeIds: string[] = [],
): MatchScore[] {
  const needed = slotsForWhen(request.when)
  const reqRadius = request.radiusMiles ?? 5
  const categoryLabel = getCategory(request.category).shortLabel

  return people
    .filter((p) => {
      if (p.id === request.requesterId || excludeIds.includes(p.id)) return false
      if (!(p.isHelper || p.skills.length > 0)) return false
      return true
    })
    .map((person) => {
      const miles = resolveDistance(request, person)
      const helperRadius = person.serviceRadiusMiles ?? 5
      const withinRadius = miles <= Math.max(reqRadius, helperRadius)
      const skillMatch = person.skills.includes(request.category)
      const slotFit = person.availability.some((s) => needed.includes(s))
      const liveNow = Boolean(person.availableNow)

      let score = 0
      if (skillMatch) score += 50
      else score += 5
      score += Math.max(0, 35 - miles * 3.5)
      if (liveNow) score += 28
      else if (slotFit) score += 16
      else score += 4
      score += (person.rating - 4) * 8
      if (!withinRadius) score -= 25

      const reasons: string[] = []
      if (skillMatch) reasons.push(`Matches ${categoryLabel}`)
      if (miles <= 0.3) reasons.push('Same area')
      else reasons.push(`${miles.toFixed(1)} mi away`)
      if (liveNow) reasons.push('Available now')
      else if (slotFit) reasons.push('Available for timing')
      if (person.rating >= 4.5) {
        reasons.push(`${person.rating.toFixed(1)}★ (${person.reviewCount})`)
      }

      return {
        person,
        score,
        distanceMiles: miles,
        skillMatch,
        availableNow: liveNow || slotFit,
        reasons,
      }
    })
    .filter((m) => {
      const helperRadius = m.person.serviceRadiusMiles ?? 5
      return m.distanceMiles <= Math.max(reqRadius, helperRadius) + 0.5 || m.skillMatch
    })
    .sort((a, b) => b.score - a.score)
}

/** @deprecated Prefer rankHelpersForRequest */
export function rankMatches(
  request: HelpRequest,
  people: Person[],
  excludeIds: string[] = [],
): MatchScore[] {
  return rankHelpersForRequest(request, people, excludeIds)
}

export function formatMoney(n: number): string {
  return `$${Math.round(n)}`
}

export function formatBudget(request: Pick<HelpRequest, 'budget' | 'budgetType'>): string {
  if (request.budgetType === 'open' || request.budget === 0) return 'Open to offers'
  return formatMoney(request.budget)
}

export function formatRate(person: Pick<Person, 'hourlyRate' | 'rateType'>): string {
  if (person.rateType === 'quote') return 'Contact for quote'
  return `$${Math.round(person.hourlyRate)}/hr`
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export { formatLocation }
