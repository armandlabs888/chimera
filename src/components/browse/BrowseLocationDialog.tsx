'use client'

import { MapPin, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import {
  UsCityCombobox,
  type UsCityComboboxHandle,
} from '@/components/onboarding/UsCityCombobox'
import { useBrowseLocation } from '@/hooks/useBrowseLocation'
import {
  requestBrowseLocationPicker,
  subscribeBrowseLocationPickerOpen,
} from '@/lib/browseLocationPreference'
import { formatLocationLabel } from '@/lib/location'
import { loadUsPlacesIndex, searchUsCities, type UsCity } from '@/lib/usPlaces'
import { useBeam } from '@/context/BeamContext'

/**
 * App-shell host: listens for open requests from the topnav / Browse eyebrow.
 * Persists a browse-only pin — does not mutate profile city.
 */
export function BrowseLocationDialogHost() {
  const { currentUser } = useBeam()
  const { origin, setCity, clearPin, isOverridden } = useBrowseLocation(currentUser)
  const [open, setOpen] = useState(false)

  useEffect(() => subscribeBrowseLocationPickerOpen(() => setOpen(true)), [])

  return (
    <BrowseLocationDialog
      open={open}
      onClose={() => setOpen(false)}
      currentLabel={origin.locationLabel}
      homeLabel={formatLocationLabel(currentUser)}
      hasHomeLocation={Boolean(
        (currentUser.locationLabel && currentUser.locationLabel.trim()) ||
          (currentUser.city && currentUser.city.trim()),
      )}
      isOverridden={isOverridden}
      onApply={(city) => {
        setCity(city)
        setOpen(false)
      }}
      onUseHome={() => {
        clearPin()
        setOpen(false)
      }}
    />
  )
}

export function BrowseLocationTrigger({
  className,
  label,
}: {
  className?: string
  label: string
}) {
  return (
    <button
      type="button"
      className={className}
      title="Change browse location"
      aria-haspopup="dialog"
      data-testid="topnav-location"
      onClick={() => requestBrowseLocationPicker()}
    >
      <MapPin className="h-3.5 w-3.5 shrink-0 text-[#64748B]" strokeWidth={2} aria-hidden />
      <span className="truncate">{label}</span>
    </button>
  )
}

function BrowseLocationDialog({
  open,
  onClose,
  currentLabel,
  homeLabel,
  hasHomeLocation,
  isOverridden,
  onApply,
  onUseHome,
}: {
  open: boolean
  onClose: () => void
  currentLabel: string
  homeLabel: string
  hasHomeLocation: boolean
  isOverridden: boolean
  onApply: (city: UsCity) => void
  onUseHome: () => void
}) {
  const titleId = useId()
  const descId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const cityRef = useRef<UsCityComboboxHandle>(null)
  const [draft, setDraft] = useState<UsCity | null>(null)
  const [error, setError] = useState('')
  const [hydrating, setHydrating] = useState(false)

  useEffect(() => {
    if (!open) return
    setError('')
    setDraft(null)
    setHydrating(true)
    let cancelled = false
    void loadUsPlacesIndex()
      .then(() => {
        if (cancelled) return
        const match =
          searchUsCities(currentLabel, 8).find(
            (c) => c.label.toLowerCase() === currentLabel.toLowerCase(),
          ) ?? null
        setDraft(match)
        setHydrating(false)
        // Prefill when we can resolve the current browse city; otherwise open search.
        if (!match) {
          requestAnimationFrame(() => cityRef.current?.focusAndOpen())
        }
      })
      .catch(() => {
        if (cancelled) return
        setHydrating(false)
        setError('Could not load US cities. Try again.')
      })
    return () => {
      cancelled = true
    }
  }, [open, currentLabel])

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

  function submit() {
    const committed = draft ?? cityRef.current?.tryCommitQuery() ?? null
    if (!committed) {
      setError('Select a US city to update browse results.')
      cityRef.current?.focusAndOpen()
      return
    }
    onApply(committed)
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
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        data-testid="browse-location-dialog"
        className="flex max-h-[92dvh] w-full max-w-[28rem] flex-col overflow-hidden rounded-t-xl border border-[#E2E8F0] bg-white shadow-[0_16px_48px_rgba(7,19,48,0.18)] sm:rounded-lg"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#E2E8F0] px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-[17px] font-bold tracking-[-0.02em] text-[#071330]">
              Change browse location
            </h2>
            <p id={descId} className="mt-1 text-[13px] leading-snug text-[#64748B]">
              Updates nearby jobs and helpers here. Your profile city stays{' '}
              <span className="font-semibold text-[#475569]">{homeLabel}</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            data-testid="browse-location-close"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#64748B] transition hover:bg-[#F8FAFC] hover:text-[#071330] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/35"
          >
            <X className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {hydrating ? (
            <p className="text-[13.5px] text-[#64748B]" role="status">
              Loading cities…
            </p>
          ) : (
            <UsCityCombobox
              ref={cityRef}
              value={draft}
              onChange={(next) => {
                setDraft(next)
                if (next) setError('')
              }}
              error={error}
            />
          )}

          {error ? (
            <p
              className="mt-2 text-[13px] font-medium text-red-600"
              role="alert"
              data-testid="browse-location-error"
            >
              {error}
            </p>
          ) : null}

          {hasHomeLocation && isOverridden ? (
            <button
              type="button"
              onClick={onUseHome}
              data-testid="browse-location-use-home"
              className="mt-3 text-[13px] font-semibold text-[#1D5CE5] transition hover:text-[#1649BD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/30"
            >
              Reset to home · {homeLabel}
            </button>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[#E2E8F0] bg-[#F8FAFC] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            data-testid="browse-location-cancel"
            className="inline-flex h-9 items-center justify-center rounded-lg px-3.5 text-[13.5px] font-semibold text-[#475569] transition hover:bg-white hover:text-[#071330] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/35"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            data-testid="browse-location-apply"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-[#1D5CE5] px-3.5 text-[13.5px] font-semibold text-white transition hover:bg-[#1649BD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/40 focus-visible:ring-offset-2"
          >
            Update browse area
          </button>
        </div>
      </div>
    </div>
  )
}
