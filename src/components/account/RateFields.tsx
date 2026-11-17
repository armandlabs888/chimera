'use client'

import type { Ref } from 'react'
import type { RateType } from '@/types'

/** Editor rate options. Legacy DB `quote` maps to Hourly in the UI. */
export type EditorRateType = 'hourly' | 'flat'

export function toEditorRateType(rateType: RateType | undefined | null): EditorRateType {
  return rateType === 'flat' ? 'flat' : 'hourly'
}

/** Validation copy for empty vs below-minimum rate. */
export function rateValidationMessage(
  hourlyRate: string,
  rateType: EditorRateType,
): string | null {
  if (!hourlyRate.trim()) {
    return rateType === 'flat' ? 'Enter your flat fee.' : 'Enter your hourly rate.'
  }
  const rateNum = Number(hourlyRate)
  if (!Number.isFinite(rateNum) || rateNum < 10) {
    return rateType === 'flat'
      ? 'Flat Fee should be at least $10.'
      : 'Hourly rate should be at least $10.'
  }
  return null
}

type RateFieldsProps = {
  rateType: EditorRateType
  hourlyRate: string
  onChangeRateType: (next: EditorRateType) => void
  onChangeHourlyRate: (next: string) => void
  /** Visual variant matching the host form styles. */
  variant?: 'account' | 'edit'
  testIdPrefix?: string
  /** Inline validation message shown under the amount field. */
  error?: string
  /** Ref to the amount input for focus / scroll-into-view. */
  inputRef?: Ref<HTMLInputElement>
}

export function RateFields({
  rateType,
  hourlyRate,
  onChangeRateType,
  onChangeHourlyRate,
  variant = 'account',
  testIdPrefix = 'helper-rate',
  error,
  inputRef,
}: RateFieldsProps) {
  const suffix = rateType === 'flat' ? 'Flat Fee' : '/hr'
  const amountLabel = rateType === 'flat' ? 'Flat Fee in USD' : 'Hourly rate in USD'
  const segClass = variant === 'edit' ? 'ep-seg' : 'account-hc-seg'
  const rateInputClass =
    variant === 'edit' ? 'ep-rate-input' : 'account-hc-rate-input'
  const hintClass = variant === 'edit' ? 'ep-hint' : 'account-hc-hint'
  const errorId = `${testIdPrefix}-error`
  const invalid = Boolean(error)

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

      <div
        className={`${rateInputClass}${invalid && variant !== 'edit' ? ' is-error' : ''}`}
        data-testid={`${testIdPrefix}-amount`}
      >
        {variant === 'edit' ? (
          <label className="ep-rate-field">
            <span className="ep-rate-prefix" aria-hidden>
              $
            </span>
            <input
              ref={inputRef}
              className={`ep-input${invalid ? ' is-error' : ''}`}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={hourlyRate}
              onChange={(e) =>
                onChangeHourlyRate(e.target.value.replace(/[^\d]/g, '').slice(0, 4))
              }
              aria-label={amountLabel}
              aria-invalid={invalid || undefined}
              aria-describedby={invalid ? errorId : undefined}
              placeholder="Enter rate"
            />
          </label>
        ) : (
          <>
            <span className="pre" aria-hidden>
              $
            </span>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={hourlyRate}
              onChange={(e) =>
                onChangeHourlyRate(e.target.value.replace(/[^\d]/g, '').slice(0, 4))
              }
              aria-label={amountLabel}
              aria-invalid={invalid || undefined}
              aria-describedby={invalid ? errorId : undefined}
              placeholder="Enter rate"
            />
          </>
        )}
        <span className={variant === 'edit' ? 'ep-meta' : 'post'} aria-hidden>
          {suffix}
        </span>
      </div>

      {error ? (
        <p
          id={errorId}
          className={variant === 'edit' ? 'ep-field-error' : 'account-hc-field-error'}
          role="alert"
          data-testid={errorId}
        >
          {error}
        </p>
      ) : rateType === 'flat' ? (
        <p className={hintClass} data-testid={`${testIdPrefix}-flat-hint`}>
          One price per job.
        </p>
      ) : null}
    </div>
  )
}
