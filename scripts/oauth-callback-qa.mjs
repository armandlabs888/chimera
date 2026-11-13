#!/usr/bin/env node
/**
 * PKCE callback idempotency + friendly-error QA.
 *
 * 1. Unit: decidePkceCallbackOutcome / friendly mapping / prefetch detection
 * 2. HTTP (requires BASE_URL): invalid/used code while signed out → calm message
 * 3. HTTP: prefetch headers must not exchange (204)
 * 4. Simulated signed-in path via handlePkceCodeExchange mock (success → next)
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:43123'
const FRIENDLY = 'That sign-in link expired. Please try again.'

// --- Mirror pure helpers (keep in sync with src/lib/auth/{errors,pkceCallback}.ts) ---

function isConsumedOrMissingFlowStateError(message) {
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

function decidePkceCallbackOutcome({ exchangeError, hasSessionUser }) {
  if (!exchangeError) return 'success'
  if (hasSessionUser) return 'success'
  return 'error'
}

function isAuthCallbackPrefetch(headers) {
  if (headers.get('next-router-prefetch') === '1') return true
  if (headers.get('purpose') === 'prefetch') return true
  const secPurpose = headers.get('sec-purpose') || headers.get('sec-fetch-purpose')
  if (secPurpose?.toLowerCase().includes('prefetch')) return true
  if (headers.get('x-middleware-prefetch') === '1') return true
  return false
}

function friendlyAuthError(message) {
  if (!message) return 'Something went wrong. Please try again.'
  if (message === FRIENDLY) return message
  if (isConsumedOrMissingFlowStateError(message)) return FRIENDLY
  const lower = message.toLowerCase()
  if (lower.includes('exchange') || lower.includes('pkce') || lower.includes('code verifier')) {
    return FRIENDLY
  }
  return message
}

async function handlePkceCodeExchange({ auth, code, next, publicOrigin }) {
  try {
    const { error } = await auth.exchangeCodeForSession(code)
    if (!error) {
      return { status: 303, location: `${publicOrigin}${next}` }
    }
    const { data: userData } = await auth.getUser()
    const outcome = decidePkceCallbackOutcome({
      exchangeError: error,
      hasSessionUser: Boolean(userData.user),
    })
    if (outcome === 'success') {
      return { status: 303, location: `${publicOrigin}${next}` }
    }
    const message = friendlyAuthError(error.message || FRIENDLY)
    return {
      status: 303,
      location: `${publicOrigin}/auth?error=${encodeURIComponent(message)}&next=${encodeURIComponent(next)}`,
    }
  } catch (err) {
    try {
      const { data: userData } = await auth.getUser()
      if (userData.user) {
        return { status: 303, location: `${publicOrigin}${next}` }
      }
    } catch {
      /* fall through */
    }
    const raw = err instanceof Error ? err.message : 'Could not complete sign-in'
    const message = friendlyAuthError(raw)
    return {
      status: 303,
      location: `${publicOrigin}/auth?error=${encodeURIComponent(message)}&next=${encodeURIComponent(next)}`,
    }
  }
}

function unitTests() {
  assert.equal(
    decidePkceCallbackOutcome({
      exchangeError: { message: 'invalid flow state, no valid flow state found' },
      hasSessionUser: true,
    }),
    'success',
    'used code + session → success',
  )
  assert.equal(
    decidePkceCallbackOutcome({
      exchangeError: { message: 'flow_state_not_found' },
      hasSessionUser: false,
    }),
    'error',
    'used code + signed out → error',
  )
  assert.equal(
    decidePkceCallbackOutcome({ exchangeError: null, hasSessionUser: false }),
    'success',
    'clean exchange → success',
  )

  assert.equal(
    friendlyAuthError('invalid flow state, no valid flow state found'),
    FRIENDLY,
  )
  assert.equal(friendlyAuthError('flow_state_not_found'), FRIENDLY)
  assert.equal(friendlyAuthError(FRIENDLY), FRIENDLY)

  assert.equal(
    isAuthCallbackPrefetch(new Headers({ 'next-router-prefetch': '1' })),
    true,
  )
  assert.equal(isAuthCallbackPrefetch(new Headers({ purpose: 'prefetch' })), true)
  assert.equal(isAuthCallbackPrefetch(new Headers()), false)

  // Source contracts
  const callbackSrc = readFileSync(join(root, 'app/auth/callback/route.ts'), 'utf8')
  assert.match(callbackSrc, /handlePkceCodeExchange/)
  assert.match(callbackSrc, /isAuthCallbackPrefetch/)
  assert.match(callbackSrc, /detectSessionInUrl|force-dynamic/)

  const clientSrc = readFileSync(join(root, 'src/lib/supabase/client.ts'), 'utf8')
  assert.match(clientSrc, /detectSessionInUrl:\s*false/)

  const proxySrc = readFileSync(join(root, 'src/lib/supabase/proxy.ts'), 'utf8')
  assert.match(proxySrc, /redirectToCanonicalHost/)

  console.log('ok unit: pkce decision + friendly error + prefetch + source contracts')
}

