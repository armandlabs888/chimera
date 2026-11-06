'use client'

import { Camera, MapPin } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState, type FormEvent } from 'react'
import {
  Button,
  Field,
  InlineBanner,
  TextArea,
  TextInput,
} from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import { CATEGORIES } from '@/data/categories'
import { uploadBeamMedia } from '@/lib/beam/storageUpload'
import { createClient } from '@/lib/supabase/client'
import type { AvailabilitySlot, CategoryId, RateType } from '@/types'

const SLOTS: { id: AvailabilitySlot; label: string }[] = [
  { id: 'mornings', label: 'Mornings' },
  { id: 'afternoons', label: 'Afternoons' },
  { id: 'evenings', label: 'Evenings' },
  { id: 'weekends', label: 'Weekends' },
]

const RADIUS_OPTIONS = [3, 5, 10, 15, 25] as const

export function HelperOnboarding() {
  const { currentUser, updateProfile, mode, authUser } = useBeam()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [avatar, setAvatar] = useState(currentUser.avatar || '')
  const [name, setName] = useState(currentUser.name || '')
  const [bio, setBio] = useState(currentUser.bio || '')
  const [skills, setSkills] = useState<CategoryId[]>(currentUser.skills ?? [])
  const [locationLabel, setLocationLabel] = useState(currentUser.locationLabel || '')
  const [lat, setLat] = useState<number | null>(currentUser.lat ?? null)
  const [lng, setLng] = useState<number | null>(currentUser.lng ?? null)
  const [serviceRadiusMiles, setServiceRadiusMiles] = useState(
    currentUser.serviceRadiusMiles ?? 5,
  )
  const [rateType, setRateType] = useState<RateType>(currentUser.rateType ?? 'hourly')
  const [hourlyRate, setHourlyRate] = useState(currentUser.hourlyRate || 35)
  const [availableNow, setAvailableNow] = useState(Boolean(currentUser.availableNow))
  const [availability, setAvailability] = useState<AvailabilitySlot[]>(
    currentUser.availability ?? [],
  )
  const [detecting, setDetecting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  function toggleSkill(id: CategoryId) {
    setSkills((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
  }

  function toggleSlot(slot: AvailabilitySlot) {
    setAvailability((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot],
    )
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
      const res = await fetch(
        `/api/geocode?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`,
      )
      if (res.ok) {
        const data = (await res.json()) as { label?: string }
        if (data.label) setLocationLabel(data.label)
      } else if (!locationLabel.trim()) {
        setLocationLabel('Near me')
      }
    } catch {
      setError('Could not detect your location. Enter a city or ZIP instead.')
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
    if (!locationLabel.trim()) {
      setError('Add a city or ZIP so requesters know your area.')
      return
    }
    if (rateType === 'hourly' && hourlyRate < 10) {
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
      locationLabel: locationLabel.trim(),
      lat,
      lng,
      serviceRadiusMiles,
      rateType,
      hourlyRate: rateType === 'hourly' ? hourlyRate : 0,
      availableNow,
      availability,
      isHelper: true,
    })
    router.push('/browse')
  }

  return (
    <div className="px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-xl">
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[#1D5CE5]">
          Helper setup
        </p>
        <h1 className="mt-2 font-display text-[clamp(1.75rem,4vw,2.25rem)] font-bold leading-[1.1] tracking-[-0.02em] text-[#071330]">
          Set up your helper profile
        </h1>
        <p className="mt-2 text-[15px] leading-[1.5] text-[#64748B]">
          Tell neighbors what you can help with, where you work, and how you like to be booked.
        </p>

        <form
          onSubmit={onSubmit}
          className="mt-8 space-y-6 rounded-[26px] border border-[rgba(7,19,48,0.08)] bg-white p-5 shadow-[0_10px_28px_-12px_rgba(12,42,102,0.08)] sm:p-7"
        >
          {error ? <InlineBanner tone="error">{error}</InlineBanner> : null}

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-[rgba(7,19,48,0.1)] bg-[#F4F8FD]"
              aria-label="Upload profile photo"
            >
              {avatar ? (
                <img src={avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-[#94A3B8]">
                  <Camera className="h-6 w-6" />
                </span>
              )}
              <span className="absolute inset-x-0 bottom-0 bg-[#071330]/70 py-1 text-center text-[10px] font-semibold text-white">
                {uploading ? '…' : 'Photo'}
              </span>
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-[#071330]">Profile photo</p>
              <p className="mt-0.5 text-[13px] text-[#64748B]">
                A clear face photo helps requesters trust you faster.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-2"
                loading={uploading}
                onClick={() => fileRef.current?.click()}
              >
                Upload photo
              </Button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => void onPickPhoto(e.target.files?.[0] ?? null)}
            />
          </div>

          <Field label="Display name" required>
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={80}
              placeholder="Alex Rivera"
            />
          </Field>

          <Field label="Bio" hint="A sentence or two about how you help.">
            <TextArea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={400}
              placeholder="Reliable neighbor for moving, assembly, and yard help."
            />
          </Field>

          <fieldset>
            <legend className="mb-2 text-[12px] font-medium uppercase tracking-[0.06em] text-[#64748B]">
              Skills <span className="text-beam-danger">*</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => {
                const on = skills.includes(c.id)
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleSkill(c.id)}
                    className={`rounded-full px-3.5 py-2 text-[13px] font-semibold transition ${
                      on
                        ? 'bg-[#1D5CE5] text-white'
                        : 'border border-[rgba(7,19,48,0.12)] bg-white text-[#475569] hover:border-[rgba(29,92,229,0.35)]'
                    }`}
                  >
                    {c.shortLabel}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <Field label="City or ZIP" required hint="Where you usually take jobs.">
            <div className="flex flex-col gap-2 sm:flex-row">
              <TextInput
                value={locationLabel}
                onChange={(e) => setLocationLabel(e.target.value)}
                required
                placeholder="City or ZIP (e.g. Seattle, WA or 98101)"
                className="flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => void detectMyLocation()}
                loading={detecting}
                className="shrink-0"
              >
                <MapPin className="h-4 w-4" />
                Use my location
              </Button>
            </div>
          </Field>

          <fieldset>
            <legend className="mb-2 text-[12px] font-medium uppercase tracking-[0.06em] text-[#64748B]">
              Service radius
            </legend>
            <div className="flex flex-wrap gap-2">
              {RADIUS_OPTIONS.map((miles) => {
                const on = serviceRadiusMiles === miles
                return (
                  <button
                    key={miles}
                    type="button"
                    onClick={() => setServiceRadiusMiles(miles)}
                    className={`rounded-full px-3.5 py-2 text-[13px] font-semibold transition ${
                      on
                        ? 'bg-[#1D5CE5] text-white'
                        : 'border border-[rgba(7,19,48,0.12)] bg-white text-[#475569] hover:border-[rgba(29,92,229,0.35)]'
                    }`}
                  >
                    {miles} mi
                  </button>
                )
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-[12px] font-medium uppercase tracking-[0.06em] text-[#64748B]">
              Rate
            </legend>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['hourly', 'Hourly'],
                  ['quote', 'Contact for quote'],
                ] as const
              ).map(([id, label]) => {
                const on = rateType === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setRateType(id)}
                    className={`rounded-full px-3.5 py-2 text-[13px] font-semibold transition ${
                      on
                        ? 'bg-[#1D5CE5] text-white'
                        : 'border border-[rgba(7,19,48,0.12)] bg-white text-[#475569]'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            {rateType === 'hourly' ? (
              <div className="mt-3 max-w-[180px]">
                <Field label="Hourly rate (USD)">
                  <TextInput
                    type="number"
                    min={10}
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(Number(e.target.value))}
                  />
                </Field>
              </div>
            ) : null}
          </fieldset>

          <div className="flex items-center justify-between gap-3 rounded-2xl border border-[rgba(7,19,48,0.08)] bg-[#F4F8FD] px-4 py-3">
            <div>
              <p className="text-[14px] font-semibold text-[#071330]">Available now</p>
              <p className="text-[12.5px] text-[#64748B]">Show up first in same-day matches.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={availableNow}
              onClick={() => setAvailableNow((v) => !v)}
              className={`relative h-7 w-12 rounded-full transition ${
                availableNow ? 'bg-emerald-500' : 'bg-[#CBD5E1]'
              }`}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                  availableNow ? 'left-[22px]' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          <fieldset>
            <legend className="mb-2 text-[12px] font-medium uppercase tracking-[0.06em] text-[#64748B]">
              Typical availability
            </legend>
            <div className="flex flex-wrap gap-2">
              {SLOTS.map((slot) => {
                const on = availability.includes(slot.id)
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => toggleSlot(slot.id)}
                    className={`rounded-full px-3.5 py-2 text-[13px] font-semibold transition ${
                      on
                        ? 'bg-[#1D5CE5] text-white'
                        : 'border border-[rgba(7,19,48,0.12)] bg-white text-[#475569]'
                    }`}
                  >
                    {slot.label}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <Button type="submit" size="lg" className="w-full" loading={pending}>
            Save helper profile & browse open requests
          </Button>
        </form>
      </div>
    </div>
  )
}
