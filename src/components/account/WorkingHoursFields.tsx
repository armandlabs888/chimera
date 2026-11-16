'use client'

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
}: {
  workStart: WorkTimeValue | ''
  workEnd: WorkTimeValue | ''
  onChangeStart: (value: WorkTimeValue | '') => void
  onChangeEnd: (value: WorkTimeValue | '') => void
  testIdPrefix?: string
  className?: string
}) {
  const start = workStart || null
  const end = workEnd || null
  const bothEmpty = !start && !end
  const rangeInvalid =
    !bothEmpty && !isValidWorkingHoursRange(start || null, end || null)
  const missingOne = Boolean((start && !end) || (!start && end))

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
            className="account-hc-input h-11 w-full"
            value={workStart}
            onChange={(e) => onChangeStart(e.target.value as WorkTimeValue | '')}
            aria-label="Working hours start"
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
            className="account-hc-input h-11 w-full"
            value={workEnd}
            onChange={(e) => onChangeEnd(e.target.value as WorkTimeValue | '')}
            aria-label="Working hours end"
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
      {rangeInvalid || missingOne ? (
        <p
          className="mt-2 text-[13px] font-semibold leading-[1.4]"
          style={{ color: '#C62828' }}
          role="alert"
          data-testid={`${testIdPrefix}-error`}
        >
          {missingOne
            ? 'Choose both a start and end time, or clear both.'
            : `End must be after start${start ? ` (${formatWorkTimeLabel(start)})` : ''}.`}
        </p>
      ) : null}
    </div>
  )
}