async function simulatedSignedInExchange() {
  const auth = {
    async exchangeCodeForSession() {
      return { error: { message: 'invalid flow state, no valid flow state found' } }
    },
    async getUser() {
      return { data: { user: { id: 'user-already-signed-in' } } }
    },
  }
  const result = await handlePkceCodeExchange({
    auth,
    code: 'already-used-code',
    next: '/onboarding',
    publicOrigin: 'https://www.yariapp.com',
  })
  assert.equal(result.status, 303)
  assert.equal(result.location, 'https://www.yariapp.com/onboarding')
  assert.doesNotMatch(result.location, /error=/)
  console.log('ok simulated signed-in: used code → redirect to next')
}

async function simulatedSignedOutExchange() {
  const auth = {
    async exchangeCodeForSession() {
      return { error: { message: 'invalid flow state, no valid flow state found' } }
    },
    async getUser() {
      return { data: { user: null } }
    },
  }
  const result = await handlePkceCodeExchange({
    auth,
    code: 'already-used-code',
    next: '/onboarding',
    publicOrigin: 'https://www.yariapp.com',
  })
  assert.equal(result.status, 303)
  assert.match(result.location, /\/auth\?/)
  const url = new URL(result.location)
  assert.equal(url.searchParams.get('error'), FRIENDLY)
  assert.equal(url.searchParams.get('next'), '/onboarding')
  console.log('ok simulated signed-out: used code → friendly auth error')
}

async function httpProbes() {
  let reachable = false
  try {
    const probe = await fetch(`${BASE_URL}/auth`, { redirect: 'manual' })
    reachable = probe.status > 0
  } catch {
    console.log(`skip HTTP probes (server not reachable at ${BASE_URL})`)
    return
  }
  if (!reachable) {
    console.log(`skip HTTP probes (server not reachable at ${BASE_URL})`)
    return
  }

  // Signed out + invalid/used code → /auth with friendly error (no raw Supabase dump)
  const used = await fetch(
    `${BASE_URL}/auth/callback?code=already-used-or-invalid&next=${encodeURIComponent('/onboarding')}`,
    { redirect: 'manual' },
  )
  assert.ok([302, 303, 307, 308].includes(used.status), `used-code status ${used.status}`)
  const usedLoc = used.headers.get('location') || ''
  assert.match(usedLoc, /\/auth/, `used-code → /auth, got ${usedLoc}`)
  const usedUrl = new URL(usedLoc, BASE_URL)
  const errMsg = usedUrl.searchParams.get('error') || ''
  assert.ok(errMsg, `error query present: ${usedLoc}`)
  assert.doesNotMatch(errMsg, /flow_state_not_found/i)
  assert.doesNotMatch(errMsg, /invalid flow state/i)
  // Live Supabase: calm expired copy. Unconfigured/demo may surface config copy instead.
  if (!/not configured|demo mode|NEXT_PUBLIC_/i.test(errMsg)) {
    assert.equal(friendlyAuthError(errMsg), FRIENDLY, `friendly mapping for "${errMsg}"`)
  }
  assert.match(usedLoc, /next=%2Fonboarding|next=\/onboarding/)
  const cacheControl = used.headers.get('cache-control') || ''
  assert.match(cacheControl, /no-store/i, `callback Cache-Control: ${cacheControl}`)
  console.log('ok HTTP signed-out: invalid code → friendly message')

  // Prefetch must not run the exchange side effect
  const prefetch = await fetch(
    `${BASE_URL}/auth/callback?code=prefetch-must-not-exchange&next=${encodeURIComponent('/onboarding')}`,
    {
      redirect: 'manual',
      headers: { 'next-router-prefetch': '1' },
    },
  )
  assert.equal(prefetch.status, 204, `prefetch should 204, got ${prefetch.status}`)
  console.log('ok HTTP prefetch: callback returns 204')
}

async function main() {
  unitTests()
  await simulatedSignedInExchange()
  await simulatedSignedOutExchange()
  await httpProbes()
  console.log('oauth-callback-qa: all checks passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
