'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Avatar, Button, InlineBanner } from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import { uploadBeamMedia } from '@/lib/beam/storageUpload'
import { createClient } from '@/lib/supabase/client'
import '@/components/account/account-hc.css'

export function YouProfileForm() {
  const { currentUser, updateProfile, mode, authUser } = useBeam()
  const fileRef = useRef<HTMLInputElement>(null)
  const [avatar, setAvatar] = useState(currentUser.avatar || '')
  const [name, setName] = useState(currentUser.name || '')
  const [bio, setBio] = useState(currentUser.bio || '')
  const [city, setCity] = useState(
    currentUser.locationLabel ||
      (currentUser.city && currentUser.stateCode
        ? `${currentUser.city}, ${currentUser.stateCode}`
        : currentUser.city || ''),
  )
  const [uploading, setUploading] = useState(false)
  const [pending, setPending] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [error, setError] = useState('')

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
  }, [
    currentUser.avatar,
    currentUser.name,
    currentUser.bio,
    currentUser.locationLabel,
    currentUser.city,
    currentUser.stateCode,
  ])

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

  function onSubmit(e: FormEvent) {
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

    setPending(true)
    setError('')
    updateProfile({
      name: trimmedName,
      bio: bio.trim(),
      avatar: avatar || currentUser.avatar,
      locationLabel: locationLabel || currentUser.locationLabel,
      city: cityPart || currentUser.city || null,
      stateCode: statePart || currentUser.stateCode || null,
    })
    setPending(false)
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 1800)
  }

  return (
    <form
      onSubmit={onSubmit}
      className="account-hc-card account-hc-form-card"
      data-testid="you-profile-form"
      noValidate
    >
      {error ? (
        <div className="mb-2">
          <InlineBanner tone="error">{error}</InlineBanner>
        </div>
      ) : null}
      {savedFlash ? (
        <div className="mb-2">
          <InlineBanner tone="success">Profile saved.</InlineBanner>
        </div>
      ) : null}

      <div className="account-hc-field">
        <p className="account-hc-label">Photo</p>
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
              data-testid="you-change-photo"
            >
              {avatar ? 'Change photo' : 'Upload photo'}
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
      </div>

      <div className="account-hc-field">
        <label htmlFor="you-display-name" className="account-hc-label">
          Display name
        </label>
        <input
          id="you-display-name"
          name="displayName"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={80}
          className="account-hc-input"
          data-testid="you-display-name"
        />
      </div>

      <div className="account-hc-field">
        <label htmlFor="you-bio" className="account-hc-label">
          Short bio <span className="account-hc-hint">(optional)</span>
        </label>
        <textarea
          id="you-bio"
          name="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          maxLength={400}
          placeholder="A short note about how you help neighbors."
          className="account-hc-textarea"
          data-testid="you-bio"
        />
      </div>

      <div className="account-hc-field">
        <label htmlFor="you-city" className="account-hc-label">
          City
        </label>
        <input
          id="you-city"
          name="city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Milpitas, CA"
          className="account-hc-input"
          data-testid="you-city"
        />
      </div>

      <Button
        type="submit"
        size="lg"
        loading={pending}
        className="mt-[22px] h-12 rounded-[10px] bg-[#1D5CE5] px-7 text-[15px] text-white shadow-none hover:bg-[#1649BD]"
        data-testid="you-save-profile"
      >
        Save profile
      </Button>
    </form>
  )
}
