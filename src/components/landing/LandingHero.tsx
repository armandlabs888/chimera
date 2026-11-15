'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Check, ChevronDown, MapPin, Search } from 'lucide-react'
import { useBeam } from '@/context/BeamContext'
import { ALL_CATEGORY_ICON, PARENT_ICONS } from '@/lib/categoryIcons'
import { readBrowseLocationPin } from '@/lib/browseLocationPreference'
import { BROWSE_PARENTS, type BrowseParentId } from '@/lib/taxonomy'
import { normalizeZipInput } from '@/lib/zip/format'
import './landing-v2.css'

function knownClientZip(input: {
  helperZip?: string | null
  pinZip?: string | null
  locationLabel?: string | null
}): string {
  const fromHelper = normalizeZipInput(input.helperZip ?? '')
  if (fromHelper) return fromHelper
  const fromPin = normalizeZipInput(input.pinZip ?? '')
  if (fromPin) return fromPin
  const fromLabel = (input.locationLabel || '').match(/\b(\d{5})\b/)
  return fromLabel ? fromLabel[1] : ''
}

type MenuPos = { top: number; left: number; width: number; maxHeight: number }

/**
 * Landing v2 hero. Full-bleed neighbor photo with navy overlays; search-first.
 * Live guests: category picker. Signed-in / demo: ZIP for Browse distance origin.
 */
