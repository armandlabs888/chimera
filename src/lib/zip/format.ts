/** Client-safe ZIP helpers. No gazetteer data; safe to import from client components. */

export type ZipPlace = {
  zip: string
  lat: number
  lng: number
  city: string
  stateCode: string
}

/** Accept only a 5-digit US ZIP (optional +4 discarded). */
export function normalizeZipInput(raw: string): string | null {
  const digits = String(raw ?? '')
    .trim()
    .replace(/\s+/g, '')
  const m = digits.match(/^(\d{5})(?:-\d{4})?$/)
  return m ? m[1] : null
}

export function isValidZipFormat(raw: string): boolean {
  return normalizeZipInput(raw) != null
}

/** Display under the ZIP field once resolved, e.g. "San Jose, CA 95124". */
export function formatZipPlaceLabel(place: Pick<ZipPlace, 'zip' | 'city' | 'stateCode'>): string {
  const cityState = [place.city, place.stateCode].filter(Boolean).join(', ')
  return cityState ? `${cityState} ${place.zip}` : place.zip
}

/** Location label stored on the job for existing browse/caption UI. */
export function formatZipLocationLabel(
  place: Pick<ZipPlace, 'zip' | 'city' | 'stateCode'>,
): string {
  if (place.city && place.stateCode) return `${place.city}, ${place.stateCode}`
  if (place.city) return place.city
  return place.zip
}
