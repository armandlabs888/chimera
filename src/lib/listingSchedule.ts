/** Local-timezone helpers for listing When / clock-time selection. */

export type ClockTime = { hours: number; minutes: number }

/** Exact copy for ASAP mode on the post form. */
export const ASAP_ARRIVAL_NOTE = 'Arrival time confirmed with your helper.'

/** Persisted / card-facing label for new ASAP listings. */
export const ASAP_WHEN_LABEL = 'As soon as possible'

export function localDateISO(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addLocalDays(isoDate: string, days: number): string {
  const d = parseLocalDate(isoDate)
  d.setDate(d.getDate() + days)
  return localDateISO(d)
}

export function parseLocalDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0)
}

export function formatShortDate(isoDate: string): string {
  return parseLocalDate(isoDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function formatWeekdayShortDate(isoDate: string): string {
  return parseLocalDate(isoDate).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function parseTimeInput(value: string): ClockTime | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!m) return null
  const hours = Number(m[1])
  const minutes = Number(m[2])
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return { hours, minutes }
}

export function formatTimeInput(t: ClockTime): string {
  return `${String(t.hours).padStart(2, '0')}:${String(t.minutes).padStart(2, '0')}`
}

export function formatClockLabel(t: ClockTime): string {
  const d = new Date()
  d.setHours(t.hours, t.minutes, 0, 0)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function combineLocalDateTime(isoDate: string, time: ClockTime): Date {
  const d = parseLocalDate(isoDate)
  d.setHours(time.hours, time.minutes, 0, 0)
  return d
}

/**
 * Human-readable when labels for new posts + legacy read-back.
 * Legacy today/tomorrow/this-week labels stay readable for historical rows.
 */
export function buildWhenLabel(opts: {
  when: 'asap' | 'today' | 'tomorrow' | 'this-week' | 'scheduled'
  dateISO: string | null
  start: ClockTime | null
  end: ClockTime | null
}): string {
  const { when, dateISO, start, end } = opts
  if (when === 'asap') return ASAP_WHEN_LABEL
  if (when === 'this-week' && !start) return 'This week'

  const datePart =
    when === 'today' && dateISO
      ? `Today · ${formatShortDate(dateISO)}`
      : when === 'tomorrow' && dateISO
        ? `Tomorrow · ${formatShortDate(dateISO)}`
        : dateISO
          ? formatWeekdayShortDate(dateISO)
          : when === 'this-week'
            ? 'This week'
            : 'Scheduled'

  if (!start) return datePart
  const timePart = end
    ? `${formatClockLabel(start)}–${formatClockLabel(end)}`
    : formatClockLabel(start)
  return `${datePart} · ${timePart}`
}

/** New post form only posts asap | scheduled. */
export function isPostWhenMode(when: string): when is 'asap' | 'scheduled' {
  return when === 'asap' || when === 'scheduled'
}

/**
 * Validate schedule window for the post form.
 * ASAP skips clocks. Scheduled requires a future local start; optional end after start.
 */
export function validateTimeWindow(opts: {
  when: string
  dateISO: string | null
  start: ClockTime | null
  end: ClockTime | null
  now?: Date
}): { ok: true } | { ok: false; error: string } {
  const now = opts.now ?? new Date()
  if (opts.when === 'asap') return { ok: true }

  if (!opts.start) {
    if (opts.when === 'this-week') return { ok: true }
    return { ok: false, error: 'Pick a start time.' }
  }
  if (!opts.dateISO) return { ok: false, error: 'Pick a date.' }

  if (opts.end) {
    const startAt = combineLocalDateTime(opts.dateISO, opts.start)
    const endAt = combineLocalDateTime(opts.dateISO, opts.end)
    if (endAt.getTime() <= startAt.getTime()) {
      return { ok: false, error: 'End time must be after start time.' }
    }
  }

  const startAt = combineLocalDateTime(opts.dateISO, opts.start)
  if (startAt.getTime() < now.getTime() - 60_000) {
    return { ok: false, error: 'Start time can’t be in the past.' }
  }
  return { ok: true }
}
