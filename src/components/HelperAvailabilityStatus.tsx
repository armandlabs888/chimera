'use client'

import { Clock } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  getWorkingHoursStatus,
  type WorkingHoursSnapshot,
} from '@/lib/workingHours'
import type { Person } from '@/types'

type HelperAvailabilityPerson = Pick<
  Person,
  'workStart' | 'workEnd' | 'timezone' | 'stateCode'
>

function readSnapshot(person: HelperAvailabilityPerson): WorkingHoursSnapshot | null {
  return getWorkingHoursStatus(person)
}

/**
 * Live Available / Unavailable indicator from helper working hours.
 * Renders nothing when hours are unset. Updates on focus and each minute.
 *
 * - `inline` (default): short chip next to a name ("Available" / "Unavailable").
 * - `line`: full third-line profile treatment with status word + working hours + TZ.
 */
export function HelperAvailabilityStatus({
  person,
  className = '',
  variant = 'inline',
  testId = 'helper-availability-status',
}: {
  person: HelperAvailabilityPerson
  className?: string
  variant?: 'inline' | 'line'
  testId?: string
}) {
  const [snapshot, setSnapshot] = useState<WorkingHoursSnapshot | null>(() =>
    readSnapshot(person),
  )

  const workStart = person.workStart
  const workEnd = person.workEnd
  const timezone = person.timezone
  const stateCode = person.stateCode

  useEffect(() => {
    const nextPerson = { workStart, workEnd, timezone, stateCode }
    function refresh() {
      setSnapshot(readSnapshot(nextPerson))
    }
    refresh()
    const interval = window.setInterval(refresh, 60_000)
    function onFocus() {
      refresh()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [workStart, workEnd, timezone, stateCode])

  if (!snapshot) return null

  const isAvailable = snapshot.status === 'available'
  const statusColor = isAvailable ? '#1E8E3E' : '#C62828'
  const title = `${snapshot.statusWord} · ${snapshot.hoursLabel}`

  if (variant === 'line') {
    return (
      <p
        className={`flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] leading-[1.35] text-[#4A5568] sm:text-[13.5px] ${className}`}
        title={title}
        data-testid={testId}
        data-status={snapshot.status}
      >
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <span
            className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: statusColor }}
            aria-hidden
          />
          <span className="font-semibold" style={{ color: statusColor, fontWeight: 600 }}>
            {snapshot.statusWord}
          </span>
        </span>
        <span aria-hidden className="text-[#4A5568]">
          ·
        </span>
        <span className="inline-flex min-w-0 items-center gap-1 font-normal text-[#4A5568]">
          <Clock
            className="h-3.5 w-3.5 shrink-0 text-[#5B6576]"
            strokeWidth={2.25}
            aria-hidden
          />
          <span>{snapshot.hoursLabel}</span>
        </span>
      </p>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[12px] font-bold ${className}`}
      style={{ color: statusColor }}
      title={title}
      data-testid={testId}
      data-status={snapshot.status}
    >
      <span
        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: statusColor }}
        aria-hidden
      />
      <span>{snapshot.label}</span>
    </span>
  )
}
