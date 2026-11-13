/** Production public host for HouseCall (canonical). */
export const PRODUCTION_SITE_HOST = 'www.yariapp.com'
export const PRODUCTION_APEX_HOST = 'yariapp.com'

/** Optional absolute site URL override (no trailing slash), e.g. https://www.yariapp.com */
export function getConfiguredSiteUrl(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (!raw) return undefined
  return raw.replace(/\/$/, '')
}

/**
 * Parent-domain cookie scope so apex and www share the PKCE verifier + session.
 * Preview / localhost stay host-only (undefined).
 */
export function cookieDomainForHost(host: string | null | undefined): string | undefined {
  if (!host) return undefined
  const bare = host.split(':')[0]?.toLowerCase()
  if (bare === PRODUCTION_SITE_HOST || bare === PRODUCTION_APEX_HOST) {
    return '.yariapp.com'
  }
  return undefined
}

/**
 * OAuth / email `redirectTo` origin: always the page the user is on so the
 * PKCE verifier cookie host matches the callback host. Middleware canonicalizes
 * apex → www first in production, so this is normally https://www.yariapp.com.
 */
export function resolveOAuthRedirectOrigin(windowOrigin: string): string {
  return windowOrigin.replace(/\/$/, '')
}

/** Public origin for post-auth redirects (prefer configured site URL, else www for yariapp). */
export function canonicalPublicOrigin(
  requestOrigin: string,
  hostHeader?: string | null,
): string {
  const configured = getConfiguredSiteUrl()
  if (configured) return configured
  try {
    const url = new URL(requestOrigin)
    const host = (hostHeader || url.host).split(':')[0]?.toLowerCase()
    if (host === PRODUCTION_APEX_HOST || host === PRODUCTION_SITE_HOST) {
      return `https://${PRODUCTION_SITE_HOST}`
    }
    return url.origin
  } catch {
    return requestOrigin.replace(/\/$/, '')
  }
}
