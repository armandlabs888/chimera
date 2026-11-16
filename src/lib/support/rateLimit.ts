/**
 * Simple in-memory rate limit for support forms.
 * Max 5 submissions per hour per key (user id or IP).
 * Resets on cold starts in serverless; still blocks basic floods.
 */

const WINDOW_MS = 60 * 60 * 1000
const MAX_PER_WINDOW = 5

type Bucket = { count: number; windowStart: number }

const buckets = new Map<string, Bucket>()

export function supportRateLimitKey(userId: string | null, ip: string | null): string {
  if (userId) return `user:${userId}`
  if (ip) return `ip:${ip}`
  return 'anon:unknown'
}

export function checkSupportRateLimit(key: string): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now()
  const existing = buckets.get(key)
  if (!existing || now - existing.windowStart >= WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now })
    return { ok: true }
  }
  if (existing.count >= MAX_PER_WINDOW) {
    const retryAfterSec = Math.max(1, Math.ceil((WINDOW_MS - (now - existing.windowStart)) / 1000))
    return { ok: false, retryAfterSec }
  }
  existing.count += 1
  return { ok: true }
}

/** Client IP from common proxy headers. */
export function clientIpFromRequest(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  const real = request.headers.get('x-real-ip')?.trim()
  return real || null
}
