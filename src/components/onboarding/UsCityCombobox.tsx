'use client'

import { Check, MapPin, Navigation, X } from 'lucide-react'
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
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

  useEffect(() => {
    let cancelled = false
    void loadUsPlacesIndex()
      .then(() => {
        if (!cancelled) {
          setReady(true)
          setOptions(searchUsCities('', 10))
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
  const showQuickLocation = open && !query.trim() && !value

  return (
    <div ref={rootRef} className="relative">
      <label htmlFor={inputId} className="mb-2 block text-[13px] font-semibold text-[#475569]">
        Your city
      </label>

      {value ? (
        <div
          className="flex items-center gap-3 rounded-2xl border border-[rgba(7,19,48,0.1)] bg-[#F4F8FD] px-3 py-3"
          data-testid="onboarding-city-verified"
        >
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#1D5CE5] shadow-[0_0_0_1px_rgba(7,19,48,0.06)]">
            <MapPin className="h-[18px] w-[18px]" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-[15px] font-semibold text-[#071330]">{value.label}</p>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F0FF] px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.06em] text-[#1D5CE5]">
                <Check className="h-3 w-3" aria-hidden />
                Verified
              </span>
            </div>
            <p className="mt-0.5 text-[13px] text-[#64748B]">{stateDisplayName(value.stateCode)}</p>
          </div>
          <button
            type="button"
            onClick={clearSelection}
            disabled={disabled}
            className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-[#64748B] transition hover:bg-white hover:text-[#071330]"
            aria-label="Change city"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Change
          </button>
        </div>
      ) : (
        <div className="relative">
          <MapPin
            className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#1D5CE5]"
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
            placeholder={ready ? 'Search any US city or town' : 'Loading US cities…'}
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
            className="h-[52px] w-full rounded-2xl border border-[rgba(7,19,48,0.12)] bg-white py-3 pl-11 pr-4 text-[15px] text-[#071330] outline-none transition placeholder:text-[#94A3B8] focus-visible:border-[#1D5CE5] focus-visible:ring-4 focus-visible:ring-[#1D5CE5]/15 disabled:opacity-60"
          />
        </div>
      )}

      {open && !value && ready ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label="US cities"
          className="absolute z-40 mt-2 max-h-[320px] w-full overflow-auto rounded-2xl border border-[rgba(7,19,48,0.1)] bg-white p-1.5 shadow-[0_18px_40px_-16px_rgba(12,42,102,0.18)]"
          data-testid="onboarding-city-listbox"
        >
          {showQuickLocation ? (
            <button
              type="button"
              onClick={() => void snapToCurrentLocation()}
              disabled={locating}
              className="mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-[#F4F8FD] focus-visible:bg-[#F4F8FD] focus-visible:outline-none"
              data-testid="onboarding-use-location"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#EEF4FF] text-[#1D5CE5]">
                <Navigation className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold text-[#071330]">
                  {locating ? 'Finding nearest city…' : 'Use my current location'}
                </span>
                <span className="block text-[12.5px] text-[#64748B]">
                  Snap to the closest US city in our directory
                </span>
              </span>
            </button>
          ) : null}

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
                  className={`flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/40 ${
                    active ? 'bg-[#EEF4FF]' : 'hover:bg-[#F4F8FD]'
                  }`}
                >
                  <span>
                    <span className="block text-[14.5px] font-semibold text-[#071330]">
                      {city.label}
                    </span>
                    <span className="block text-[12.5px] text-[#64748B]">
                      {stateDisplayName(city.stateCode)}
                    </span>
                  </span>
                  {city.population > 0 ? (
                    <span className="shrink-0 pt-0.5 text-[11px] font-medium tabular-nums text-[#94A3B8]">
                      {city.population.toLocaleString()}
                    </span>
                  ) : null}
                </button>
              )
            })
          )}
        </div>
      ) : null}

      {loadError || geoError ? (
        <p className="mt-2 text-[13px] text-red-600" role="alert">
          {loadError || geoError}
        </p>
      ) : (
        <p className="mt-2 text-[12.5px] text-[#94A3B8]">
          Pick a verified US city from the list — typing alone is not enough.
        </p>
      )}
    </div>
  )
}
