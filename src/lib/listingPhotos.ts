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

/**
 * Live listing photos must be public URLs under the caller's beam-media folder.
 * Rejects arbitrary third-party links and other users' objects.
 * Demo may use data: URLs — those are not accepted in live create paths.
 */
export function isOwnedListingPhotoUrl(url: string, userId: string): boolean {
  if (!url || !userId) return false
  if (url.startsWith('data:')) return false
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false
    const marker = '/storage/v1/object/public/beam-media/'
    const idx = u.pathname.indexOf(marker)
    if (idx < 0) return false
    const path = decodeURIComponent(u.pathname.slice(idx + marker.length))
    return path.startsWith(`${userId}/`)
  } catch {
    return false
  }
}

export function assertOwnedListingPhotoUrls(
  urls: string[],
  userId: string,
): { ok: true; urls: string[] } | { ok: false; error: string } {
  const cleaned = urls
    .filter((u) => typeof u === 'string' && u.trim().length > 0)
    .map((u) => u.trim())
  if (cleaned.length > LISTING_PHOTO_MAX) {
    return { ok: false, error: `You can add up to ${LISTING_PHOTO_MAX} photos.` }
  }
  for (const url of cleaned) {
    if (!isOwnedListingPhotoUrl(url, userId)) {
      return {
        ok: false,
        error: 'Photos must be uploaded through Beam — external image links are not allowed.',
      }
    }
  }
  return { ok: true, urls: cleaned }
}
