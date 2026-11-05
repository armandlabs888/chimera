import { distanceMiles } from '../data/neighborhoods'
import type { AvailabilitySlot, HelpRequest, MatchScore, Person, WhenOption } from '../types'

function slotsForWhen(when: WhenOption): AvailabilitySlot[] {
  switch (when) {
    case 'asap':
      return ['mornings', 'afternoons', 'evenings']
    case 'today':
      return ['afternoons', 'evenings']
    case 'tomorrow':
      return ['mornings', 'afternoons', 'evenings']
    case 'this-week':
      return ['weekends', 'afternoons', 'evenings', 'mornings']
  }
}

export function rankMatches(
  request: HelpRequest,
  people: Person[],
  excludeIds: string[] = [],
): MatchScore[] {
  const needed = slotsForWhen(request.when)

  return people
    .filter((p) => p.id !== request.requesterId && !excludeIds.includes(p.id))
    .map((person) => {
      const miles = distanceMiles(request.neighborhood, person.neighborhood)
      const skillMatch = person.skills.includes(request.category)
      const availableNow = person.availability.some((s) => needed.includes(s))

      // Higher is better. Cap distance penalty.
      const skillScore = skillMatch ? 50 : 5
      const distanceScore = Math.max(0, 35 - miles * 3.5)
      const availabilityScore = availableNow ? 20 : 4
      const ratingScore = (person.rating - 4) * 8
      const score = skillScore + distanceScore + availabilityScore + ratingScore

      const reasons: string[] = []
      if (skillMatch) reasons.push('Skill match')
      if (miles <= 2) reasons.push('Very close')
      else if (miles <= 4) reasons.push('Nearby')
      if (availableNow) reasons.push('Available for timing')
      if (person.rating >= 4.8) reasons.push('Top rated')

      return {
        person,
        score,
        distanceMiles: miles,
        skillMatch,
        availableNow,
        reasons,
      }
    })
    .sort((a, b) => b.score - a.score)
}

export function formatMoney(n: number): string {
  return `$${Math.round(n)}`
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
