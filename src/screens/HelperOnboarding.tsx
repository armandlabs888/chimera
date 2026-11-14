'use client'

import { MapPin } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  UsCityCombobox,
  type UsCityComboboxHandle,
} from '@/components/onboarding/UsCityCombobox'
import { Avatar, Button, InlineBanner } from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import { CategorySelect } from '@/components/CategorySelect'
import { normalizeOtherCustom, type ServiceCategoryId } from '@/lib/taxonomy'
import { uploadBeamMedia } from '@/lib/beam/storageUpload'
import { createClient } from '@/lib/supabase/client'
import {
  loadUsPlacesIndex,
  nearestUsCity,
  searchUsCities,
  type UsCity,
} from '@/lib/usPlaces'
import type { AvailabilitySlot, RateType } from '@/types'
import { HelperUrgentSmsSettings } from '@/components/account/HelperUrgentSmsSettings'
import '@/components/account/account-hc.css'

const SLOTS: { id: AvailabilitySlot; label: string }[] = [
  { id: 'mornings', label: 'Mornings' },
  { id: 'afternoons', label: 'Afternoons' },
  { id: 'evenings', label: 'Evenings' },
  { id: 'weekends', label: 'Weekends' },
]

const RADIUS_OPTIONS = [3, 5, 10, 15, 25] as const

const inputClass = 'account-hc-input'

const labelClass = 'account-hc-label'

