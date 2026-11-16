/**
 * Infer a concrete local schedule from free-text task prompts for AI draft.
 * Returns ASAP when the text does not imply a specific day/time.
 */

import {
  buildWhenLabel,
  formatTimeInput,
  localDateISO,
  type ClockTime,
} from '@/lib/listingSchedule'
import type { WhenOption } from '@/types'

export type DraftSchedule = {
  when: WhenOption
  whenLabel: string
  scheduledDate?: string
  startTime?: string
}

const WEEKDAYS: Array<{ name: string; dow: number }> = [
  { name: 'sunday', dow: 0 },
  { name: 'monday', dow: 1 },
  { name: 'tuesday', dow: 2 },
  { name: 'wednesday', dow: 3 },
  { name: 'thursday', dow: 4 },
  { name: 'friday', dow: 5 },
  { name: 'saturday', dow: 6 },
]

function clock(hours: number, minutes = 0): ClockTime {
  return { hours, minutes }
}

/** Parse explicit clock phrases like 3pm, 3:30 pm, 15:00. */
function parseExplicitTime(text: string): ClockTime | null {
  const twelve = /\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b/i.exec(text)
  if (twelve) {
    let hours = Number(twelve[1])
    const minutes = twelve[2] ? Number(twelve[2]) : 0
    const meridiem = twelve[3].toLowerCase().replace(/\./g, '')
    if (!Number.isFinite(hours) || hours < 1 || hours > 12) return null
    if (!Number.isFinite(minutes) || minutes < 0 || minutes > 59) return null
    if (meridiem.startsWith('p') && hours < 12) hours += 12
    if (meridiem.startsWith('a') && hours === 12) hours = 0
    return clock(hours, minutes)
  }
  const twentyFour = /\b([01]?\d|2[0-3]):([0-5]\d)\b/.exec(text)
  if (twentyFour) {
    return clock(Number(twentyFour[1]), Number(twentyFour[2]))
  }
  return null
}

function timeOfDay(text: string): ClockTime {
  const explicit = parseExplicitTime(text)
  if (explicit) return explicit
  if (/\b(morning)\b/.test(text)) return clock(9)
  if (/\b(noon|midday)\b/.test(text)) return clock(12)
  if (/\b(afternoon)\b/.test(text)) return clock(13)
  if (/\b(evening|tonight|night)\b/.test(text)) return clock(18)
  return clock(14)
}

function nextDowOnOrAfter(from: Date, dow: number, start: ClockTime): Date {
  const candidate = new Date(from)
  candidate.setHours(12, 0, 0, 0)
  let delta = (dow - candidate.getDay() + 7) % 7
  candidate.setDate(candidate.getDate() + delta)
  const startAt = new Date(candidate)
  startAt.setHours(start.hours, start.minutes, 0, 0)
  if (startAt.getTime() < from.getTime() - 60_000) {
    candidate.setDate(candidate.getDate() + 7)
  }
  return candidate
}

function scheduledResult(date: Date, start: ClockTime): DraftSchedule {
  const dateISO = localDateISO(date)
  return {
    when: 'scheduled',
    whenLabel: buildWhenLabel({
      when: 'scheduled',
      dateISO,
      start,
      end: null,
    }),
    scheduledDate: dateISO,
    startTime: formatTimeInput(start),
  }
}

/**
 * Map free text to ASAP or a concrete local date + start time.
 * Examples: "Saturday afternoon" → next Saturday 1:00 PM;
 * "tomorrow morning" → tomorrow 9:00 AM.
 */
export function inferDraftSchedule(prompt: string, now = new Date()): DraftSchedule {
  const t = prompt.toLowerCase().replace(/\s+/g, ' ').trim()
  if (!t) {
    return { when: 'asap', whenLabel: 'As soon as possible' }
  }

  const start = timeOfDay(t)

  if (/\btomorrow\b/.test(t)) {
    const date = new Date(now)
    date.setDate(date.getDate() + 1)
    return scheduledResult(date, start)
  }

  for (const day of WEEKDAYS) {
    if (new RegExp(`\\b${day.name}\\b`).test(t)) {
      const date = nextDowOnOrAfter(now, day.dow, start)
      return scheduledResult(date, start)
    }
  }

  if (/\b(this weekend|next weekend)\b/.test(t)) {
    const date = nextDowOnOrAfter(now, 6, start)
    return scheduledResult(date, start)
  }

  if (/\bnext week\b/.test(t)) {
    const mondayStart = start.hours === 14 && !parseExplicitTime(t) ? clock(9) : start
    const weekOut = new Date(now)
    weekOut.setDate(weekOut.getDate() + 7)
    weekOut.setHours(12, 0, 0, 0)
    const dow = weekOut.getDay()
    weekOut.setDate(weekOut.getDate() + (dow === 0 ? -6 : 1 - dow))
    return scheduledResult(weekOut, mondayStart)
  }

  // Concrete calendar day like 11/20 or 11/20/2026
  const slash = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/.exec(t)
  if (slash) {
    const month = Number(slash[1])
    const day = Number(slash[2])
    let year = slash[3] ? Number(slash[3]) : now.getFullYear()
    if (year < 100) year += 2000
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      let date = new Date(year, month - 1, day, 12, 0, 0, 0)
      const startAt = new Date(date)
      startAt.setHours(start.hours, start.minutes, 0, 0)
      if (startAt.getTime() < now.getTime() - 60_000) {
        date = new Date(year + 1, month - 1, day, 12, 0, 0, 0)
      }
      return scheduledResult(date, start)
    }
  }

  // "today" / "this morning|afternoon|evening" with a daypart → schedule today if still ahead
  if (
    /\b(today|this morning|this afternoon|this evening|tonight)\b/.test(t) ||
    (/\b(morning|afternoon|evening)\b/.test(t) && !/\b(asap|right away|urgent)\b/.test(t))
  ) {
    const startAt = new Date(now)
    startAt.setHours(start.hours, start.minutes, 0, 0)
    if (startAt.getTime() >= now.getTime() - 60_000) {
      return scheduledResult(new Date(now), start)
    }
  }

  return { when: 'asap', whenLabel: 'As soon as possible' }
}
