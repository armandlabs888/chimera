'use client'

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
 */
export function HelperAvailabilityStatus({
  person,
  className = '',
  showDetail = false,
  testId = 'helper-availability-status',
}: {
  person: HelperAvailabilityPerson
  className?: string
  /** When true, append "until/from" detail (profile page). */
  showDetail?: boolean
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
  const title = snapshot.detail ?? snapshot.label
  const primary =
    showDetail && snapshot.detail ? snapshot.detail : snapshot.label

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[12px] font-bold ${className}`}
      style={{ color: isAvailable ? '#1E8E3E' : '#C62828' }}
      title={title}
      data-testid={testId}
      data-status={snapshot.status}
    >
      <span
        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: isAvailable ? '#1E8E3E' : '#C62828' }}
        aria-hidden
      />
      <span>{primary}</span>
    </span>
  )
}
