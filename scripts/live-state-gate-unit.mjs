#!/usr/bin/env node
/**
 * Unit check for signed-in live-state gate helpers used by BeamContext
 * to avoid the full-screen backend error splash during auth hydrate.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const gateSrc = readFileSync(join(root, 'src/lib/auth/liveStateGate.ts'), 'utf8')
const beamSrc = readFileSync(join(root, 'src/context/BeamContext.tsx'), 'utf8')

assert.match(gateSrc, /export function isAwaitingSignedInLiveState/)
assert.match(gateSrc, /export function authActionError/)
assert.match(beamSrc, /isAwaitingSignedInLiveState/)
assert.match(beamSrc, /authActionError/)
assert.match(beamSrc, /window\.setTimeout/)
assert.match(beamSrc, /throw authActionError\(error, 'Sign in failed'\)/)
assert.match(beamSrc, /throw authActionError\(error, 'Sign up failed'\)/)
assert.match(beamSrc, /throw authActionError\(error, 'Google sign-in failed'\)/)
assert.match(beamSrc, /throw authActionError\(error, 'Could not resend confirmation email'\)/)
assert.doesNotMatch(
  beamSrc,
  /if \(error\) reportError\(error, 'Sign (in|up) failed'\)/,
)
assert.match(beamSrc, /Only the real backend failure path/)

/** Mirrors `@/lib/auth/liveStateGate` without a TS loader. */
function isAwaitingSignedInLiveState(input) {
  if (input.mode !== 'live') return false
  if (!input.authUserId) return false
  if (input.backendError) return false
  if (!input.stateCurrentUserId) return true
  return input.stateCurrentUserId !== input.authUserId
}

function authActionError(err, fallback) {
  if (err instanceof Error) return err
  if (
    typeof err === 'object' &&
    err !== null &&
    'message' in err &&
    typeof err.message === 'string'
  ) {
    return new Error(err.message)
  }
  return new Error(fallback)
}

assert.equal(
  isAwaitingSignedInLiveState({
    mode: 'live',
    authUserId: 'user-1',
    stateCurrentUserId: 'anonymous',
    backendError: null,
  }),
  true,
  'signed in over anonymous public state must await',
)

assert.equal(
  isAwaitingSignedInLiveState({
    mode: 'live',
    authUserId: 'user-1',
    stateCurrentUserId: null,
    backendError: null,
  }),
  true,
  'signed in with null state must await',
)

assert.equal(
  isAwaitingSignedInLiveState({
    mode: 'live',
    authUserId: 'user-1',
    stateCurrentUserId: 'user-1',
    backendError: null,
  }),
  false,
  'matching live state is ready',
)

assert.equal(
  isAwaitingSignedInLiveState({
    mode: 'live',
    authUserId: 'user-1',
    stateCurrentUserId: 'anonymous',
    backendError: 'Load profiles: boom',
  }),
  false,
  'real backendError must not be treated as awaiting',
)

assert.equal(
  isAwaitingSignedInLiveState({
    mode: 'demo',
    authUserId: 'user-1',
    stateCurrentUserId: 'anonymous',
    backendError: null,
  }),
  false,
)

assert.equal(
  isAwaitingSignedInLiveState({
    mode: 'live',
    authUserId: null,
    stateCurrentUserId: 'anonymous',
    backendError: null,
  }),
  false,
)

const fromAuth = authActionError({ message: 'User already registered' }, 'Sign up failed')
assert.equal(fromAuth.message, 'User already registered')
assert.equal(authActionError(new Error('nope'), 'fallback').message, 'nope')
assert.equal(authActionError(null, 'Sign in failed').message, 'Sign in failed')

const authExp = readFileSync(join(root, 'src/components/auth/AuthExperience.tsx'), 'utf8')
assert.match(authExp, /catch \(err\)/)
assert.match(authExp, /friendlyAuthError\(err instanceof Error \? err\.message/)

console.log('live-state-gate-unit: ok')
