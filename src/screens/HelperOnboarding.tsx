'use client'

import { Check, MapPin } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  UsCityCombobox,
  type UsCityComboboxHandle,
} from '@/components/onboarding/UsCityCombobox'
import { Avatar, Button, InlineBanner } from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import { CATEGORIES } from '@/data/categories'
import { uploadBeamMedia } from '@/lib/beam/storageUpload'
import { CATEGORY_ICONS } from '@/lib/categoryIcons'
import { createClient } from '@/lib/supabase/client'
import {
  loadUsPlacesIndex,
  nearestUsCity,
  searchUsCities,
  type UsCity,
} from '@/lib/usPlaces'
import type { AvailabilitySlot, CategoryId, RateType } from '@/types'

const SLOTS: { id: AvailabilitySlot; label: string }[] = [
  { id: 'mornings', label: 'Mornings' },
  { id: 'afternoons', label: 'Afternoons' },
  { id: 'evenings', label: 'Evenings' },
  { id: 'weekends', label: 'Weekends' },
]

const RADIUS_OPTIONS = [3, 5, 10, 15, 25] as const

const inputClass =
  'h-12 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-[15px] text-[#071330] outline-none transition placeholder:text-[#94A3B8] hover:border-[#CBD5E1] focus:border-[#1D5CE5] focus-visible:ring-4 focus-visible:ring-[#1D5CE5]/15'

const labelClass = 'mb-2 block text-[13.5px] font-semibold text-[#071330]'

