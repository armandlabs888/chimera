import {
  friendlyAuthError,
  isConsumedOrMissingFlowStateError,
  SIGN_IN_LINK_EXPIRED_MESSAGE,
} from '@/lib/auth/errors'

export { SIGN_IN_LINK_EXPIRED_MESSAGE, isConsumedOrMissingFlowStateError }

/**
 * Decide whether a PKCE callback should treat the visit as signed-in success.
 * Idempotent: a second hit with an already-used code still succeeds when a
 * session cookie from the first exchange is present.
 */
export function decidePkceCallbackOutcome(args: {
  exchangeError: { message: string } | null
  hasSessionUser: boolean
}): 'success' | 'error' {
  if (!args.exchangeError) return 'success'
  if (args.hasSessionUser) return 'success'
  return 'error'
}

/** User-facing error for a failed PKCE exchange with no session. */
export function pkceCallbackErrorMessage(exchangeErrorMessage: string): string {
  if (isConsumedOrMissingFlowStateError(exchangeErrorMessage)) {
    return SIGN_IN_LINK_EXPIRED_MESSAGE
  }
  return friendlyAuthError(exchangeErrorMessage)
}

/** True when the request is a Next.js / browser prefetch (must not exchange codes). */
export function isAuthCallbackPrefetch(headers: Headers): boolean {
  if (headers.get('next-router-prefetch') === '1') return true
  if (headers.get('purpose') === 'prefetch') return true
  const secPurpose = headers.get('sec-purpose') || headers.get('sec-fetch-purpose')
  if (secPurpose?.toLowerCase().includes('prefetch')) return true
  if (headers.get('x-middleware-prefetch') === '1') return true
  return false
}
