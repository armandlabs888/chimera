'use client'

import type { Ref } from 'react'
import {
  formatWorkTimeLabel,
  isValidWorkingHoursRange,
  workTimeOptions,
  type WorkTimeValue,
} from '@/lib/workingHours'

export { workingHoursSavePayload } from '@/lib/workingHours'

const OPTIONS = workTimeOptions()

export function WorkingHoursFields({
  workStart,
  workEnd,
  onChangeStart,
  onChangeEnd,
  testIdPrefix = 'working-hours',
  className = '',
  error,
  startSelectRef,
}: {
  workStart: WorkTimeValue | ''
  workEnd: WorkTimeValue | ''
  onChangeStart: (value: WorkTimeValue | '') => void
  onChangeEnd: (value: WorkTimeValue | '') => void
  testIdPrefix?: string
  className?: string
  /** Submit-time validation message (also shown for live range issues). */
  error?: string
  startSelectRef?: Ref<HTMLSelectElement>
}) {
  const start = workStart || null
  const end = workEnd || null
  const bothEmpty = !start && !end
  const rangeInvalid =
    !bothEmpty && !isValidWorkingHoursRange(start || null, end || null)
  const missingOne = Boolean((start && !end) || (!start && end))
  const liveError = missingOne
    ? 'Choose both a start and end time, or clear both.'
    : rangeInvalid
      ? `End must be after start${start ? ` (${formatWorkTimeLabel(start)})` : ''}.`
      : ''
  const shownError = error || liveError
  const invalid = Boolean(shownError)

  return (
    <div className={className} data-testid={`${testIdPrefix}-fields`}>
      <p className="account-hc-label">
        Working hours <span className="account-hc-hint">(optional)</span>
      </p>
      <p className="mt-1 text-[13px] leading-[1.45] text-[#4A5568]">
        During these hours your profile shows as Available.
      </p>
      <div
        className="mt-2.5 grid grid-cols-2 gap-2.5"
        data-testid={`${testIdPrefix}-selects`}
      >
        <label className="min-w-0">
          <span className="mb-1.5 block text-[12px] font-semibold text-[#4A5568]">
            Start
          </span>
          <select
            ref={startSelectRef}
            className={`account-hc-select h-11 w-full${invalid ? ' is-error' : ''}`}
            value={workStart}
            onChange={(e) => onChangeStart(e.target.value as WorkTimeValue | '')}
            aria-label="Working hours start"
            aria-invalid={invalid || undefined}
            data-testid={`${testIdPrefix}-start`}
          >
            <option value="">Select</option>
            {OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-0">
          <span className="mb-1.5 block text-[12px] font-semibold text-[#4A5568]">
            End
          </span>
          <select
            className={`account-hc-select h-11 w-full${invalid ? ' is-error' : ''}`}
            value={workEnd}
            onChange={(e) => onChangeEnd(e.target.value as WorkTimeValue | '')}
            aria-label="Working hours end"
            aria-invalid={invalid || undefined}
            data-testid={`${testIdPrefix}-end`}
          >
            <option value="">Select</option>
            {OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {shownError ? (
        <p
          className="account-hc-field-error"
          role="alert"
          data-testid={`${testIdPrefix}-error`}
        >
          {shownError}
        </p>
      ) : null}
    </div>
  )
}
