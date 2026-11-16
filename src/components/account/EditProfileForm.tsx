'use client'

import { Camera, Info } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { CategorySelect } from '@/components/CategorySelect'
import { Avatar, InlineBanner } from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import { uploadBeamMedia } from '@/lib/beam/storageUpload'
import { formatLocation } from '@/lib/location'
import { isHelperPerson } from '@/lib/roles'
import { createClient } from '@/lib/supabase/client'
import {
  formatCategoryLabel,
  isServiceCategoryId,
  normalizeOtherCustom,
  type ServiceCategoryId,
} from '@/lib/taxonomy'
import {
  WorkingHoursFields,
  workingHoursSavePayload,
} from '@/components/account/WorkingHoursFields'
import { normalizeWorkTime } from '@/lib/workingHours'
import '@/components/account/account-hc.css'
import './edit-profile.css'

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

export function EditProfileForm() {
  const { currentUser, updateProfile, mode, authUser } = useBeam()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const isHelper = isHelperPerson(currentUser)

  const [avatar, setAvatar] = useState(currentUser.avatar || '')
  const [name, setName] = useState(currentUser.name || '')
  const [bio, setBio] = useState(currentUser.bio || '')
  const [city, setCity] = useState(
    currentUser.locationLabel ||
      (currentUser.city && currentUser.stateCode
        ? `${currentUser.city}, ${currentUser.stateCode}`
        : currentUser.city || ''),
  )
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
  const [uploading, setUploading] = useState(false)
  const [pending, setPending] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [error, setError] = useState('')

  const legacySkills = (currentUser.skills ?? []).filter((s) => !isServiceCategoryId(s))

  useEffect(() => {
    setAvatar(currentUser.avatar || '')
    setName(currentUser.name || '')
    setBio(currentUser.bio || '')
    setCity(
      currentUser.locationLabel ||
        (currentUser.city && currentUser.stateCode
          ? `${currentUser.city}, ${currentUser.stateCode}`
          : currentUser.city || ''),
    )
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
    currentUser.avatar,
    currentUser.name,
    currentUser.bio,
    currentUser.locationLabel,
    currentUser.city,
    currentUser.stateCode,
    currentUser.skills,
    currentUser.otherSkillLabel,
    currentUser.serviceRadiusMiles,
    currentUser.hourlyRate,
    currentUser.availableNow,
    currentUser.workStart,
    currentUser.workEnd,
  ])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash.replace('#', '')
    if (!hash) return
    const el = document.getElementById(hash)
    if (el) {
      requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    }
  }, [])

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

  function toggleSkill(id: ServiceCategoryId) {
    setSkills((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
    if (id === 'other') setOtherError('')
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Add a display name so neighbors know who you are.')
      return
    }

    const locationLabel = city.trim()
    const cityPart = locationLabel.split(',')[0]?.trim() || locationLabel
    const statePart = locationLabel.includes(',')
      ? locationLabel.split(',').slice(1).join(',').trim()
      : (currentUser.stateCode ?? null)

    const patch: Parameters<typeof updateProfile>[0] = {
      name: trimmedName,
      bio: bio.trim(),
      avatar: avatar || currentUser.avatar,
      locationLabel: locationLabel || currentUser.locationLabel,
      city: cityPart || currentUser.city || null,
      stateCode: statePart || currentUser.stateCode || null,
    }

    if (isHelper) {
      if (skills.length < 1 && legacySkills.length < 1) {
        setError('Pick at least one skill so we can match you to open requests.')
        return
      }
      // Prefer current taxonomy picks; drop legacy once they choose current services.
      const nextSkills = skills.length ? skills : currentUser.skills
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
      Object.assign(patch, {
        skills: nextSkills,
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
    }

    setPending(true)
    setError('')
    try {
      await updateProfile(patch)
      setSavedFlash(true)
      window.setTimeout(() => setSavedFlash(false), 1800)
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Could not save your profile.'
      setError(raw.replace(/^Update profile:\s*/i, '') || 'Could not save your profile.')
    } finally {
      setPending(false)
    }
  }

  const cityHint = formatLocation(currentUser) || city || 'your city'

  return (
    <form
      onSubmit={onSubmit}
      className="edit-profile-form"
      data-testid="edit-profile-form"
      noValidate
    >
      {error ? (
        <div className="mb-3">
          <InlineBanner tone="error">{error}</InlineBanner>
        </div>
      ) : null}
      {savedFlash ? (
        <div className="mb-3">
          <InlineBanner tone="success">Profile saved.</InlineBanner>
        </div>
      ) : null}

      <h2 className="ep-group-title">Basics</h2>

      <div className="ep-field">
        <div>
          <div className="ep-lbl">Photo</div>
          <div className="ep-hint">A clear face photo helps neighbors recognize you.</div>
        </div>
        <div className="ep-photo-row">
          <Avatar src={avatar || undefined} name={name || currentUser.name || 'You'} size={72} />
          <button
            type="button"
            className="ep-btn-outline"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            data-testid="you-change-photo"
          >
            <Camera className="h-4 w-4" strokeWidth={2} aria-hidden />
            {uploading ? 'Uploading…' : avatar ? 'Change photo' : 'Upload photo'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => void onPickPhoto(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>

      <div className="ep-field">
        <div>
          <label htmlFor="ep-display-name" className="ep-lbl">
            Display name
          </label>
          <div className="ep-hint">Shown on offers and reviews.</div>
        </div>
        <input
          id="ep-display-name"
          className="ep-input"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={80}
          data-testid="you-display-name"
        />
      </div>

      <div className="ep-field" id="bio">
        <div>
          <label htmlFor="ep-bio" className="ep-lbl">
            Short bio
          </label>
          <div className="ep-hint">Shown under About.</div>
        </div>
        <textarea
          id="ep-bio"
          className="ep-input ep-textarea"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          maxLength={400}
          placeholder="A short note about how you help neighbors."
          data-testid="you-bio"
        />
      </div>

      <div className="ep-field">
        <div>
          <label htmlFor="ep-city" className="ep-lbl">
            City
          </label>
          <div className="ep-hint">Sets your area for Browse and matching.</div>
        </div>
        <input
          id="ep-city"
          className="ep-input"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="San Jose, CA"
          data-testid="you-city"
        />
      </div>

      {isHelper ? (
        <>
          <h2 className="ep-group-title" id="services">
            Helper details
          </h2>

          <div className="ep-field">
            <div>
              <div className="ep-lbl">Services</div>
              <div className="ep-hint">Pick what you want to be hired for.</div>
            </div>
            <div>
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
              {legacySkills.length ? (
                <p className="ep-legacy" data-testid="edit-legacy-service-note">
                  <Info className="h-4 w-4 shrink-0 text-[#1D5CE5]" strokeWidth={2} aria-hidden />
                  <span>
                    Your profile still lists{' '}
                    <b className="text-[#071330]">
                      {legacySkills
                        .map((s) => formatCategoryLabel(s))
                        .join(', ')}
                    </b>
                    , an older service HouseCall no longer offers. Pick a current service so
                    neighbors can find you.
                  </span>
                </p>
              ) : null}
            </div>
          </div>

          <div className="ep-field">
            <div>
              <div className="ep-lbl">Travel radius</div>
              <div className="ep-hint">How far from {cityHint} you will go.</div>
            </div>
            <div
              className="ep-choice-row"
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
                    className={`ep-choice${on ? ' is-on' : ''}`}
                  >
                    {miles} mi
                  </button>
                )
              })}
            </div>
          </div>

          <div className="ep-field">
            <div>
              <div className="ep-lbl">Rate</div>
            </div>
            <div>
              <div className="ep-rate-input" data-testid="you-helper-hourly-rate">
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
                      setHourlyRate(e.target.value.replace(/[^\d]/g, '').slice(0, 4))
                    }
                    aria-label="Hourly rate in USD"
                    placeholder="50"
                  />
                </label>
                <span className="ep-meta">/ hr</span>
              </div>
            </div>
          </div>

          <div className="ep-field">
            <div>
              <div className="ep-lbl">Availability</div>
              <div className="ep-hint">Same-day badge and typical working hours.</div>
            </div>
            <div>
              <div className="ep-toggle-row">
                <div>
                  <div className="font-semibold text-[#071330]">Available for same-day tasks</div>
                  <div className="ep-hint">Show an Available badge on your profile today.</div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={availableNow}
                  aria-label="Available for same-day tasks"
                  onClick={() => setAvailableNow((v) => !v)}
                  data-testid="you-helper-available-now"
                  className={`ep-toggle${availableNow ? ' is-on' : ''}`}
                >
                  <span className="ep-toggle-knob" />
                </button>
              </div>
              <div className="mt-[18px]">
                <WorkingHoursFields
                  workStart={workStart}
                  workEnd={workEnd}
                  onChangeStart={setWorkStart}
                  onChangeEnd={setWorkEnd}
                  testIdPrefix="you-helper-hours"
                />
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <h2 className="ep-group-title">Helper details</h2>
          <div className="ep-field">
            <div>
              <div className="ep-lbl">Become a helper</div>
              <div className="ep-hint">Offer your skills to neighbors nearby.</div>
            </div>
            <div>
              <Link
                href="/onboarding/helper"
                className="ep-btn-outline inline-flex"
                data-testid="edit-become-helper"
              >
                Set up helper profile
              </Link>
            </div>
          </div>
        </>
      )}

      <div className="ep-save-bar" data-testid="edit-profile-save-bar">
        <button
          type="button"
          className="ep-btn-outline"
          onClick={() => router.push('/you')}
          data-testid="edit-profile-cancel"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="ep-btn-primary"
          disabled={pending || uploading}
          data-testid="you-save-profile"
        >
          {pending ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}
