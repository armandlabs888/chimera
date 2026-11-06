'use client'

import { Check, CornerDownLeft, Loader2, MapPin, Navigation, Search, X } from 'lucide-react'
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'
import {
  citiesReady,
  loadUsPlacesIndex,
  nearestUsCity,
  searchUsCities,
  stateDisplayName,
  type UsCity,
} from '@/lib/usPlaces'

type Props = {
  value: UsCity | null
  onChange: (city: UsCity | null) => void
  disabled?: boolean
}

/** Diverse major metros — never Austin (guest/default no-Austin rule). */
const POPULAR_CITY_QUERIES = [
  'New York, NY',
  'Los Angeles, CA',
  'Chicago, IL',
  'Houston, TX',
  'Phoenix, AZ',
  'Seattle, WA',
] as const

function highlightMatch(label: string, query: string): ReactNode {
  const q = query.trim()
  if (!q) return label
  const lower = label.toLowerCase()
  const idx = lower.indexOf(q.toLowerCase())
  if (idx < 0) return label
  return (
    <>
      {label.slice(0, idx)}
      <span className="rounded-[3px] bg-[#EEF4FF] font-bold text-[#1D5CE5]">
        {label.slice(idx, idx + q.length)}
      </span>
      {label.slice(idx + q.length)}
    </>
  )
}

function resolvePopularCities(): UsCity[] {
  const out: UsCity[] = []
  for (const q of POPULAR_CITY_QUERIES) {
    const hits = searchUsCities(q, 5)
    const exact = hits.find((c) => c.label.toLowerCase() === q.toLowerCase()) ?? hits[0]
    if (exact && !out.some((c) => c.label === exact.label)) out.push(exact)
  }
  return out
}

