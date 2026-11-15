'use client'

import { ChevronDown, Loader2, MapPin, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useBeam } from '@/context/BeamContext'
import { useBrowseHome } from '@/hooks/useBrowseHome'
import {
  requestBrowseLocationPicker,
  subscribeBrowseLocationPickerOpen,
} from '@/lib/browseLocationPreference'
import { normalizeZipInput } from '@/lib/zip/format'

/**
 * App-shell host: listens for open requests from the Browse "your area" pill.
 * Persists a browse-only ZIP pin in localStorage — does not mutate profile.
 */
export function BrowseLocationDialogHost() {
  const { currentUser, helperVerification, state } = useBeam()
  const { home, setFromZipPlace, clearPin, pin } = useBrowseHome({
    person: currentUser,
    helperVerification,
    requests: state.requests,
  })
  const [open, setOpen] = useState(false)

  useEffect(() => {
    return subscribeBrowseLocationPickerOpen(() => setOpen(true))
  }, [])

  return (
    <BrowseLocationDialog
      open={open}
      onClose={() => setOpen(false)}
      currentLabel={home.label}
      hasLocalPin={pin != null}
      homeLocked={home.source !== 'none' && home.source !== 'local'}
      onApplyZip={async (place) => {
        setFromZipPlace(place)
        setOpen(false)
      }}
      onClearLocal={() => {
        clearPin()
        setOpen(false)
      }}
    />
  )
}

export function BrowseLocationTrigger({
  className,
  label,
  pinClassName = 'text-[#4A5568]',
  chevron = false,
  children,
}: {
  className?: string
  label: string
  pinClassName?: string
  chevron?: boolean
  /** When set, replaces the default pin + label + chevron contents. */
  children?: ReactNode
}) {
  return (
    <button
      type="button"
      className={className}
      title="Set your area"
      aria-haspopup="dialog"
      aria-label={typeof label === 'string' ? `Browse area: ${label}` : 'Set your area'}
      data-testid="topnav-location"
      onClick={() => requestBrowseLocationPicker()}
    >
      {children ? (
        children
      ) : (
        <>
          <MapPin className={`h-4 w-4 shrink-0 ${pinClassName}`} strokeWidth={2} aria-hidden />
          <span className="truncate">{label}</span>
          {chevron ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#3D4A5F]" strokeWidth={2} aria-hidden />
          ) : null}
        </>
      )}
    </button>
  )
}

