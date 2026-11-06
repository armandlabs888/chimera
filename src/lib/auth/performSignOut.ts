/** Server route that clears session cookies and 303-redirects to `/auth`. */
export const SIGNOUT_PATH = '/auth/signout'

/** Clean post-logout destination (no `next=` from the prior route). */
export const AUTH_AFTER_SIGNOUT = '/auth'

/**
 * Hard-navigate through the server sign-out route.
 * Uses `location.replace` so the current page is dropped from history
 * (no back-button bounce into a stale signed-in route, and no SPA flash
 * of public chrome on `/requests/[id]`, `/browse`, etc.).
 */
export function redirectThroughSignOut() {
  if (typeof window === 'undefined') return
  window.location.replace(SIGNOUT_PATH)
}
