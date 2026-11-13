import { NextResponse } from 'next/server'
import {
  decidePkceCallbackOutcome,
  pkceCallbackErrorMessage,
  SIGN_IN_LINK_EXPIRED_MESSAGE,
} from '@/lib/auth/pkceCallback'

type AuthLike = {
  exchangeCodeForSession: (
    code: string,
  ) => Promise<{ error: { message: string } | null }>
  getUser: () => Promise<{ data: { user: { id: string } | null } }>
}

function redirectNoStore(url: string): NextResponse {
  const response = NextResponse.redirect(url, 303)
  response.headers.set('Cache-Control', 'no-store, max-age=0')
  return response
}

/**
 * Exchange a PKCE auth code once. If the exchange fails but a session already
 * exists (duplicate callback / back button), treat it as success.
 */
export async function handlePkceCodeExchange(args: {
  auth: AuthLike
  code: string
  next: string
  publicOrigin: string
}): Promise<NextResponse> {
  const { auth, code, next, publicOrigin } = args

  try {
    const { error } = await auth.exchangeCodeForSession(code)

    if (!error) {
      return redirectNoStore(`${publicOrigin}${next}`)
    }

    const { data: userData } = await auth.getUser()
    const outcome = decidePkceCallbackOutcome({
      exchangeError: error,
      hasSessionUser: Boolean(userData.user),
    })
    if (outcome === 'success') {
      return redirectNoStore(`${publicOrigin}${next}`)
    }

    const message = pkceCallbackErrorMessage(error.message || SIGN_IN_LINK_EXPIRED_MESSAGE)
    return redirectNoStore(
      `${publicOrigin}/auth?error=${encodeURIComponent(message)}&next=${encodeURIComponent(next)}`,
    )
  } catch (err) {
    try {
      const { data: userData } = await auth.getUser()
      if (userData.user) {
        return redirectNoStore(`${publicOrigin}${next}`)
      }
    } catch {
      /* fall through */
    }
    const raw = err instanceof Error ? err.message : 'Could not complete sign-in'
    const message = pkceCallbackErrorMessage(raw)
    return redirectNoStore(
      `${publicOrigin}/auth?error=${encodeURIComponent(message)}&next=${encodeURIComponent(next)}`,
    )
  }
}
