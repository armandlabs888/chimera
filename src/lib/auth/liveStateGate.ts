/**
 * Signed-in live session whose AppState is still the public/anonymous snapshot
 * (or missing). During this window the provider must keep children mounted with
 * ready=false instead of the full-screen backend error splash.
 */
export function isAwaitingSignedInLiveState(input: {
  mode: string
  authUserId: string | null | undefined
  stateCurrentUserId: string | null | undefined
  backendError: string | null | undefined
}): boolean {
  if (input.mode !== 'live') return false
  if (!input.authUserId) return false
  if (input.backendError) return false
  if (!input.stateCurrentUserId) return true
  return input.stateCurrentUserId !== input.authUserId
}

/** Extract a throwable Error from a Supabase/auth failure without touching global UI state. */
export function authActionError(
  err: unknown,
  fallback: string,
): Error {
  if (err instanceof Error) return err
  if (
    typeof err === 'object' &&
    err !== null &&
    'message' in err &&
    typeof (err as { message: unknown }).message === 'string'
  ) {
    return new Error((err as { message: string }).message)
  }
  return new Error(fallback)
}
