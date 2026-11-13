/** Calm copy when the auth code was already used, expired, or the flow state is gone. */
export const SIGN_IN_LINK_EXPIRED_MESSAGE = 'That sign-in link expired. Please try again.'

export function isConsumedOrMissingFlowStateError(message: string | null | undefined): boolean {
  if (!message) return false
  const lower = message.toLowerCase()
  return (
    lower.includes('flow_state_not_found') ||
    lower.includes('flow state not found') ||
    lower.includes('invalid flow state') ||
    lower.includes('no valid flow state') ||
    (lower.includes('flow state') && lower.includes('no longer')) ||
    lower.includes('code verifier') ||
    (lower.includes('pkce') && (lower.includes('not found') || lower.includes('expired')))
  )
}

/** Map raw Supabase / GoTrue errors to marketplace-friendly copy. */
export function friendlyAuthError(message: string | null | undefined): string {
  if (!message) return 'Something went wrong. Please try again.'
  // Already mapped by the callback route — keep as-is.
  if (message === SIGN_IN_LINK_EXPIRED_MESSAGE) return message
  const lower = message.toLowerCase()
  if (isConsumedOrMissingFlowStateError(message)) {
    return SIGN_IN_LINK_EXPIRED_MESSAGE
  }
  if (
    lower.includes('unsupported provider') ||
    lower.includes('provider is not enabled') ||
    lower.includes('provider not enabled')
  ) {
    return 'Google sign-in isn’t enabled yet for HouseCall. Continue with email below, or try again after Google is connected.'
  }
  if (lower.includes('invalid login credentials') || lower.includes('invalid email or password')) {
    return 'That email or password doesn’t match. Check your details and try again.'
  }
  if (lower.includes('user already registered') || lower.includes('already been registered')) {
    return 'An account with that email already exists. Sign in instead, or reset your password if you forgot it.'
  }
  if (lower.includes('email not confirmed') || lower.includes('not confirmed')) {
    return 'Confirm your email from the link we sent, then sign in.'
  }
  if (lower.includes('password') && lower.includes('least')) {
    return 'Use a password with at least 6 characters.'
  }
  if (lower.includes('rate limit') || lower.includes('too many')) {
    return 'Too many attempts. Wait a moment and try again.'
  }
  if (
    lower.includes('access_denied') ||
    lower.includes('access denied') ||
    lower.includes('user denied') ||
    (lower.includes('user') && (lower.includes('cancelled') || lower.includes('canceled')))
  ) {
    return 'Google sign-in was cancelled. You can try again, or continue with email below.'
  }
  if (lower.includes('exchange') || lower.includes('pkce') || lower.includes('code verifier')) {
    return SIGN_IN_LINK_EXPIRED_MESSAGE
  }
  return message
}
