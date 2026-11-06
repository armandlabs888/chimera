/** True when a person has a meaningful public star rating. */
export function hasPublicRating(person: {
  rating?: number | null
  reviewCount?: number | null
}): boolean {
  return Number(person.rating ?? 0) > 0 && Number(person.reviewCount ?? 0) > 0
}

/** Format rating for display, or null when the user should show a New badge instead. */
export function formatPublicRating(person: {
  rating?: number | null
  reviewCount?: number | null
}): string | null {
  if (!hasPublicRating(person)) return null
  return Number(person.rating).toFixed(1)
}
