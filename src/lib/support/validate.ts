/** Shared validation helpers for support API routes. */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function trimOrEmpty(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function isValidEmail(value: string): boolean {
  if (value.length < 3 || value.length > 254) return false
  return EMAIL_RE.test(value)
}

export function clampLength(value: string, max: number): string {
  return value.length <= max ? value : value.slice(0, max)
}

/** Honeypot filled = bot. Field must be empty. */
export function isHoneypotTripped(value: unknown): boolean {
  if (value == null) return false
  if (typeof value !== 'string') return true
  return value.trim().length > 0
}
