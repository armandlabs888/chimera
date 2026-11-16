/**
 * Resolve a crisp avatar URL for the displayed CSS pixel size.
 * Google OAuth photos are often stored as `=s96-c` (96×96), which looks soft
 * at the profile header (100px CSS ≈ 200px on retina). Request at least 2×,
 * and never below {@link AVATAR_MIN_REQUEST_PX} for Google thumbnails.
 */

const GOOGLE_HOST = /(?:\.|^)googleusercontent\.com$/i

/** Minimum long-edge we ask Google for, so header avatars stay sharp on 2×/3×. */
export const AVATAR_MIN_REQUEST_PX = 512

/** Upload compression long-edge for avatars (must stay ≥ ~512). */
export const AVATAR_UPLOAD_MAX_DIM = 1024

export function isGoogleUserContentUrl(url: string): boolean {
  try {
    return GOOGLE_HOST.test(new URL(url).hostname)
  } catch {
    return false
  }
}

/**
 * Rewrite Google `=sN` / `=sN-c` to at least `requestPx`.
 * Leaves already-larger size params alone. Non-matching Google URLs get `=sN-c` appended.
 */
export function googleAvatarSizeParam(url: string, requestPx: number): string {
  const target = Math.max(1, Math.round(requestPx))
  const match = url.match(/=s(\d+)(-[a-z]+)?(?=$|[/?#])/i)
  if (match) {
    const current = Number(match[1])
    const suffix = match[2] ?? '-c'
    if (Number.isFinite(current) && current >= target) return url
    return url.replace(/=s\d+(-[a-z]+)?(?=$|[/?#])/i, `=s${target}${suffix}`)
  }
  // Rare: bare googleusercontent photo URL without a size suffix.
  return `${url}${url.includes('?') ? '&' : '='}s${target}-c`
}

/** Pixel size to request for a CSS display size (2×, floored at 512 for Google). */
export function avatarRequestPx(displayCssPx: number): number {
  return Math.max(AVATAR_MIN_REQUEST_PX, Math.ceil(Math.max(1, displayCssPx) * 2))
}

/**
 * URL to load for a given CSS display size. Non-Google URLs (uploads, Unsplash) pass through.
 */
export function resolveAvatarSrc(src: string | undefined | null, displayCssPx: number): string {
  const url = (src ?? '').trim()
  if (!url) return ''
  if (!isGoogleUserContentUrl(url)) return url
  return googleAvatarSizeParam(url, avatarRequestPx(displayCssPx))
}

/** srcSet for 1× / 2× / 3× when the host can resize (Google). */
export function resolveAvatarSrcSet(
  src: string | undefined | null,
  displayCssPx: number,
): string | undefined {
  const url = (src ?? '').trim()
  if (!url || !isGoogleUserContentUrl(url)) return undefined
  const d1 = googleAvatarSizeParam(url, avatarRequestPx(displayCssPx))
  const d2 = googleAvatarSizeParam(url, avatarRequestPx(displayCssPx * 1.5))
  const d3 = googleAvatarSizeParam(url, Math.max(AVATAR_MIN_REQUEST_PX, Math.ceil(displayCssPx * 3)))
  return `${d1} 1x, ${d2} 2x, ${d3} 3x`
}

/** `sizes` attribute for a fixed CSS square avatar. */
export function avatarSizesAttr(displayCssPx: number): string {
  return `${Math.max(1, Math.round(displayCssPx))}px`
}

/** Normalize OAuth seed URLs before first write (does not rewrite existing DB rows). */
export function normalizeAvatarUrlForStorage(url: string | undefined | null): string {
  const trimmed = (url ?? '').trim()
  if (!trimmed) return ''
  if (!isGoogleUserContentUrl(trimmed)) return trimmed
  return googleAvatarSizeParam(trimmed, AVATAR_MIN_REQUEST_PX)
}
