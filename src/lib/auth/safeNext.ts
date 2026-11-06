/** Sanitize post-auth redirect targets — relative path only, no open redirects. */
export function sanitizeNext(raw: string | null | undefined, fallback = '/browse'): string {
  if (!raw) return fallback

  let value = raw.trim()
  if (!value) return fallback

  // URLSearchParams already decodes once; peel one more layer when OAuth
  // redirect chains double-encode (e.g. next=%252Fbrowse → %2Fbrowse → /browse).
  if (value.includes('%')) {
    try {
      const decoded = decodeURIComponent(value)
      if (decoded.startsWith('/') && !decoded.startsWith('//')) {
        value = decoded
      }
    } catch {
      /* keep original */
    }
  }

  if (!value.startsWith('/')) return fallback
  if (value.startsWith('//')) return fallback
  if (value.includes('\\')) return fallback
  if (value.includes('://')) return fallback
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    if (code <= 0x1f || code === 0x7f) return fallback
  }
  if (value.length > 512) return fallback

  return value
}

/**
 * Absolute callback URL for Google OAuth / email confirmation.
 * Works on www, apex, Vercel previews, and localhost when `origin` is
 * `window.location.origin` (or an equivalent request origin).
 */
export function buildAuthCallbackUrl(origin: string, nextPath?: string | null): string {
  const next = sanitizeNext(nextPath)
  const base = origin.replace(/\/$/, '') || ''
  if (!base) {
    return `/auth/callback?next=${encodeURIComponent(next)}`
  }
  return `${base}/auth/callback?next=${encodeURIComponent(next)}`
}