function BrowseLocationDialog({
  open,
  onClose,
  currentLabel,
  hasLocalPin,
  homeLocked,
  onApplyZip,
  onClearLocal,
}: {
  open: boolean
  onClose: () => void
  currentLabel: string
  hasLocalPin: boolean
  /** True when home comes from verification / profile / recent job (not localStorage). */
  homeLocked: boolean
  onApplyZip: (place: {
    zip: string
    city: string
    stateCode: string
    lat: number
    lng: number
    label: string
  }) => void | Promise<void>
  onClearLocal: () => void
}) {
  const titleId = useId()
  const descId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [zipInput, setZipInput] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [geoPending, setGeoPending] = useState(false)

  useEffect(() => {
    if (!open) return
    setError('')
    setZipInput('')
    setPending(false)
    setGeoPending(false)
    const t = window.setTimeout(() => inputRef.current?.focus(), 50)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  async function resolveZip(zip: string) {
    const normalized = normalizeZipInput(zip)
    if (!normalized) {
      setError('Enter a 5-digit US ZIP code.')
      return
    }
    setPending(true)
    setError('')
    try {
      const res = await fetch(`/api/zip?zip=${encodeURIComponent(normalized)}`)
      const data = (await res.json()) as {
        error?: string
        zip?: string
        lat?: number
        lng?: number
        city?: string
        stateCode?: string
        label?: string
      }
      if (!res.ok || !data.zip || data.lat == null || data.lng == null) {
        setError(data.error || 'We could not find that ZIP code.')
        return
      }
      await onApplyZip({
        zip: data.zip,
        city: data.city || '',
        stateCode: data.stateCode || '',
        lat: data.lat,
        lng: data.lng,
        label: data.label || `${data.city}, ${data.stateCode}`,
      })
    } catch {
      setError('Could not look up that ZIP. Try again.')
    } finally {
      setPending(false)
    }
  }

  async function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError('Location is not available in this browser.')
      return
    }
    setGeoPending(true)
    setError('')
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 60_000,
        })
      })
      const res = await fetch(
        `/api/zip?lat=${encodeURIComponent(String(pos.coords.latitude))}&lng=${encodeURIComponent(String(pos.coords.longitude))}`,
      )
      const data = (await res.json()) as {
        error?: string
        zip?: string
        lat?: number
        lng?: number
        city?: string
        stateCode?: string
        label?: string
      }
      if (!res.ok || !data.zip || data.lat == null || data.lng == null) {
        setError(data.error || 'Could not resolve your current location.')
        return
      }
      await onApplyZip({
        zip: data.zip,
        city: data.city || '',
        stateCode: data.stateCode || '',
        lat: data.lat,
        lng: data.lng,
        label: data.label || `${data.city}, ${data.stateCode}`,
      })
    } catch {
      setError('Could not read your current location. Check permissions, or enter a ZIP.')
    } finally {
      setGeoPending(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-[#071330]/45 p-0 sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        data-testid="browse-location-dialog"
        className="flex max-h-[92dvh] w-full max-w-[28rem] flex-col overflow-hidden rounded-t-xl border border-[#E3E8EF] bg-white shadow-[0_16px_48px_rgba(7,19,48,0.18)] sm:rounded-lg"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#E3E8EF] px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-[17px] font-bold tracking-[-0.02em] text-[#071330]">
              Set your area
            </h2>
            <p id={descId} className="mt-1 text-[13px] leading-snug text-[#4A5568]">
              {homeLocked
                ? `Distances use your home area (${currentLabel}). A ZIP saved here is only used when no home is on file.`
                : 'Enter a ZIP or use your current location. Saved on this device only.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            data-testid="browse-location-close"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#4A5568] transition hover:bg-white hover:text-[#071330] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/35"
          >
            <X className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <label className="block">
            <span className="text-[13px] font-semibold text-[#071330]">ZIP code</span>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={10}
              value={zipInput}
              onChange={(e) => {
                setZipInput(e.target.value)
                if (error) setError('')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void resolveZip(zipInput)
                }
              }}
              placeholder="e.g. 95125"
              data-testid="browse-location-zip"
              className="mt-2 h-11 w-full rounded-[10px] border border-[#D7E0EC] bg-white px-3 text-[15px] text-[#071330] outline-none placeholder:text-[#5B6576] focus:border-[#1D5CE5] focus:shadow-[0_0_0_3px_rgba(29,92,229,0.14)]"
            />
          </label>

          {error ? (
            <p
              className="mt-2 rounded-lg border border-[#D7E0EC] bg-white px-3 py-2 text-[13px] font-medium text-[#071330]"
              role="alert"
              data-testid="browse-location-error"
            >
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => void useCurrentLocation()}
            disabled={geoPending || pending}
            data-testid="browse-location-geolocate"
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] border border-[#D7E0EC] bg-[#EEF2F7] px-4 text-[14px] font-semibold text-[#071330] transition hover:bg-[#E3E8EF] disabled:opacity-60"
          >
            {geoPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <MapPin className="h-4 w-4 text-[#1D5CE5]" strokeWidth={2} aria-hidden />
            )}
            Use my current location
          </button>

          {hasLocalPin && !homeLocked ? (
            <button
              type="button"
              onClick={onClearLocal}
              data-testid="browse-location-clear"
              className="mt-3 text-[13px] font-semibold text-[#1649BD] transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/30"
            >
              Clear saved area
            </button>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[#E3E8EF] bg-white px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            data-testid="browse-location-cancel"
            className="inline-flex h-9 items-center justify-center rounded-lg px-3.5 text-[13.5px] font-semibold text-[#4A5568] transition hover:bg-white hover:text-[#071330] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/35"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void resolveZip(zipInput)}
            disabled={pending || geoPending}
            data-testid="browse-location-apply"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#1D5CE5] px-3.5 text-[13.5px] font-semibold text-white transition hover:bg-[#1649BD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/40 focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Save area
          </button>
        </div>
      </div>
    </div>
  )
}
