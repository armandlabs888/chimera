'use client'

import type { RateType } from '@/types'

/** Editor rate options. Legacy DB `quote` maps to Hourly in the UI. */
export type EditorRateType = 'hourly' | 'flat'

export function toEditorRateType(rateType: RateType | undefined | null): EditorRateType {
  return rateType === 'flat' ? 'flat' : 'hourly'
}

type RateFieldsProps = {
  rateType: EditorRateType
  hourlyRate: string
  onChangeRateType: (next: EditorRateType) => void
  onChangeHourlyRate: (next: string) => void
  /** Visual variant matching the host form styles. */
  variant?: 'account' | 'edit'
  testIdPrefix?: string
}

export function RateFields({
  rateType,
  hourlyRate,
  onChangeRateType,
  onChangeHourlyRate,
  variant = 'account',
  testIdPrefix = 'helper-rate',
}: RateFieldsProps) {
  const suffix = rateType === 'flat' ? 'Flat Fee' : '/hr'
  const amountLabel = rateType === 'flat' ? 'Flat Fee in USD' : 'Hourly rate in USD'
  const segClass = variant === 'edit' ? 'ep-seg' : 'account-hc-seg'
  const rateInputClass =
    variant === 'edit' ? 'ep-rate-input' : 'account-hc-rate-input'
  const hintClass = variant === 'edit' ? 'ep-hint' : 'account-hc-hint'

  return (
    <div className="rate-fields" data-testid={`${testIdPrefix}-wrap`}>
      <div
        className={segClass}
        role="radiogroup"
        aria-label="Rate type"
        data-testid={`${testIdPrefix}-type`}
      >
        {(
          [
            ['hourly', 'Hourly'],
            ['flat', 'Flat Fee'],
          ] as const
        ).map(([id, label]) => {
          const on = rateType === id
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={on}
              className={on ? 'is-on' : undefined}
              onClick={() => onChangeRateType(id)}
              data-testid={`${testIdPrefix}-type-${id}`}
            >
              {label}
            </button>
          )
        })}
      </div>

      <div className={rateInputClass} data-testid={`${testIdPrefix}-amount`}>
        {variant === 'edit' ? (
          <label className="ep-rate-field">
            <span className="ep-rate-prefix" aria-hidden>
              $
            </span>
            <input
              className="ep-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={hourlyRate}
              onChange={(e) =>
                onChangeHourlyRate(e.target.value.replace(/[^\d]/g, '').slice(0, 4))
              }
              aria-label={amountLabel}
              placeholder="50"
            />
          </label>
        ) : (
          <>
            <span className="pre" aria-hidden>
              $
            </span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={hourlyRate}
              onChange={(e) =>
                onChangeHourlyRate(e.target.value.replace(/[^\d]/g, '').slice(0, 4))
              }
              aria-label={amountLabel}
              placeholder="50"
            />
          </>
        )}
        <span className={variant === 'edit' ? 'ep-meta' : 'post'} aria-hidden>
          {suffix}
        </span>
      </div>

      {rateType === 'flat' ? (
        <p className={hintClass} data-testid={`${testIdPrefix}-flat-hint`}>
          One price per job.
        </p>
      ) : null}
    </div>
  )
}
