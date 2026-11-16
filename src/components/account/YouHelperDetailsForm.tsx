'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { CategorySelect } from '@/components/CategorySelect'
import {
  WorkingHoursFields,
  workingHoursSavePayload,
} from '@/components/account/WorkingHoursFields'
import { Button, InlineBanner } from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import { normalizeWorkTime } from '@/lib/workingHours'
import { normalizeOtherCustom, type ServiceCategoryId } from '@/lib/taxonomy'
import '@/components/account/account-hc.css'

const RADIUS_OPTIONS = [3, 5, 10, 15, 25] as const

const SERVICE_IDS: ServiceCategoryId[] = [
  'house-cleaning',
  'carpet-cleaning',
  'auto-detailing',
  'junk-removal',
  'pet-sitting',
  'grooming',
  'other',
]

export function YouHelperDetailsForm() {
  const { currentUser, updateProfile } = useBeam()
  const [skills, setSkills] = useState<ServiceCategoryId[]>(
    (currentUser.skills ?? []).filter((s): s is ServiceCategoryId =>
      SERVICE_IDS.includes(s as ServiceCategoryId),
    ),
  )
  const [otherSkillLabel, setOtherSkillLabel] = useState(currentUser.otherSkillLabel ?? '')
  const [otherError, setOtherError] = useState('')
  const [serviceRadiusMiles, setServiceRadiusMiles] = useState(
    currentUser.serviceRadiusMiles ?? 5,
  )
  const [hourlyRate, setHourlyRate] = useState(
    currentUser.hourlyRate && currentUser.hourlyRate > 0
      ? String(currentUser.hourlyRate)
      : '',
  )
  const [availableNow, setAvailableNow] = useState(Boolean(currentUser.availableNow))
  const [workStart, setWorkStart] = useState(normalizeWorkTime(currentUser.workStart) ?? '')
  const [workEnd, setWorkEnd] = useState(normalizeWorkTime(currentUser.workEnd) ?? '')
  const [pending, setPending] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setSkills(
      (currentUser.skills ?? []).filter((s): s is ServiceCategoryId =>
        SERVICE_IDS.includes(s as ServiceCategoryId),
      ),
    )
    setOtherSkillLabel(currentUser.otherSkillLabel ?? '')
    setServiceRadiusMiles(currentUser.serviceRadiusMiles ?? 5)
    setHourlyRate(
      currentUser.hourlyRate && currentUser.hourlyRate > 0
        ? String(currentUser.hourlyRate)
        : '',
    )
    setAvailableNow(Boolean(currentUser.availableNow))
    setWorkStart(normalizeWorkTime(currentUser.workStart) ?? '')
    setWorkEnd(normalizeWorkTime(currentUser.workEnd) ?? '')
  }, [
    currentUser.skills,
    currentUser.otherSkillLabel,
    currentUser.serviceRadiusMiles,
    currentUser.hourlyRate,
    currentUser.availableNow,
    currentUser.workStart,
    currentUser.workEnd,
  ])

  function toggleSkill(id: ServiceCategoryId) {
    setSkills((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
    if (id === 'other') setOtherError('')
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (skills.length < 1) {
      setError('Pick at least one skill so we can match you to open requests.')
      return
    }
    let otherLabel: string | null = null
    if (skills.includes('other')) {
      const normalized = normalizeOtherCustom(otherSkillLabel)
      if (!normalized.ok) {
        setOtherError(normalized.error)
        setError(normalized.error)
        return
      }
      otherLabel = normalized.value
    }
    const rateNum = Number(hourlyRate)
    if (!Number.isFinite(rateNum) || rateNum < 10) {
      setError('Hourly rate should be at least $10.')
      return
    }

    const hours = workingHoursSavePayload(workStart, workEnd)
    if (!hours.ok) {
      setError(hours.error)
      return
    }

    setPending(true)
    setError('')
    updateProfile({
      skills,
      otherSkillLabel: otherLabel,
      serviceRadiusMiles,
      rateType: 'hourly',
      hourlyRate: rateNum,
      availableNow,
      workStart: hours.workStart,
      workEnd: hours.workEnd,
      timezone: hours.timezone ?? currentUser.timezone ?? null,
      isHelper: true,
    })
    setPending(false)
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 1800)
  }

  return (
    <form
      onSubmit={onSubmit}
      className="account-hc-card account-hc-form-card"
      data-testid="you-helper-form"
      noValidate
    >
      {error ? (
        <div className="mb-2">
          <InlineBanner tone="error">{error}</InlineBanner>
        </div>
      ) : null}
      {savedFlash ? (
        <div className="mb-2">
          <InlineBanner tone="success">Helper profile saved.</InlineBanner>
        </div>
      ) : null}

      <div className="account-hc-field">
        <p className="account-hc-label">Services</p>
        <div data-testid="you-helper-skills">
          <CategorySelect
            mode="multi"
            serviceId={skills[0] ?? null}
            selectedSkills={skills}
            onToggleSkill={toggleSkill}
            customLabel={otherSkillLabel}
            onServiceChange={() => {}}
            onCustomChange={(v) => {
              setOtherSkillLabel(v)
              setOtherError('')
            }}
            customError={otherError}
            testIdPrefix="you-helper-skill"
          />
        </div>
      </div>

      <div className="account-hc-field">
        <p className="account-hc-label">Travel radius</p>
        <div
          className="account-hc-choice-row"
          role="radiogroup"
          aria-label="Travel radius"
          data-testid="you-helper-radius"
        >
          {RADIUS_OPTIONS.map((miles) => {
            const on = serviceRadiusMiles === miles
            return (
              <button
                key={miles}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setServiceRadiusMiles(miles)}
                className={`account-hc-choice ${on ? 'is-on' : ''}`}
              >
                {miles} mi
              </button>
            )
          })}
        </div>
      </div>

      <div className="account-hc-field">
        <p className="account-hc-label">Rate</p>
        <label className="account-hc-rate-input" data-testid="you-helper-hourly-rate">
          <span className="pre" aria-hidden>
            $
          </span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value.replace(/[^\d]/g, '').slice(0, 4))}
            aria-label="Hourly rate in USD"
            placeholder="50"
          />
          <span className="post" aria-hidden>
            / hr
          </span>
        </label>
      </div>

      <div className="account-hc-field">
        <div className="account-hc-toggle-row" style={{ marginTop: 0 }}>
          <div className="min-w-0">
            <p className="lbl">Available for same-day tasks</p>
            <p className="hint-line">Show an Available badge on your profile today</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={availableNow}
            aria-label="Available now"
            onClick={() => setAvailableNow((v) => !v)}
            data-testid="you-helper-available-now"
            className="account-hc-switch"
          >
            <span className="knob" />
          </button>
        </div>
      </div>

      <div className="account-hc-field">
        <WorkingHoursFields
          workStart={workStart}
          workEnd={workEnd}
          onChangeStart={setWorkStart}
          onChangeEnd={setWorkEnd}
          testIdPrefix="you-helper-hours"
        />
      </div>

      <Button
        type="submit"
        size="lg"
        loading={pending}
        className="mt-[22px] h-12 rounded-[10px] bg-[#1D5CE5] px-7 text-[15px] text-white shadow-none hover:bg-[#1649BD]"
        data-testid="you-save-helper"
      >
        Save helper profile
      </Button>
    </form>
  )
}