export function UsCityCombobox({ value, onChange, disabled }: Props) {
  const listboxId = useId()
  const inputId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [ready, setReady] = useState(citiesReady())
  const [loadError, setLoadError] = useState('')
  const [query, setQuery] = useState(value ? value.label : '')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [options, setOptions] = useState<UsCity[]>([])
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState('')
  const [popular, setPopular] = useState<UsCity[]>([])

  useEffect(() => {
    let cancelled = false
    void loadUsPlacesIndex()
      .then(() => {
        if (!cancelled) {
          setReady(true)
          setOptions(searchUsCities('', 10))
          setPopular(resolvePopularCities())
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load US cities. Refresh and try again.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (value) setQuery(value.label)
  }, [value])

  useEffect(() => {
    if (!ready) return
    setOptions(searchUsCities(query, 10))
    setActiveIndex(0)
  }, [query, ready])

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  function selectCity(city: UsCity) {
    onChange(city)
    setQuery(city.label)
    setOpen(false)
    setGeoError('')
  }

  function clearSelection() {
    onChange(null)
    setQuery('')
    setOptions(searchUsCities('', 10))
    setOpen(true)
    setGeoError('')
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  function onInputChange(next: string) {
    setQuery(next)
    if (value && next.trim() !== value.label) onChange(null)
    setOpen(true)
    setGeoError('')
  }

  function onKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      setActiveIndex((i) => Math.min(i + 1, Math.max(options.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      if (open && options[activeIndex]) {
        e.preventDefault()
        selectCity(options[activeIndex])
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    }
  }

  async function snapToCurrentLocation() {
    if (!navigator.geolocation) {
      setGeoError('Location is not available in this browser.')
      return
    }
    setLocating(true)
    setGeoError('')
    try {
      if (!ready) await loadUsPlacesIndex()
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10000,
        }),
      )
      const nearest = nearestUsCity(pos.coords.latitude, pos.coords.longitude)
      if (!nearest) {
        setGeoError('Could not match a nearby US city.')
        return
      }
      selectCity(nearest)
    } catch {
      setGeoError('Could not read your location. Pick a city from the list.')
    } finally {
      setLocating(false)
    }
  }

  const activeId = open && options[activeIndex] ? `${listboxId}-opt-${activeIndex}` : undefined
  const needsSelectionHint = query.trim().length > 0 && !value && !open
  const showPopularChips = !value && !open && ready && popular.length > 0

  const helperCopy = useMemo(() => {
    if (loadError || geoError) return null
    if (needsSelectionHint) return 'Select your city from the suggestions above to continue.'
    return '32,000+ US cities & towns supported'
  }, [loadError, geoError, needsSelectionHint])

  return (
    <div ref={rootRef} className="relative">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={inputId} className="text-[13px] font-semibold text-[#475569]">
          Your city
        </label>
        {!value ? (
          <button
            type="button"
            onClick={() => void snapToCurrentLocation()}
            disabled={disabled || locating || !ready}
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[12.5px] font-semibold text-[#1D5CE5] transition hover:bg-[#EEF4FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/30 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="onboarding-use-location"
          >
            {locating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Navigation className="h-3.5 w-3.5" aria-hidden />
            )}
            {locating ? 'Finding…' : 'Use current location'}
          </button>
        ) : null}
      </div>

      {value ? (
        <div
          className="flex items-center gap-3 rounded-2xl border border-[#1D5CE5]/25 bg-[#F5F9FF] px-4 py-3.5"
          data-testid="onboarding-city-verified"
        >
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1D5CE5] text-white shadow-[0_8px_18px_-6px_rgba(29,92,229,0.45)]">
            <MapPin className="h-[18px] w-[18px]" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-[15px] font-bold text-[#071330]">{value.label}</p>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.06em] text-emerald-700">
                <Check className="h-3 w-3" aria-hidden />
                Verified
              </span>
            </div>
            <p className="mt-0.5 text-[13px] text-[#64748B]">
              {stateDisplayName(value.stateCode)} · United States
            </p>
          </div>
          <button
            type="button"
            onClick={clearSelection}
            disabled={disabled}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[rgba(7,19,48,0.1)] bg-white px-3 text-[13px] font-semibold text-[#475569] transition hover:border-[rgba(7,19,48,0.18)] hover:text-[#071330]"
            aria-label="Change city"
          >
            Change
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#1D5CE5]"
            aria-hidden
          />
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-activedescendant={activeId}
            aria-autocomplete="list"
            aria-haspopup="listbox"
            autoComplete="off"
            spellCheck={false}
            disabled={disabled || !ready}
            placeholder={
              ready
                ? 'Search any US city or town (e.g. Chicago, Miami, Seattle)…'
                : 'Loading US cities…'
            }
            value={query}
            onChange={(e) => onInputChange(e.target.value)}
            onFocus={() => {
              if (ready) {
                setOptions(searchUsCities(query, 10))
                setOpen(true)
              }
            }}
            onKeyDown={onKeyDown}
            data-testid="onboarding-city-input"
            className="h-[54px] w-full rounded-2xl border border-[rgba(7,19,48,0.12)] bg-white py-3 pl-11 pr-11 text-[15px] text-[#071330] shadow-[0_8px_20px_-16px_rgba(12,42,102,0.2)] outline-none transition placeholder:text-[#94A3B8] focus-visible:border-[#1D5CE5] focus-visible:ring-4 focus-visible:ring-[#1D5CE5]/15 disabled:opacity-60"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                onChange(null)
                setOpen(true)
                inputRef.current?.focus()
              }}
              className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#94A3B8] transition hover:bg-[#F4F8FD] hover:text-[#071330]"
              aria-label="Clear city search"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </div>
      )}

      {open && !value && ready ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label="US cities"
          className="absolute z-50 mt-2 max-h-[300px] w-full overflow-auto overscroll-contain rounded-2xl border border-[rgba(7,19,48,0.1)] bg-white p-1.5 shadow-[0_22px_48px_-18px_rgba(12,42,102,0.28)]"
          data-testid="onboarding-city-listbox"
        >
          {options.length === 0 ? (
            <p className="px-3 py-4 text-[14px] text-[#64748B]">No matching US cities.</p>
          ) : (
            options.map((city, index) => {
              const active = index === activeIndex
              return (
                <button
                  key={`${city.stateCode}:${city.name}:${city.lat}`}
                  id={`${listboxId}-opt-${index}`}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectCity(city)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/40 ${
                    active ? 'bg-[#EEF4FF]' : 'hover:bg-[#F4F8FD]'
                  }`}
                >
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="block text-[14.5px] font-semibold text-[#071330]">
                        {highlightMatch(city.label, query)}
                      </span>
                      <span className="rounded-md bg-[#F4F8FD] px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-[#475569]">
                        {city.stateCode}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-[12.5px] text-[#64748B]">
                      {stateDisplayName(city.stateCode)}
                    </span>
                  </span>
                  {active ? (
                    <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-[#94A3B8]" aria-hidden />
                  ) : null}
                </button>
              )
            })
          )}
        </div>
      ) : null}

      {showPopularChips ? (
        <div className="mt-3">
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#94A3B8]">
            Popular
          </p>
          <div className="flex flex-wrap gap-2">
            {popular.map((city) => (
              <button
                key={city.label}
                type="button"
                onClick={() => selectCity(city)}
                disabled={disabled}
                className="inline-flex items-center rounded-full border border-[rgba(7,19,48,0.1)] bg-white px-3 py-1.5 text-[12.5px] font-semibold text-[#475569] transition hover:border-[#1D5CE5]/35 hover:bg-[#F5F9FF] hover:text-[#1D5CE5]"
              >
                {city.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {loadError || geoError ? (
        <p className="mt-2 text-[13px] text-red-600" role="alert">
          {loadError || geoError}
        </p>
      ) : helperCopy ? (
        <p
          className={`mt-2 text-[12.5px] ${
            needsSelectionHint ? 'font-medium text-[#64748B]' : 'text-[#94A3B8]'
          }`}
        >
          {helperCopy}
        </p>
      ) : null}
    </div>
  )
}
