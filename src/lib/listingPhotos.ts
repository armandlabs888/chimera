/** Listing photo validation — client + shared with upload helpers. */

export const LISTING_PHOTO_MAX = 5
export const LISTING_PHOTO_MAX_BYTES = 5 * 1024 * 1024
export const LISTING_PHOTO_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const

export type ListingPhotoMime = (typeof LISTING_PHOTO_MIME)[number]

export const LISTING_PHOTO_HINT = `Up to ${LISTING_PHOTO_MAX} photos · JPEG, PNG, WebP, or GIF · max 5 MB each`

export function isAllowedListingPhotoMime(type: string): type is ListingPhotoMime {
  return (LISTING_PHOTO_MIME as readonly string[]).includes(type)
}

export function validateListingPhotoFile(
  file: File,
  currentCount: number,
): { ok: true } | { ok: false; error: string } {
  if (currentCount >= LISTING_PHOTO_MAX) {
    return { ok: false, error: `You can add up to ${LISTING_PHOTO_MAX} photos.` }
  }
  if (!isAllowedListingPhotoMime(file.type)) {
    return { ok: false, error: 'Use JPEG, PNG, WebP, or GIF.' }
  }
  if (file.size > LISTING_PHOTO_MAX_BYTES) {
    return { ok: false, error: 'Each photo must be 5 MB or smaller.' }
  }
  return { ok: true }
}

export function listingCoverImage(images: string[] | null | undefined, fallback = ''): string {
  const first = (images ?? []).find((u) => typeof u === 'string' && u.trim().length > 0)
  return first || fallback || ''
}

export function normalizeListingImages(
  images: string[] | null | undefined,
  legacyImage?: string | null,
): string[] {
  const fromArray = (images ?? []).filter((u) => typeof u === 'string' && u.trim().length > 0)
  if (fromArray.length) return fromArray.slice(0, LISTING_PHOTO_MAX)
  if (legacyImage && legacyImage.trim()) return [legacyImage.trim()]
  return []
}
