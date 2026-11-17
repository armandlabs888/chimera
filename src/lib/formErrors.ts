/**
 * Shared helpers for save/submit validation UX across Bunk forms.
 * User-facing copy must not use em or en dashes.
 */

export const FORM_SAVE_FAILED =
  "We couldn't save your changes. Check your connection and try again."

export const FORM_SEND_FAILED =
  "We couldn't send that. Check your connection and try again."

/** Placeholder hint color for empty inputs (never looks like a filled value). */
export const PLACEHOLDER_HINT_COLOR = '#8A94A6'

const RAW_ERROR_HINTS =
  /supabase|postgres|sqlstate|permission denied|jwt|rls|column |relation |violates|stack|etype|syntax error|undefined column|networkerror|failed to fetch|load failed|http\/|status code/i

/**
 * Turn thrown / API errors into a short human message.
 * Strips backend prefixes and never surfaces SQL / Supabase text.
 */
export function humanizeSaveError(
  err: unknown,
  fallback: string = FORM_SAVE_FAILED,
): string {
  const raw =
    typeof err === 'string'
      ? err
      : err instanceof Error
        ? err.message
        : ''
  const cleaned = raw
    .replace(/^Update profile:\s*/i, '')
    .replace(/^Error:\s*/i, '')
    .trim()

  if (!cleaned) return fallback
  if (RAW_ERROR_HINTS.test(cleaned)) return fallback
  if (cleaned.length > 160) return fallback
  // Keep short, already-friendly messages (auth, validation).
  return cleaned
}

/** Join one or more fix-it lines into alert copy. */
export function formatFormIssues(issues: string[]): string {
  const cleaned = issues.map((s) => s.trim()).filter(Boolean)
  if (cleaned.length === 0) return ''
  if (cleaned.length === 1) return cleaned[0]
  return cleaned.join(' ')
}

/** Scroll an element into view and focus it when possible. */
export function focusAndScroll(
  el: HTMLElement | null | undefined,
  options?: { preventScroll?: boolean },
): void {
  if (!el) return
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      if (typeof el.focus === 'function') {
        try {
          el.focus({ preventScroll: options?.preventScroll ?? true })
        } catch {
          el.focus()
        }
      }
    })
  })
}

/** Scroll a submit-adjacent alert into view (does not steal field focus). */
export function scrollAlertIntoView(el: HTMLElement | null | undefined): void {
  if (!el) return
  requestAnimationFrame(() => {
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  })
}