export function HelperOnboarding() {
  const { currentUser, updateProfile, mode, authUser, ready } = useBeam()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const cityRef = useRef<UsCityComboboxHandle>(null)
  const hydratedCityRef = useRef(false)

  const [avatar, setAvatar] = useState(currentUser.avatar || '')
  const [name, setName] = useState(currentUser.name || '')
  const [bio, setBio] = useState(currentUser.bio || '')
  const [skills, setSkills] = useState<ServiceCategoryId[]>(
    (currentUser.skills ?? []).filter((s): s is ServiceCategoryId =>
      ['house-cleaning','carpet-cleaning','auto-detailing','junk-removal','pet-sitting','grooming','other'].includes(s),
    ),
  )
  const [otherSkillLabel, setOtherSkillLabel] = useState(currentUser.otherSkillLabel ?? '')
  const [otherError, setOtherError] = useState('')
  const [city, setCity] = useState<UsCity | null>(null)
  const [customLocationLabel, setCustomLocationLabel] = useState('')
  const [lat, setLat] = useState<number | null>(currentUser.lat ?? null)
  const [lng, setLng] = useState<number | null>(currentUser.lng ?? null)
  const [serviceRadiusMiles, setServiceRadiusMiles] = useState(
    currentUser.serviceRadiusMiles ?? 5,
  )
  const [rateType, setRateType] = useState<RateType>(currentUser.rateType ?? 'hourly')
  const [hourlyRate, setHourlyRate] = useState(
    currentUser.hourlyRate && currentUser.hourlyRate > 0
      ? String(currentUser.hourlyRate)
      : '35',
  )
  const [availableNow, setAvailableNow] = useState(Boolean(currentUser.availableNow))
  const [availability, setAvailability] = useState<AvailabilitySlot[]>(
    currentUser.availability ?? [],
  )
  const [detecting, setDetecting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!ready || hydratedCityRef.current) return
    hydratedCityRef.current = true

    const savedCity = currentUser.city
    const savedState = currentUser.stateCode
    const savedLabel = (currentUser.locationLabel || '').trim()

    void loadUsPlacesIndex()
      .then(() => {
        if (savedCity && savedState) {
          const q = `${savedCity}, ${savedState}`
          const results = searchUsCities(q, 8)
          const match =
            results.find(
              (c) =>
                c.name.toLowerCase() === savedCity.toLowerCase() &&
                c.stateCode.toUpperCase() === savedState.toUpperCase(),
            ) ??
            results.find((c) => c.label.toLowerCase() === q.toLowerCase()) ??
            null
          if (match) {
            setCity(match)
            setLat(match.lat)
            setLng(match.lng)
            return
          }
        }

        if (savedLabel) {
          const results = searchUsCities(savedLabel, 8)
          const match =
            results.find((c) => c.label.toLowerCase() === savedLabel.toLowerCase()) ??
            results.find(
              (c) =>
                savedLabel.toLowerCase().startsWith(c.name.toLowerCase()) &&
                savedLabel.toUpperCase().includes(c.stateCode),
            ) ??
            null
          if (match) {
            setCity(match)
            setLat(match.lat)
            setLng(match.lng)
          } else {
            setCustomLocationLabel(savedLabel)
          }
        }
      })
      .catch(() => {
        if (savedLabel) setCustomLocationLabel(savedLabel)
      })
  }, [
    ready,
    currentUser.city,
    currentUser.stateCode,
    currentUser.locationLabel,
  ])

  function toggleSkill(id: ServiceCategoryId) {
    setSkills((prev) => {
      const next = prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
      if (!next.includes('other')) {
        setOtherSkillLabel('')
        setOtherError('')
      }
      return next
    })
  }

  function toggleSlot(slot: AvailabilitySlot) {
    setAvailability((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot],
    )
  }

  function handleCityChange(next: UsCity | null) {
    setCity(next)
    if (next) {
      setCustomLocationLabel('')
      setLat(next.lat)
      setLng(next.lng)
      setError('')
    }
  }

  async function onPickPhoto(file: File | null) {
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const supabase = mode === 'live' ? createClient() : null
      const url = await uploadBeamMedia({
        mode: mode === 'live' ? 'live' : 'demo',
        supabase,
        userId: authUser?.id ?? currentUser.id,
        file,
      })
      setAvatar(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload photo')
    } finally {
      setUploading(false)
    }
  }

  async function detectMyLocation() {
    if (!navigator.geolocation) {
      setError('Location is not available in this browser.')
      return
    }
    setDetecting(true)
    setError('')
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 }),
      )
      setLat(pos.coords.latitude)
      setLng(pos.coords.longitude)

      await loadUsPlacesIndex()
      const nearest = nearestUsCity(pos.coords.latitude, pos.coords.longitude)
      if (nearest) {
        setCity(nearest)
        setCustomLocationLabel('')
        setLat(nearest.lat)
        setLng(nearest.lng)
        return
      }

      // Fall back to reverse geocode label if city list cannot resolve.
      const res = await fetch(
        `/api/geocode?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`,
      )
      if (res.ok) {
        const data = (await res.json()) as { label?: string }
        if (data.label) {
          const results = searchUsCities(data.label, 8)
          const match =
            results.find((c) => c.label.toLowerCase() === data.label!.toLowerCase()) ??
            results[0] ??
            null
          if (match) {
            setCity(match)
            setCustomLocationLabel('')
            setLat(match.lat)
            setLng(match.lng)
            return
          }
          setCity(null)
          setCustomLocationLabel(data.label)
          return
        }
      }
      if (!city && !customLocationLabel.trim()) {
        setCustomLocationLabel('Near me')
      }
    } catch {
      setError('Could not detect your location. Select a city instead.')
    } finally {
      setDetecting(false)
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Add a display name so neighbors know who you are.')
      return
    }
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

    const resolvedCity = city ?? cityRef.current?.tryCommitQuery() ?? null
    if (resolvedCity && !city) setCity(resolvedCity)

    const locationLabel = resolvedCity
      ? `${resolvedCity.name}, ${resolvedCity.stateCode}`
      : customLocationLabel.trim()

    if (!locationLabel) {
      setError('Select a city so requesters know your area.')
      cityRef.current?.focusAndOpen()
      return
    }

    const rateNum = Number(hourlyRate)
    if (rateType === 'hourly' && (!Number.isFinite(rateNum) || rateNum < 10)) {
      setError('Hourly rate should be at least $10.')
      return
    }

    setPending(true)
    setError('')
    updateProfile({
      name: trimmedName,
      bio: bio.trim(),
      avatar: avatar || currentUser.avatar,
      skills,
      otherSkillLabel: otherLabel,
      locationLabel,
      city: resolvedCity?.name ?? currentUser.city ?? null,
      stateCode: resolvedCity?.stateCode ?? currentUser.stateCode ?? null,
      lat: resolvedCity?.lat ?? lat,
      lng: resolvedCity?.lng ?? lng,
      serviceRadiusMiles,
      rateType,
      hourlyRate: rateType === 'hourly' ? rateNum : 0,
      availableNow,
      availability,
      isHelper: true,
    })
    router.push('/browse')
  }

  const editing = Boolean(currentUser.isHelper)
  const photoLabel = avatar ? 'Change photo' : 'Upload photo'

  return (
    <div className="account-hc" data-testid="helper-onboarding-root">
      <div className="account-hc-wrap account-hc-page">
        <div className="account-hc-title-row account-hc-form-narrow">
          <div>
            <Link
              href="/browse"
              className="account-hc-back-link"
              data-testid="helper-onboarding-back"
            >
              ← Back to browse
            </Link>
            <h1 className="account-hc-hero-title">
              {editing ? 'Edit helper profile' : 'Set up your helper profile'}
            </h1>
            <p className="account-hc-hero-sub">
              Choose the tasks you take, your service area, and your rate.
            </p>
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="account-hc-card account-hc-form-card"
          data-testid="helper-onboarding-form"
          noValidate
        >
          {error ? (
            <div className="mb-2">
              <InlineBanner tone="error">{error}</InlineBanner>
            </div>
          ) : null}

          <section aria-labelledby="helper-section-profile">
            <h2 id="helper-section-profile" className="sr-only">
              Profile
            </h2>

            <div className="account-hc-photo-row">
              <div className="shrink-0 overflow-hidden rounded-full">
                <Avatar src={avatar || undefined} name={name || currentUser.name || 'You'} size={64} />
              </div>
              <div className="min-w-0 flex-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="rounded-[10px] border border-[#E3E8EF] bg-white shadow-none"
                  loading={uploading}
                  onClick={() => fileRef.current?.click()}
                  data-testid="helper-upload-photo"
                >
                  {photoLabel}
                </Button>
                <p className="hint-line">Clear face photo helps neighbors recognize you.</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => void onPickPhoto(e.target.files?.[0] ?? null)}
              />
            </div>

            <div className="account-hc-field">
              <label htmlFor="helper-display-name" className={labelClass}>
                Display name
              </label>
              <input
                id="helper-display-name"
                name="displayName"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={80}
                placeholder="Alex Rivera"
                className={inputClass}
                data-testid="helper-display-name"
              />
            </div>

            <div className="account-hc-field">
              <label htmlFor="helper-bio" className={labelClass}>
                Short bio <span className="account-hc-hint">(optional)</span>
              </label>
              <textarea
                id="helper-bio"
                name="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                maxLength={400}
                placeholder="Experienced with apartment moves, furniture assembly, and deliveries..."
                className="account-hc-textarea"
                data-testid="helper-bio"
              />
            </div>
          </section>

          <hr className="account-hc-divider" />

          <section aria-labelledby="helper-section-skills">
            <h2 id="helper-section-skills" className="account-hc-section-label">
              What tasks do you take?
            </h2>
            <div data-testid="helper-skills-grid">
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
                testIdPrefix="helper-skill"
              />
            </div>
          </section>

          <hr className="account-hc-divider" />

          <section aria-labelledby="helper-section-area">
            <h2 id="helper-section-area" className="sr-only">
              Service area
            </h2>

            <div>
              <UsCityCombobox
                ref={cityRef}
                value={city}
                onChange={handleCityChange}
                error={
                  error && !city && !customLocationLabel
                    ? 'Select a city so requesters know your area.'
                    : undefined
                }
              />
              {!city && customLocationLabel ? (
                <p
                  className="mt-2 text-[13px] text-[#48556A]"
                  data-testid="helper-custom-location"
                >
                  Using detected location:{' '}
                  <span className="font-medium text-[#071330]">{customLocationLabel}</span>
                  {' · '}
                  <button
                    type="button"
                    className="font-semibold text-[#1D5CE5] hover:underline"
                    onClick={() => {
                      setCustomLocationLabel('')
                      cityRef.current?.focusAndOpen()
                    }}
                  >
                    Choose a city instead
                  </button>
                </p>
              ) : null}
              {!city ? (
                <button
                  type="button"
                  onClick={() => void detectMyLocation()}
                  disabled={detecting}
                  className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#1D5CE5] transition hover:text-[#1649BD] disabled:opacity-50"
                  data-testid="helper-use-location"
                >
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  {detecting ? 'Finding…' : 'Use current location'}
                </button>
              ) : null}
            </div>

            <div className="account-hc-field">
              <p className={labelClass}>Travel radius</p>
              <div
                className="account-hc-choice-row"
                role="radiogroup"
                aria-label="Travel radius"
                data-testid="helper-radius-group"
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
          </section>

          <hr className="account-hc-divider" />

          <section aria-labelledby="helper-section-rate">
            <h2 id="helper-section-rate" className="sr-only">
              Rate and availability
            </h2>

            <div>
              <p className={labelClass}>Rate</p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div
                  className="account-hc-seg"
                  role="radiogroup"
                  aria-label="Rate type"
                  data-testid="helper-rate-type"
                >
                  {(
                    [
                      ['hourly', 'Hourly rate'],
                      ['quote', 'Quote per task'],
                    ] as const
                  ).map(([id, label]) => {
                    const on = rateType === id
                    return (
                      <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setRateType(id)}
                        className={on ? 'is-on' : undefined}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>

                {rateType === 'hourly' ? (
                  <div className="account-hc-rate-input" data-testid="helper-hourly-rate">
                    <span className="pre" aria-hidden>
                      $
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={hourlyRate}
                      onChange={(e) =>
                        setHourlyRate(e.target.value.replace(/[^\d]/g, '').slice(0, 4))
                      }
                      aria-label="Hourly rate in USD"
                    />
                    <span className="post" aria-hidden>
                      / hr
                    </span>
                  </div>
                ) : (
                  <p className="text-[13.5px] leading-[1.45] text-[#48556A] sm:max-w-[240px] sm:text-right">
                    Neighbors will describe the task and ask for your price.
                  </p>
                )}
              </div>
            </div>

            <div className="account-hc-toggle-row">
              <div className="min-w-0">
                <p className="lbl">Available for same-day tasks</p>
                <p className="hint-line">Show an Available badge on your profile today</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={availableNow}
                onClick={() => setAvailableNow((v) => !v)}
                data-testid="helper-available-now"
                className="account-hc-switch"
              >
                <span className="knob" />
              </button>
            </div>

            <div className="account-hc-field">
              <p className={labelClass}>
                Typical schedule <span className="account-hc-hint">(optional)</span>
              </p>
              <div className="account-hc-choice-row" data-testid="helper-availability-slots">
                {SLOTS.map((slot) => {
                  const on = availability.includes(slot.id)
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleSlot(slot.id)}
                      className={`account-hc-choice ${on ? 'is-on' : ''}`}
                    >
                      {slot.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </section>

          <hr className="account-hc-divider" />

          <div className="account-hc-form-actions">
            <Link
              href="/browse"
              className="account-hc-btn account-hc-btn-ghost account-hc-btn-lg"
              data-testid="helper-onboarding-cancel"
            >
              {editing ? 'Cancel' : 'Skip for now'}
            </Link>
            <Button
              type="submit"
              size="lg"
              loading={pending}
              className="account-hc-btn account-hc-btn-lg h-[52px] rounded-[10px] bg-[#1D5CE5] px-7 text-white shadow-none hover:bg-[#1649BD] sm:min-w-[220px]"
              data-testid="helper-onboarding-submit"
            >
              {editing ? 'Save helper profile' : 'Publish helper profile'}
            </Button>
          </div>
        </form>

        {mode === 'live' && authUser ? (
          <div className="account-hc-form-narrow mt-4">
            <HelperUrgentSmsSettings userId={authUser.id} />
          </div>
        ) : null}
      </div>
    </div>
  )
}
