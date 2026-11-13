'use client'

import { CornerDownLeft, Loader2, Search, X } from 'lucide-react'
import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
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

export type UsCityComboboxHandle = {
  focusAndOpen: () => void
  /** Resolve typed query → city (also calls onChange). Returns the city when committed. */
  tryCommitQuery: () => UsCity | null
}

type Props = {
  value: UsCity | null
  onChange: (city: UsCity | null) => void
  disabled?: boolean
  error?: string
}

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

function resolveCityFromQuery(query: string, options: UsCity[]): UsCity | null {
  const q = query.trim()
  if (!q) return null
  const pool = options.length > 0 ? options : searchUsCities(q, 10)
  if (!pool.length) return null
  const exact = pool.find((o) => o.label.toLowerCase() === q.toLowerCase())
  if (exact) return exact
  if (pool.length === 1) return pool[0]
  if (pool[0].label.toLowerCase() === q.toLowerCase()) return pool[0]
  return null
}

export const UsCityCombobox = forwardRef<UsCityComboboxHandle, Props>(
  function UsCityCombobox({ value, onChange, disabled, error }, ref) {
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

    function tryCommitQuery(): UsCity | null {
      if (value) return value
      const resolved = resolveCityFromQuery(query, options)
      if (!resolved) return null
      selectCity(resolved)
      return resolved
    }

    useImperativeHandle(ref, () => ({
      focusAndOpen: () => {
        if (value) {
          // Verified chip — switch back to the searchable input with the label.
          onChange(null)
          setQuery(value.label)
          if (ready) setOptions(searchUsCities(value.label, 10))
        } else if (ready) {
          setOptions(searchUsCities(query, 10))
        }
        setOpen(true)
        requestAnimationFrame(() => {
          inputRef.current?.focus()
          setOpen(true)
        })
      },
      tryCommitQuery,
    }))

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
        e.preventDefault()
        if (open && options[activeIndex]) {
          selectCity(options[activeIndex])
          return
        }
        if (!tryCommitQuery()) {
          setOpen(true)
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
      }
    }

    function onBlur() {
      // Defer so option clicks can fire first.
      window.setTimeout(() => {
        if (rootRef.current?.contains(document.activeElement)) return
        if (!value) tryCommitQuery()
        setOpen(false)
      }, 120)
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
    const needsSelectionHint = query.trim().length > 0 && !value && !open && !error
    const inputInvalid = Boolean(error) && !value

    return (
      <div ref={rootRef} className="relative">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <label htmlFor={inputId} className="text-[13px] font-semibold text-[#273449]">
            City
          </label>
          {!value ? (
            <button
              type="button"
              onClick={() => void snapToCurrentLocation()}
              disabled={disabled || locating || !ready}
              className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[#1D5CE5] transition hover:text-[#1649BD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/30 disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="onboarding-use-location"
            >
              {locating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : null}
              {locating ? 'Finding…' : 'Use current location'}
            </button>
          ) : null}
        </div>

        {value ? (
          <div
            className="flex items-center gap-3 rounded-lg border border-[#E2E8F0] bg-white px-4 py-3.5"
            data-testid="onboarding-city-verified"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-[#071330]">{value.label}</p>
              <p className="mt-0.5 text-[13px] text-[#64748B]">{stateDisplayName(value.stateCode)}</p>
            </div>
            <button
              type="button"
              onClick={clearSelection}
              disabled={disabled}
              className="shrink-0 text-[13px] font-semibold text-[#1D5CE5] transition hover:text-[#1649BD]"
              aria-label="Change city"
            >
              Change
            </button>
          </div>
        ) : (
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#94A3B8]"
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
              aria-invalid={inputInvalid || undefined}
              autoComplete="off"
              spellCheck={false}
              disabled={disabled || !ready}
              placeholder={ready ? 'Search US city or town…' : 'Loading US cities…'}
              value={query}
              onChange={(e) => onInputChange(e.target.value)}
              onFocus={() => {
                if (ready) {
                  setOptions(searchUsCities(query, 10))
                  setOpen(true)
                }
              }}
              onBlur={onBlur}
              onKeyDown={onKeyDown}
              data-testid="onboarding-city-input"
              className={`h-[52px] w-full rounded-lg border bg-white py-3 pl-11 pr-11 text-[15px] text-[#071330] outline-none transition placeholder:text-[#94A3B8] focus-visible:ring-4 disabled:opacity-60 ${
                inputInvalid
                  ? 'border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500/15'
                  : 'border-[#E2E8F0] focus-visible:border-[#1D5CE5] focus-visible:ring-[#1D5CE5]/15'
              }`}
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
                className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#94A3B8] transition hover:bg-[#F4F8FD] hover:text-[#071330]"
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
            className="absolute z-50 mt-2 max-h-[280px] w-full overflow-auto overscroll-contain rounded-lg border border-[#E2E8F0] bg-white p-1.5 shadow-[0_16px_40px_-18px_rgba(12,42,102,0.28)]"
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
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectCity(city)}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/40 ${
                      active ? 'bg-[#EEF4FF]' : 'hover:bg-[#F4F8FD]'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block text-[14.5px] font-semibold text-[#071330]">
                        {highlightMatch(city.label, query)}
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

        {loadError || geoError ? (
          <p className="mt-2 text-[13px] text-red-600" role="alert">
            {loadError || geoError}
          </p>
        ) : error ? (
          <p className="mt-2 text-[13px] font-medium text-red-600" role="alert" data-testid="onboarding-city-error">
            {error}
          </p>
        ) : needsSelectionHint ? (
          <p className="mt-2 text-[12.5px] font-medium text-[#64748B]">
            Select your city from the suggestions to continue.
          </p>
        ) : null}
      </div>
    )
  },
)
