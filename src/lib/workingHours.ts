import type { Person } from '@/types'

/** HH:MM in 24-hour form, used for selects and persistence. */
export type WorkTimeValue = string

export type WorkingHoursStatus = 'available' | 'unavailable'

export type WorkingHoursSnapshot = {
  status: WorkingHoursStatus
  label: string
  detail: string | null
  untilLabel: string | null
  fromLabel: string | null
}

const HALF_HOUR_STEPS = 48

/** Primary / eastern-leaning defaults for multi-zone states. */
const STATE_TIMEZONE: Record<string, string> = {
  AL: 'America/Chicago',
  AK: 'America/Anchorage',
  AZ: 'America/Phoenix',
  AR: 'America/Chicago',
  CA: 'America/Los_Angeles',
  CO: 'America/Denver',
  CT: 'America/New_York',
  DE: 'America/New_York',
  DC: 'America/New_York',
  FL: 'America/New_York',
  GA: 'America/New_York',
  HI: 'Pacific/Honolulu',
  ID: 'America/Boise',
  IL: 'America/Chicago',
  IN: 'America/Indiana/Indianapolis',
  IA: 'America/Chicago',
  KS: 'America/Chicago',
  KY: 'America/New_York',
  LA: 'America/Chicago',
  ME: 'America/New_York',
  MD: 'America/New_York',
  MA: 'America/New_York',
  MI: 'America/Detroit',
  MN: 'America/Chicago',
  MS: 'America/Chicago',
  MO: 'America/Chicago',
  MT: 'America/Denver',
  NE: 'America/Chicago',
  NV: 'America/Los_Angeles',
  NH: 'America/New_York',
  NJ: 'America/New_York',
  NM: 'America/Denver',
  NY: 'America/New_York',
  NC: 'America/New_York',
  ND: 'America/Chicago',
  OH: 'America/New_York',
  OK: 'America/Chicago',
  OR: 'America/Los_Angeles',
  PA: 'America/New_York',
  RI: 'America/New_York',
  SC: 'America/New_York',
  SD: 'America/Chicago',
  TN: 'America/Chicago',
  TX: 'America/Chicago',
  UT: 'America/Denver',
  VT: 'America/New_York',
  VA: 'America/New_York',
  WA: 'America/Los_Angeles',
  WV: 'America/New_York',
  WI: 'America/Chicago',
  WY: 'America/Denver',
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** Normalize DB `time` / `timetz` / HH:MM(:SS) strings to HH:MM. */
export function normalizeWorkTime(value: unknown): WorkTimeValue | null {
  if (value == null) return null
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?(?:\.\d+)?/.exec(trimmed)
  if (!m) return null
  const hours = Number(m[1])
  const minutes = Number(m[2])
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return `${pad2(hours)}:${pad2(minutes)}`
}

export function formatWorkTimeLabel(value: WorkTimeValue): string {
  const normalized = normalizeWorkTime(value)
  if (!normalized) return ''
  const [hStr, mStr] = normalized.split(':')
  const hours = Number(hStr)
  const minutes = Number(mStr)
  const d = new Date()
  d.setHours(hours, minutes, 0, 0)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function workTimeOptions(): { value: WorkTimeValue; label: string }[] {
  const options: { value: WorkTimeValue; label: string }[] = []
  for (let i = 0; i < HALF_HOUR_STEPS; i++) {
    const hours = Math.floor(i / 2)
    const minutes = i % 2 === 0 ? 0 : 30
    const value = `${pad2(hours)}:${pad2(minutes)}`
    options.push({ value, label: formatWorkTimeLabel(value) })
  }
  return options
}

export function workTimeToMinutes(value: WorkTimeValue): number | null {
  const normalized = normalizeWorkTime(value)
  if (!normalized) return null
  const [h, m] = normalized.split(':').map(Number)
  return h * 60 + m
}

/** End must be strictly after start (no overnight ranges). */
export function isValidWorkingHoursRange(
  start: WorkTimeValue | null | undefined,
  end: WorkTimeValue | null | undefined,
): boolean {
  if (!start && !end) return true
  if (!start || !end) return false
  const a = workTimeToMinutes(start)
  const b = workTimeToMinutes(end)
  if (a == null || b == null) return false
  return b > a
}

export function browserTimeZone(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return tz && typeof tz === 'string' ? tz : null
  } catch {
    return null
  }
}

export function timezoneFromStateCode(stateCode?: string | null): string | null {
  if (!stateCode) return null
  const key = stateCode.trim().toUpperCase()
  return STATE_TIMEZONE[key] ?? null
}

export function resolveHelperTimeZone(
  person: Pick<Person, 'timezone' | 'stateCode'>,
): string | null {
  const stored = (person.timezone || '').trim()
  if (stored) return stored
  return timezoneFromStateCode(person.stateCode)
}

function minutesInTimeZone(now: Date, timeZone: string): number | null {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      minute: 'numeric',
      hourCycle: 'h23',
    }).formatToParts(now)
    const hour = Number(parts.find((p) => p.type === 'hour')?.value)
    const minute = Number(parts.find((p) => p.type === 'minute')?.value)
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null
    return hour * 60 + minute
  } catch {
    return null
  }
}

export function hasWorkingHours(
  person: Pick<Person, 'workStart' | 'workEnd'>,
): boolean {
  return Boolean(normalizeWorkTime(person.workStart) && normalizeWorkTime(person.workEnd))
}

/**
 * Live working-hours status in the helper's timezone.
 * Returns null when hours or timezone cannot be resolved.
 */
export function workingHoursSavePayload(
  workStart: WorkTimeValue | '',
  workEnd: WorkTimeValue | '',
):
  | {
      ok: true
      workStart: WorkTimeValue | null
      workEnd: WorkTimeValue | null
      timezone: string | null
    }
  | { ok: false; error: string } {
  const start = workStart || null
  const end = workEnd || null
  if (!start && !end) {
    return { ok: true, workStart: null, workEnd: null, timezone: null }
  }
  if (!start || !end) {
    return { ok: false, error: 'Choose both a start and end time, or clear both.' }
  }
  if (!isValidWorkingHoursRange(start, end)) {
    return { ok: false, error: 'End must be after start.' }
  }
  return {
    ok: true,
    workStart: start,
    workEnd: end,
    timezone: browserTimeZone(),
  }
}

export function getWorkingHoursStatus(
  person: Pick<Person, 'workStart' | 'workEnd' | 'timezone' | 'stateCode'>,
  now: Date = new Date(),
): WorkingHoursSnapshot | null {
  const start = normalizeWorkTime(person.workStart)
  const end = normalizeWorkTime(person.workEnd)
  if (!start || !end) return null
  if (!isValidWorkingHoursRange(start, end)) return null

  const timeZone = resolveHelperTimeZone(person)
  if (!timeZone) return null

  const nowMinutes = minutesInTimeZone(now, timeZone)
  if (nowMinutes == null) return null

  const startMinutes = workTimeToMinutes(start)
  const endMinutes = workTimeToMinutes(end)
  if (startMinutes == null || endMinutes == null) return null

  const available = nowMinutes >= startMinutes && nowMinutes < endMinutes
  const startLabel = formatWorkTimeLabel(start)
  const endLabel = formatWorkTimeLabel(end)

  if (available) {
    return {
      status: 'available',
      label: 'Available',
      detail: `Available until ${endLabel}`,
      untilLabel: endLabel,
      fromLabel: null,
    }
  }

  return {
    status: 'unavailable',
    label: 'Unavailable',
    detail: `Available from ${startLabel}`,
    untilLabel: null,
    fromLabel: startLabel,
  }
}
