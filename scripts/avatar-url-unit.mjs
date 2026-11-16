#!/usr/bin/env node
/**
 * Unit checks for Google OAuth avatar URL upgrading (s96-c → ≥512 for retina).
 */
import assert from 'node:assert/strict'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const {
  AVATAR_MIN_REQUEST_PX,
  AVATAR_UPLOAD_MAX_DIM,
  avatarRequestPx,
  avatarSizesAttr,
  googleAvatarSizeParam,
  isGoogleUserContentUrl,
  normalizeAvatarUrlForStorage,
  resolveAvatarSrc,
  resolveAvatarSrcSet,
} = await import(join(root, 'src/lib/avatarUrl.ts'))

const kuni =
  'https://lh3.googleusercontent.com/a/ACg8ocKRmweKG2_-efoyYCV8UKr5WCI-tPfur8Zfa8-yYSf57-zZDqs=s96-c'

assert.equal(AVATAR_MIN_REQUEST_PX, 512)
assert.ok(AVATAR_UPLOAD_MAX_DIM >= 512)
assert.equal(isGoogleUserContentUrl(kuni), true)
assert.equal(isGoogleUserContentUrl('https://images.unsplash.com/photo-x?w=200'), false)

assert.equal(avatarRequestPx(100), 512)
assert.equal(avatarRequestPx(40), 512)
assert.equal(avatarRequestPx(300), 600)

const upgraded = resolveAvatarSrc(kuni, 100)
assert.match(upgraded, /=s512-c$/)
assert.doesNotMatch(upgraded, /=s96-c/)

const srcSet = resolveAvatarSrcSet(kuni, 100)
assert.ok(srcSet)
assert.match(srcSet, /1x/)
assert.match(srcSet, /2x/)
assert.match(srcSet, /=s512-c/)

assert.equal(avatarSizesAttr(100), '100px')

const unsplash =
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&h=200&q=80'
assert.equal(resolveAvatarSrc(unsplash, 100), unsplash)
assert.equal(resolveAvatarSrcSet(unsplash, 100), undefined)

assert.equal(
  googleAvatarSizeParam(kuni.replace('=s96-c', '=s800-c'), 512),
  kuni.replace('=s96-c', '=s800-c'),
)

assert.equal(normalizeAvatarUrlForStorage(kuni), upgraded)
assert.equal(normalizeAvatarUrlForStorage(''), '')
assert.equal(normalizeAvatarUrlForStorage(unsplash), unsplash)

console.log('avatar-url-unit: OK')