export function LandingHero() {
  const router = useRouter()
  const { authUser, mode, helperVerification, currentUser } = useBeam()
  const isLiveGuest = mode === 'live' && !authUser
  const [query, setQuery] = useState('')
  const [zip, setZip] = useState('')
  const [zipPrefillReady, setZipPrefillReady] = useState(false)
  const [zipError, setZipError] = useState(false)
  const [category, setCategory] = useState<BrowseParentId | 'all'>('all')
  const [locOpen, setLocOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null)
  const locRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)

  const CategoryIcon =
    category === 'all' ? ALL_CATEGORY_ICON : PARENT_ICONS[category] ?? ALL_CATEGORY_ICON
  const categoryLabel =
    category === 'all'
      ? 'All categories'
      : BROWSE_PARENTS.find((p) => p.id === category)?.label ?? 'All categories'

  const prefillZip = useMemo(
    () =>
      knownClientZip({
        helperZip: helperVerification?.zip,
        pinZip: zipPrefillReady ? readBrowseLocationPin()?.zip : null,
        locationLabel: currentUser?.locationLabel,
      }),
    [helperVerification?.zip, currentUser?.locationLabel, zipPrefillReady],
  )

  useEffect(() => {
    setZipPrefillReady(true)
  }, [])

  useEffect(() => {
    if (!zipPrefillReady || isLiveGuest) return
    if (zip) return
    if (prefillZip) setZip(prefillZip)
  }, [zipPrefillReady, isLiveGuest, prefillZip, zip])

  useLayoutEffect(() => {
    if (!locOpen) {
      setMenuPos(null)
      return
    }

    function placeMenu() {
      const trigger = triggerRef.current
      if (!trigger) return
      const rect = trigger.getBoundingClientRect()
      const minWidth = Math.min(window.innerWidth - 16, Math.max(rect.width, 256))
      let left = rect.left
      if (left + minWidth > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - 8 - minWidth)
      }
      if (left < 8) left = 8

      // Prefer below the trigger; flip above when the list would leave the viewport.
      const gap = 8
      const chrome = 16 // list padding
      const estimatedHeight = chrome + 44 * (1 + BROWSE_PARENTS.length)
      const spaceBelow = Math.max(0, window.innerHeight - rect.bottom - gap)
      const spaceAbove = Math.max(0, rect.top - gap)
      const openUp = estimatedHeight > spaceBelow && spaceAbove > spaceBelow
      const available = openUp ? spaceAbove : spaceBelow
      const maxHeight = Math.max(
        44 * 3,
        Math.min(16 * 16, 0.45 * window.innerHeight, available),
      )
      const top = openUp
        ? Math.max(gap, rect.top - gap - maxHeight)
        : rect.bottom + gap

      setMenuPos({
        top,
        left,
        width: minWidth,
        maxHeight,
      })
    }

    placeMenu()
    window.addEventListener('resize', placeMenu)
    // Capture scroll from nested containers too; menu is fixed to the viewport.
    window.addEventListener('scroll', placeMenu, true)
    return () => {
      window.removeEventListener('resize', placeMenu)
      window.removeEventListener('scroll', placeMenu, true)
    }
  }, [locOpen])

  useEffect(() => {
    if (!locOpen) return
    function onDoc(e: MouseEvent) {
      const target = e.target as Node
      if (locRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setLocOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLocOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [locOpen])

  function onSearch(e: FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    const q = query.trim()
    if (q) params.set('q', q)
    if (isLiveGuest) {
      if (category !== 'all') params.set('category', category)
    } else {
      const digits = zip.replace(/\D/g, '').slice(0, 5)
      if (digits.length > 0 && digits.length !== 5) {
        setZipError(true)
        return
      }
      setZipError(false)
      if (digits.length === 5) params.set('zip', digits)
    }
    const qs = params.toString()
    router.push(qs ? `/browse?${qs}` : '/browse')
  }

  const categoryMenu =
    locOpen && menuPos && typeof document !== 'undefined'
      ? createPortal(
          <ul
            ref={menuRef}
            id="hero-category-listbox"
            role="listbox"
            data-testid="hero-category-listbox"
            className="fixed z-[80] overflow-y-auto overscroll-contain rounded-[10px] border border-[rgba(7,19,48,0.12)] bg-white py-1.5 shadow-[0_18px_40px_-12px_rgba(12,42,102,0.35)]"
            style={{
              top: menuPos.top,
              left: menuPos.left,
              width: menuPos.width,
              maxHeight: menuPos.maxHeight,
            }}
          >
            <li>
              <button
                type="button"
                role="option"
                aria-selected={category === 'all'}
                className={`flex min-h-11 w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-[14px] transition-colors hover:bg-white ${
                  category === 'all'
                    ? 'bg-[#EEF4FF] font-semibold text-[#1D5CE5]'
                    : 'text-[#071330]'
                }`}
                onClick={() => {
                  setCategory('all')
                  setLocOpen(false)
                }}
              >
                All categories
                {category === 'all' ? (
                  <Check className="h-4 w-4 shrink-0" aria-hidden />
                ) : null}
              </button>
            </li>
            {BROWSE_PARENTS.map((p) => {
              const Icon = PARENT_ICONS[p.id]
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={category === p.id}
                    className={`flex min-h-11 w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-[14px] transition-colors hover:bg-white ${
                      category === p.id
                        ? 'bg-[#EEF4FF] font-semibold text-[#1D5CE5]'
                        : 'text-[#4A5568]'
                    }`}
                    onClick={() => {
                      setCategory(p.id)
                      setLocOpen(false)
                    }}
                  >
                    <span className="inline-flex min-w-0 items-center gap-2.5">
                      <Icon className="h-4 w-4 shrink-0 text-[#1D5CE5]" aria-hidden />
                      <span className="truncate">{p.label}</span>
                    </span>
                    {category === p.id ? (
                      <Check className="h-4 w-4 shrink-0" aria-hidden />
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>,
          document.body,
        )
      : null

  return (
    <section className="landing-hero-photo relative isolate min-h-[100svh] rounded-none pb-0 pt-0 mb-0">
      {/* Clip the photo/overlays only; keep content overflow visible for popovers. */}
      <div
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-none"
        aria-hidden="true"
        data-testid="landing-hero-photo"
      >
        <Image
          src="/images/landing/hero-moving-neighbors.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          quality={85}
          className="landing-hero-photo-img rounded-none object-cover"
        />
        <div className="landing-hero-overlay absolute inset-0" />
        <div className="landing-hero-overlay-mute absolute inset-0" />
      </div>

      <div
        className="landing-hero-content relative z-20"
        data-testid="landing-hero"
      >
        <div className="beam-container relative z-10 text-center">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8FB2FF]">
            Local services · Real everyday help
          </p>

          <h1 className="mx-auto mt-5 max-w-[17ch] text-[44px] font-extrabold leading-[1.02] tracking-[-0.045em] text-white md:text-[72px]">
            <span className="block">Trusted help,</span>
            <span className="block whitespace-nowrap">
              right <span className="text-[#8FB2FF]">next door.</span>
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-[46ch] text-[15px] leading-6 text-white/80 md:text-[17px] md:leading-7">
            Describe the job, compare offers, and choose the help that fits your neighborhood.
          </p>

          <form
            onSubmit={onSearch}
            className="relative z-40 mx-auto mt-9 w-full max-w-[740px] text-left"
            data-testid="hero-search-pill"
          >
            <div className="flex flex-col gap-2 rounded-lg border border-[#E3E8EF] bg-white p-1.5 shadow-none sm:flex-row sm:items-center sm:gap-0 sm:p-2">
              <label className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[8px] px-3 py-2.5">
                <Search className="h-[18px] w-[18px] shrink-0 text-[#1D5CE5]" aria-hidden />
                <span className="sr-only">What help do you need?</span>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="What help do you need?"
                  className="min-w-0 flex-1 bg-transparent text-[15px] text-[#071330] outline-none placeholder:text-[#5B6576]"
                />
              </label>

              <span className="mx-1 hidden h-7 w-px bg-[#D7E0EC] sm:block" aria-hidden />

              <div className="relative min-w-0 flex-1" ref={locRef}>
                {isLiveGuest ? (
                  <>
                    <button
                      ref={triggerRef}
                      type="button"
                      className="flex min-h-11 w-full items-center gap-2.5 rounded-[8px] px-3 py-2.5 text-left"
                      aria-expanded={locOpen}
                      aria-haspopup="listbox"
                      aria-controls="hero-category-listbox"
                      data-testid="hero-category-trigger"
                      onClick={() => setLocOpen((v) => !v)}
                    >
                      <CategoryIcon className="h-[18px] w-[18px] shrink-0 text-[#1D5CE5]" aria-hidden />
                      <span
                        className={`min-w-0 flex-1 truncate text-[15px] ${
                          category === 'all' ? 'text-[#4A5568]' : 'text-[#071330]'
                        }`}
                      >
                        {categoryLabel}
                      </span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 shrink-0 text-[#4A5568] transition-transform ${
                          locOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {categoryMenu}
                  </>
                ) : (
                  <div className="w-full">
                    <label className="flex min-h-11 w-full items-center gap-2.5 rounded-[8px] px-3 py-2.5">
                      <MapPin className="h-[18px] w-[18px] shrink-0 text-[#1D5CE5]" aria-hidden />
                      <span className="sr-only">ZIP code</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="postal-code"
                        maxLength={5}
                        value={zip}
                        onChange={(e) => {
                          const next = e.target.value.replace(/\D/g, '').slice(0, 5)
                          setZip(next)
                          if (zipError) setZipError(false)
                        }}
                        placeholder="ZIP code"
                        aria-invalid={zipError || undefined}
                        aria-describedby={zipError ? 'hero-zip-error' : undefined}
                        data-testid="hero-zip-input"
                        className="min-w-0 flex-1 bg-transparent text-[15px] text-[#071330] outline-none placeholder:text-[#4A5568]"
                      />
                    </label>
                    {zipError ? (
                      <p
                        id="hero-zip-error"
                        role="alert"
                        data-testid="hero-zip-error"
                        className="px-3 pb-1.5 text-[12px] font-medium text-[#4A5568]"
                      >
                        Enter a 5-digit ZIP
                      </p>
                    ) : null}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="inline-flex h-11 min-h-11 shrink-0 items-center justify-center rounded-full bg-[#1D5CE5] px-[26px] text-[15px] font-semibold text-white shadow-none transition-colors hover:bg-[#1649BD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/45 focus-visible:ring-offset-2 sm:ml-1"
              >
                Find help
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}
