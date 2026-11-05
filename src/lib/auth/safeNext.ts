/** Sanitize post-auth redirect targets — relative path only, no open redirects. */
export function sanitizeNext(raw: string | null | undefined, fallback = '/browse'): string {
  if (!raw) return fallback
  const value = raw.trim()
  if (!value.startsWith('/')) return fallback
  if (value.startsWith('//')) return fallback
  if (value.includes('\\')) return fallback
  return value
}