export function HelperOnboarding() {
  const { currentUser, updateProfile, mode, authUser, ready } = useBeam()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const cityRef = useRef<UsCityComboboxHandle>(null)
  const hydratedCityRef = useRef(false)

  const [avatar, setAvatar] = useState(currentUser.avatar || '')
  const [name, setName] = useState(currentUser.name || '')
  const [bio, setBio] = useState(currentUser.bio || '')
  const [skills, setSkills] = useState<CategoryId[]>(currentUser.skills ?? [])
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

  function toggleSkill(id: CategoryId) {
    setSkills((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
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
    <div className="py-2 sm:py-4" data-testid="helper-onboarding-root">
      <div className="mx-auto w-full max-w-[560px]">
        <Link
          href="/browse"
          className="inline-flex items-center text-[13.5px] font-medium text-[#64748B] transition hover:text-[#071330]"
          data-testid="helper-onboarding-back"
        >
          ← Back to browse
        </Link>

        <h1 className="mt-5 font-display text-[28px] font-bold leading-[1.15] tracking-[-0.025em] text-[#071330] sm:text-[32px]">
          {editing ? 'Edit helper profile' : 'Set up your helper profile'}
        </h1>
        <p className="mt-2 text-[15px] leading-[1.5] text-[#526077]">
          Choose the tasks you take, your service area, and your rate.
        </p>

        <form onSubmit={onSubmit} className="mt-8" data-testid="helper-onboarding-form" noValidate>
          {error ? (
            <div className="mb-6">
              <InlineBanner tone="error">{error}</InlineBanner>
            </div>
          ) : null}

          {/* 1. Profile */}
          <section className="space-y-5 pb-8" aria-labelledby="helper-section-profile">
            <h2 id="helper-section-profile" className="sr-only">
              Profile
            </h2>

            <div className="flex items-center gap-4">
              <div className="shrink-0 overflow-hidden rounded-full">
                <Avatar src={avatar || undefined} name={name || currentUser.name || 'You'} size={64} />
              </div>
              <div className="min-w-0 flex-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="rounded-full shadow-none"
                  loading={uploading}
                  onClick={() => fileRef.current?.click()}
                  data-testid="helper-upload-photo"
                >
                  {photoLabel}
                </Button>
                <p className="mt-1.5 text-[13px] leading-[1.45] text-[#64748B]">
                  Clear face photo helps neighbors recognize you.
                </p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => void onPickPhoto(e.target.files?.[0] ?? null)}
              />
            </div>

            <div>
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

            <div>
              <label htmlFor="helper-bio" className={labelClass}>
                Short bio{' '}
                <span className="font-normal text-[#64748B]">(optional)</span>
              </label>
              <textarea
                id="helper-bio"
                name="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                maxLength={400}
                placeholder="Experienced with apartment moves, furniture assembly, and deliveries…"
                className={`${inputClass} h-auto min-h-[96px] py-3`}
                data-testid="helper-bio"
              />
            </div>
          </section>

          <div className="border-t border-[#E2E8F0]" />

          {/* 2. Skills */}
          <section className="space-y-4 py-8" aria-labelledby="helper-section-skills">
            <div>
              <h2
                id="helper-section-skills"
                className="text-[13.5px] font-semibold text-[#071330]"
              >
                What tasks do you take?
              </h2>
            </div>
            <div
              className="grid grid-cols-2 gap-2.5 sm:grid-cols-3"
              data-testid="helper-skills-grid"
            >
              {CATEGORIES.map((c) => {
                const on = skills.includes(c.id)
                const Icon = CATEGORY_ICONS[c.id]
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleSkill(c.id)}
                    data-testid={`helper-skill-${c.id}`}
                    className={`relative flex min-h-[72px] flex-col items-start gap-2 rounded-xl border px-3.5 py-3 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1D5CE5]/25 ${
                      on
                        ? 'border-[#1D5CE5] bg-[#F5F9FF] text-[#071330] ring-1 ring-[#1D5CE5]/20'
                        : 'border-[#E2E8F0] bg-white text-[#475569] hover:border-[#CBD5E1] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <span className="flex w-full items-center justify-between gap-2">
                      <Icon
                        className={`h-[18px] w-[18px] ${on ? 'text-[#1D5CE5]' : 'text-[#64748B]'}`}
                        strokeWidth={1.9}
                        aria-hidden
                      />
                      {on ? (
                        <span
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#1D5CE5] text-white"
                          aria-hidden
                        >
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                      ) : null}
                    </span>
                    <span className="text-[13.5px] font-semibold leading-tight">{c.shortLabel}</span>
                  </button>
                )
              })}
            </div>
          </section>

          <div className="border-t border-[#E2E8F0]" />

          {/* 3. Service area */}
          <section className="space-y-5 py-8" aria-labelledby="helper-section-area">
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
                  className="mt-2 text-[13px] text-[#64748B]"
                  data-testid="helper-custom-location"
                >
                  Using detected location: <span className="font-medium text-[#071330]">{customLocationLabel}</span>
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

            <div>
              <p className={labelClass}>Travel radius</p>
              <div
                className="flex flex-wrap gap-2"
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
                      className={`rounded-full px-3.5 py-2 text-[13px] font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1D5CE5]/25 ${
                        on
                          ? 'border border-[#1D5CE5] bg-[#EEF4FF] text-[#1D5CE5]'
                          : 'border border-[#E2E8F0] bg-white text-[#475569] hover:border-[#CBD5E1]'
                      }`}
                    >
                      {miles} mi
                    </button>
                  )
                })}
              </div>
            </div>
          </section>

          <div className="border-t border-[#E2E8F0]" />

          {/* 4. Rate & availability */}
          <section className="space-y-5 py-8" aria-labelledby="helper-section-rate">
            <h2 id="helper-section-rate" className="sr-only">
              Rate and availability
            </h2>

            <div>
              <p className={labelClass}>Rate</p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div
                  className="inline-flex rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-1"
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
                        className={`rounded-lg px-3.5 py-2 text-[13px] font-semibold transition ${
                          on
                            ? 'bg-white text-[#071330] shadow-sm ring-1 ring-[#E2E8F0]'
                            : 'text-[#64748B] hover:text-[#071330]'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>

                {rateType === 'hourly' ? (
                  <div
                    className="relative inline-flex h-12 w-36 items-center rounded-xl border border-[#E2E8F0] bg-white focus-within:border-[#1D5CE5] focus-within:ring-4 focus-within:ring-[#1D5CE5]/15"
                    data-testid="helper-hourly-rate"
                  >
                    <span className="pl-3.5 text-[15px] font-semibold text-[#64748B]" aria-hidden>
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
                      className="h-full w-full min-w-0 bg-transparent px-1.5 text-[15px] font-semibold tabular-nums text-[#071330] outline-none"
                    />
                    <span className="pr-3.5 text-[13px] font-medium text-[#94A3B8]" aria-hidden>
                      / hr
                    </span>
                  </div>
                ) : (
                  <p className="text-[13.5px] leading-[1.45] text-[#64748B] sm:max-w-[240px] sm:text-right">
                    Neighbors will describe the task and ask for your price.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 py-1">
              <div className="min-w-0">
                <p className="text-[13.5px] font-semibold text-[#071330]">
                  Available for same-day tasks
                </p>
                <p className="mt-0.5 text-[13px] leading-[1.45] text-[#64748B]">
                  Show an Available badge on your profile today
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={availableNow}
                onClick={() => setAvailableNow((v) => !v)}
                data-testid="helper-available-now"
                className={`relative h-7 w-12 shrink-0 rounded-full transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1D5CE5]/25 ${
                  availableNow ? 'bg-[#1D5CE5]' : 'bg-[#CBD5E1]'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                    availableNow ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            <div>
              <p className={labelClass}>
                Typical schedule{' '}
                <span className="font-normal text-[#64748B]">(optional)</span>
              </p>
              <div className="flex flex-wrap gap-2" data-testid="helper-availability-slots">
                {SLOTS.map((slot) => {
                  const on = availability.includes(slot.id)
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleSlot(slot.id)}
                      className={`rounded-full px-3.5 py-2 text-[13px] font-semibold transition ${
                        on
                          ? 'border border-[#1D5CE5] bg-[#EEF4FF] text-[#1D5CE5]'
                          : 'border border-[#E2E8F0] bg-white text-[#475569] hover:border-[#CBD5E1]'
                      }`}
                    >
                      {slot.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </section>

          <div className="border-t border-[#E2E8F0]" />

          <div className="flex flex-col-reverse gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/browse"
              className="inline-flex h-12 items-center justify-center rounded-full px-5 text-[14px] font-semibold text-[#64748B] transition hover:bg-[#F8FAFC] hover:text-[#071330]"
              data-testid="helper-onboarding-cancel"
            >
              {editing ? 'Cancel' : 'Skip for now'}
            </Link>
            <Button
              type="submit"
              size="lg"
              loading={pending}
              className="h-[52px] rounded-full bg-[#1D5CE5] px-7 text-white shadow-none hover:bg-[#1649BD] sm:min-w-[220px]"
              data-testid="helper-onboarding-submit"
            >
              {editing ? 'Save helper profile' : 'Publish helper profile'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
