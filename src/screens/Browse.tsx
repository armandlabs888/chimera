'use client'

import {
  ArrowUpDown,
  Check,
  ChevronDown,
  Clock,
  MapPin,
  Search,
  Sun,
  X,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { PersonCard } from '@/components/PersonCard'
import { RequestCard } from '@/components/RequestCard'
import { EmptyState, ButtonLink } from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import { CATEGORIES, WHEN_OPTIONS } from '@/data/categories'
import { ALL_CATEGORY_ICON, CATEGORY_ICONS } from '@/lib/categoryIcons'
import { distanceBetween, formatLocation } from '@/lib/location'
import { formatBudget } from '@/lib/matching'
import type { AvailabilitySlot, Person, WhenOption } from '@/types'

type SortMode = 'nearest' | 'newest' | 'budget'
type RadiusMiles = 'all' | '3' | '5' | '10' | '25'

const REQUEST_SORT_OPTIONS: { id: SortMode; label: string }[] = [
  { id: 'nearest', label: 'Nearest' },
  { id: 'newest', label: 'Newest first' },
  { id: 'budget', label: 'Highest budget' },
]

const PEOPLE_SORT_OPTIONS: { id: SortMode; label: string }[] = [
  { id: 'nearest', label: 'Nearest' },
  { id: 'newest', label: 'Top rated' },
  { id: 'budget', label: 'Lowest rate' },
]

const WHEN_FILTER_OPTIONS: { id: WhenOption | 'all'; label: string }[] = [
  { id: 'all', label: 'Any timing' },
  ...WHEN_OPTIONS.map((w) => ({ id: w.id, label: w.label })),
]

const AVAIL_FILTER_OPTIONS: { id: AvailabilitySlot | 'all'; label: string }[] = [
  { id: 'all', label: 'Any availability' },
  { id: 'mornings', label: 'Mornings' },
  { id: 'afternoons', label: 'Afternoons' },
  { id: 'evenings', label: 'Evenings' },
  { id: 'weekends', label: 'Weekends' },
]

const RADIUS_FILTER_OPTIONS: { id: RadiusMiles; label: string }[] = [
  { id: 'all', label: 'Any distance' },
  { id: '3', label: 'Within 3 mi' },
  { id: '5', label: 'Within 5 mi' },
  { id: '10', label: 'Within 10 mi' },
  { id: '25', label: 'Within 25 mi' },
]

function parseWhen(value: string | null): WhenOption | 'all' {
  if (value === 'asap' || value === 'today' || value === 'tomorrow' || value === 'this-week') {
    return value
  }
  return 'all'
}

function parseAvail(value: string | null): AvailabilitySlot | 'all' {
  if (
    value === 'mornings' ||
    value === 'afternoons' ||
    value === 'evenings' ||
    value === 'weekends'
  ) {
    return value
  }
  return 'all'
}

function parseRadius(value: string | null): RadiusMiles {
  if (value === '3' || value === '5' || value === '10' || value === '25') return value
  return 'all'
}

function isBlankZeroCard(person: Person): boolean {
  if (person.rateType === 'quote') return false
  return !(person.hourlyRate > 0)
}

function isBrowseHelper(person: Person): boolean {
  return Boolean(person.isHelper || person.skills.length > 0) && !isBlankZeroCard(person)
}

function milesTo(entity: { lat?: number | null; lng?: number | null; neighborhood?: string }, user: Person) {
  return distanceBetween(user, entity)
}

export function Browse() {
  const { state, currentUser, authUser } = useBeam()
  const isGuest = !authUser
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [, startTransition] = useTransition()

  const tab = params.get('tab') === 'people' ? 'people' : 'requests'
  const category = params.get('category') ?? 'all'
  const radius = parseRadius(params.get('radius'))
  const when = parseWhen(params.get('when'))
  const avail = parseAvail(params.get('avail'))
  const qParam = params.get('q') ?? ''
  const freeOnly = params.get('free') === '1'
  const sortParam = params.get('sort') as SortMode | null
  const sort: SortMode =
    isGuest && (!sortParam || sortParam === 'nearest')
      ? 'newest'
      : sortParam || (isGuest ? 'newest' : 'nearest')

  const [qDraft, setQDraft] = useState(qParam)
  const [areaOpen, setAreaOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const areaRef = useRef<HTMLDivElement>(null)
  const sortRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setQDraft(qParam)
  }, [qParam])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = qDraft.trim()
      if (next === qParam.trim()) return
      const nextParams = new URLSearchParams(params.toString())
      if (next) nextParams.set('q', next)
      else nextParams.delete('q')
      const qs = nextParams.toString()
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname)
      })
    }, 250)
    return () => window.clearTimeout(handle)
  }, [qDraft, qParam, params, pathname, router, startTransition])

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const target = e.target as Node
      if (!areaRef.current?.contains(target)) setAreaOpen(false)
      if (!sortRef.current?.contains(target)) setSortOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setAreaOpen(false)
        setSortOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  function replaceQuery(nextParams: URLSearchParams) {
    const qs = nextParams.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }

  const q = qParam.toLowerCase().trim()
  const radiusMiles = radius === 'all' ? null : Number(radius)
  const userLocationLabel = formatLocation(currentUser)

  const openRequests = useMemo(() => {
    let list = state.requests
      .filter((r) => r.status === 'open')
      .filter((r) => (category === 'all' ? true : r.category === category))
      .filter((r) => {
        if (isGuest || radiusMiles == null) return true
        const d = milesTo(r, currentUser)
        if (d == null) return true
        return d <= radiusMiles
      })
      .filter((r) => (isGuest ? (when === 'all' ? true : r.when === when) : true))
      .filter((r) => {
        if (!q) return true
        return (
          r.title.toLowerCase().includes(q) ||
          r.details.toLowerCase().includes(q) ||
          r.category.includes(q) ||
          formatBudget(r).toLowerCase().includes(q) ||
          formatLocation(r).toLowerCase().includes(q)
        )
      })

    list = [...list].sort((a, b) => {
      if (sort === 'budget') return b.budget - a.budget
      if (sort === 'newest' || isGuest) {
        return +new Date(b.createdAt) - +new Date(a.createdAt)
      }
      const da = milesTo(a, currentUser)
      const db = milesTo(b, currentUser)
      const na = da ?? Number.POSITIVE_INFINITY
      const nb = db ?? Number.POSITIVE_INFINITY
      return na - nb || +new Date(b.createdAt) - +new Date(a.createdAt)
    })
    return list
  }, [state.requests, category, radiusMiles, when, q, sort, currentUser, isGuest])

  const people = useMemo(() => {
    let list = state.people
      .filter((p) => isBrowseHelper(p))
      .filter((p) => {
        const isSelf = p.isCurrentUser || p.id === currentUser.id
        return !isSelf
      })
      .filter((p) => (category === 'all' ? true : p.skills.includes(category as never)))
      .filter((p) => {
        if (isGuest || radiusMiles == null) return true
        const d = milesTo(p, currentUser)
        if (d == null) return true
        return d <= radiusMiles
      })
      .filter((p) =>
        isGuest ? (avail === 'all' ? true : p.availability.includes(avail)) : true,
      )
      .filter((p) => {
        if (!q) return true
        return (
          p.name.toLowerCase().includes(q) ||
          p.bio.toLowerCase().includes(q) ||
          p.skills.some((s) => s.includes(q)) ||
          formatLocation(p).toLowerCase().includes(q)
        )
      })
      .filter((p) =>
        freeOnly ? p.availability.includes('afternoons') || p.availability.includes('evenings') : true,
      )

    list = [...list].sort((a, b) => {
      if (sort === 'newest' || (isGuest && sort !== 'budget')) return b.rating - a.rating
      if (sort === 'budget') return a.hourlyRate - b.hourlyRate
      const da = milesTo(a, currentUser)
      const db = milesTo(b, currentUser)
      return (da ?? Number.POSITIVE_INFINITY) - (db ?? Number.POSITIVE_INFINITY) || b.rating - a.rating
    })
    return list
  }, [state.people, category, radiusMiles, avail, q, freeOnly, sort, currentUser, isGuest])

  const openRequestCount = useMemo(
    () => state.requests.filter((r) => r.status === 'open').length,
    [state.requests],
  )
  const helperCount = useMemo(
    () =>
      state.people.filter(
        (p) => isBrowseHelper(p) && !(p.isCurrentUser || p.id === currentUser.id),
      ).length,
    [state.people, currentUser.id],
  )

  const marketplaceEmpty = state.requests.length === 0

  function setTab(next: string) {
    const nextParams = new URLSearchParams(params.toString())
    if (next === 'people') nextParams.set('tab', 'people')
    else nextParams.delete('tab')
    if (next !== 'people') nextParams.delete('free')
    if (isGuest) {
      if (next === 'people') nextParams.delete('when')
      else nextParams.delete('avail')
    }
    replaceQuery(nextParams)
    setAreaOpen(false)
  }

  function setCategory(id: string) {
    const nextParams = new URLSearchParams(params.toString())
    if (id === 'all') nextParams.delete('category')
    else nextParams.set('category', id)
    replaceQuery(nextParams)
  }

  function setRadius(id: string) {
    const nextParams = new URLSearchParams(params.toString())
    if (id === 'all') nextParams.delete('radius')
    else nextParams.set('radius', id)
    // Drop legacy neighborhood chip param if present
    nextParams.delete('neighborhood')
    replaceQuery(nextParams)
    setAreaOpen(false)
  }

  function setWhen(id: string) {
    const nextParams = new URLSearchParams(params.toString())
    if (id === 'all') nextParams.delete('when')
    else nextParams.set('when', id)
    replaceQuery(nextParams)
    setAreaOpen(false)
  }

  function setAvail(id: string) {
    const nextParams = new URLSearchParams(params.toString())
    if (id === 'all') nextParams.delete('avail')
    else nextParams.set('avail', id)
    replaceQuery(nextParams)
    setAreaOpen(false)
  }

  function setSort(next: string) {
    const nextParams = new URLSearchParams(params.toString())
    const defaultSort = isGuest ? 'newest' : 'nearest'
    if (next === defaultSort) nextParams.delete('sort')
    else nextParams.set('sort', next)
    replaceQuery(nextParams)
    setSortOpen(false)
  }

  function toggleFree() {
    const nextParams = new URLSearchParams(params.toString())
    if (freeOnly) nextParams.delete('free')
    else nextParams.set('free', '1')
    nextParams.set('tab', 'people')
    replaceQuery(nextParams)
  }

  function clearFilters() {
    router.replace(pathname)
    setQDraft('')
  }

  function clearSearch() {
    setQDraft('')
    const nextParams = new URLSearchParams(params.toString())
    nextParams.delete('q')
    replaceQuery(nextParams)
  }

  function removeCategory() {
    setCategory('all')
  }

  function removeRadius() {
    setRadius('all')
  }

  function removeWhen() {
    setWhen('all')
  }

  function removeAvail() {
    setAvail('all')
  }

  function removeFree() {
    const nextParams = new URLSearchParams(params.toString())
    nextParams.delete('free')
    replaceQuery(nextParams)
  }

  const sortOptions = (tab === 'people' ? PEOPLE_SORT_OPTIONS : REQUEST_SORT_OPTIONS).filter(
    (o) => !(isGuest && o.id === 'nearest'),
  )
  const sortLabel = sortOptions.find((o) => o.id === sort)?.label ?? (isGuest ? 'Newest first' : 'Nearest')
  const radiusLabel =
    RADIUS_FILTER_OPTIONS.find((o) => o.id === radius)?.label ?? 'Any distance'
  const whenLabel = WHEN_FILTER_OPTIONS.find((o) => o.id === when)?.label ?? 'Any timing'
  const availLabel = AVAIL_FILTER_OPTIONS.find((o) => o.id === avail)?.label ?? 'Any availability'
  const categoryLabel =
    category === 'all' ? null : CATEGORIES.find((c) => c.id === category)?.shortLabel ?? category

  const guestMiddleActive =
    isGuest && ((tab === 'requests' && when !== 'all') || (tab === 'people' && avail !== 'all'))
  const hasActiveFilters =
    category !== 'all' ||
    !!qParam ||
    freeOnly ||
    (isGuest ? guestMiddleActive : radius !== 'all')

  function onListboxKeyDown(
    e: ReactKeyboardEvent,
    options: string[],
    current: string,
    onSelect: (id: string) => void,
    close: () => void,
  ) {
    const idx = options.indexOf(current)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = options[(idx + 1) % options.length]
      onSelect(next)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const next = options[(idx - 1 + options.length) % options.length]
      onSelect(next)
    } else if (e.key === 'Home') {
      e.preventDefault()
      onSelect(options[0])
    } else if (e.key === 'End') {
      e.preventDefault()
      onSelect(options[options.length - 1])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      close()
    }
  }

  const radiusOptionIds = RADIUS_FILTER_OPTIONS.map((o) => o.id)
  const whenOptionIds = WHEN_FILTER_OPTIONS.map((o) => o.id)
  const availOptionIds = AVAIL_FILTER_OPTIONS.map((o) => o.id)
  const sortOptionIds = sortOptions.map((o) => o.id)

  const guestMiddleTriggerId =
    tab === 'people' ? 'browse-availability-trigger' : 'browse-when-trigger'
  const guestMiddleListboxId =
    tab === 'people' ? 'browse-availability-listbox' : 'browse-when-listbox'
  const guestMiddleLabel = tab === 'people' ? availLabel : whenLabel
  const guestMiddleValue = tab === 'people' ? avail : when
  const guestMiddleIsDefault = guestMiddleValue === 'all'
  const guestMiddleOptions = tab === 'people' ? AVAIL_FILTER_OPTIONS : WHEN_FILTER_OPTIONS
  const guestMiddleOptionIds = tab === 'people' ? availOptionIds : whenOptionIds
  const guestMiddleSelect = tab === 'people' ? setAvail : setWhen

  return (
    <div className={isGuest ? 'py-1 sm:py-0' : 'px-4 py-5 sm:py-6'}>
      {/* Editorial marketplace header */}
      <div className="mb-6 flex flex-col gap-5 lg:mb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <span className="inline-flex items-center rounded-full border border-[rgba(7,19,48,0.1)] bg-[#FFF8D6] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#071330]">
            Marketplace
          </span>
          <h1 className="mt-3 font-display text-[clamp(2rem,4vw,2.75rem)] font-bold leading-[1.08] tracking-[-0.03em] text-[#071330] text-balance">
            Browse tasks &amp; local helpers
          </h1>
          <p className="mt-2 max-w-[52ch] text-[15px] leading-[1.55] text-[#64748B] sm:text-[16px]">
            {isGuest
              ? 'Compare open neighborhood requests with upfront budgets, or connect with reviewed helpers nearby.'
              : `Open requests and reviewed helpers near ${userLocationLabel}.`}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div
            className="inline-flex rounded-full border border-[rgba(7,19,48,0.1)] bg-white p-1 shadow-[0_8px_20px_-12px_rgba(12,42,102,0.12)]"
            role="tablist"
            aria-label="Browse mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'requests'}
              onClick={() => setTab('requests')}
              className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-semibold transition sm:px-4 ${
                tab === 'requests'
                  ? 'bg-[#1D5CE5] text-white shadow-sm'
                  : 'text-[#64748B] hover:text-[#071330]'
              }`}
            >
              Open requests
              <span
                className={`inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
                  tab === 'requests' ? 'bg-white/20 text-white' : 'bg-[#F4F8FD] text-[#475569]'
                }`}
              >
                {openRequestCount}
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'people'}
              onClick={() => setTab('people')}
              className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-semibold transition sm:px-4 ${
                tab === 'people'
                  ? 'bg-[#1D5CE5] text-white shadow-sm'
                  : 'text-[#64748B] hover:text-[#071330]'
              }`}
            >
              Local helpers
              <span
                className={`inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
                  tab === 'people' ? 'bg-white/20 text-white' : 'bg-[#F4F8FD] text-[#475569]'
                }`}
              >
                {helperCount}
              </span>
            </button>
          </div>
          <Link
            href="/post"
            className="inline-flex h-10 items-center justify-center rounded-full border border-[#1D5CE5]/30 px-4 text-[13.5px] font-semibold text-[#1D5CE5] transition hover:bg-[#EEF4FF]"
          >
            Post a task
          </Link>
        </div>
      </div>

      {/* Unified command bar */}
      <div className="relative z-30 mb-3">
        <div className="flex flex-col gap-2 rounded-[24px] border border-[rgba(7,19,48,0.09)] bg-white p-2 shadow-[0_12px_32px_-12px_rgba(12,42,102,0.08)] lg:flex-row lg:items-center lg:rounded-full lg:gap-0">
          <label className="relative flex min-w-0 flex-[1.4] items-center gap-2.5 rounded-full px-3 py-2.5 sm:px-4">
            <Search className="h-[18px] w-[18px] shrink-0 text-[#1D5CE5]" aria-hidden />
            <span className="sr-only">Search browse</span>
            <input
              value={qDraft}
              onChange={(e) => setQDraft(e.target.value)}
              placeholder="Search tasks, furniture assembly, cleaning, skills…"
              aria-label="Search browse"
              className="min-w-0 flex-1 bg-transparent text-[14.5px] text-[#071330] outline-none placeholder:text-[#94A3B8]"
            />
            {qDraft ? (
              <button
                type="button"
                onClick={clearSearch}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[#64748B] transition hover:bg-[#F4F8FD] hover:text-[#071330]"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </label>

          <span className="mx-1 hidden h-8 w-px bg-[rgba(7,19,48,0.1)] lg:block" aria-hidden />

          <div className="relative min-w-0 flex-1" ref={areaRef}>
            {isGuest ? (
              <>
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 rounded-full px-3 py-2.5 text-left sm:px-4"
                  aria-expanded={areaOpen}
                  aria-haspopup="listbox"
                  aria-controls={guestMiddleListboxId}
                  data-testid={guestMiddleTriggerId}
                  onClick={() => {
                    setAreaOpen((v) => !v)
                    setSortOpen(false)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setAreaOpen(true)
                      setSortOpen(false)
                    }
                  }}
                >
                  <Clock className="h-[18px] w-[18px] shrink-0 text-[#1D5CE5]" aria-hidden />
                  <span
                    className={`min-w-0 flex-1 truncate text-[14.5px] ${
                      guestMiddleIsDefault ? 'text-[#64748B]' : 'font-medium text-[#071330]'
                    }`}
                  >
                    {guestMiddleLabel}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-[#94A3B8] transition-transform ${
                      areaOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {areaOpen ? (
                  <ul
                    id={guestMiddleListboxId}
                    role="listbox"
                    data-testid={guestMiddleListboxId}
                    className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-[min(18rem,50vh)] overflow-y-auto overscroll-contain rounded-2xl border border-[rgba(7,19,48,0.12)] bg-white py-1.5 shadow-[0_18px_40px_-12px_rgba(12,42,102,0.35),0_4px_12px_rgba(12,42,102,0.12)] lg:left-0 lg:right-auto lg:min-w-[17rem]"
                    onKeyDown={(e) =>
                      onListboxKeyDown(
                        e,
                        guestMiddleOptionIds,
                        guestMiddleValue,
                        guestMiddleSelect,
                        () => setAreaOpen(false),
                      )
                    }
                  >
                    {guestMiddleOptions.map((opt) => (
                      <li key={opt.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={guestMiddleValue === opt.id}
                          className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-[14px] transition-colors hover:bg-[#F4F8FD] ${
                            guestMiddleValue === opt.id
                              ? 'bg-[#EEF4FF] font-semibold text-[#1D5CE5]'
                              : opt.id === 'all'
                                ? 'text-[#071330]'
                                : 'text-[#475569]'
                          }`}
                          onClick={() => guestMiddleSelect(opt.id)}
                        >
                          {opt.label}
                          {guestMiddleValue === opt.id ? (
                            <Check className="h-4 w-4 shrink-0" aria-hidden />
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 rounded-full px-3 py-2.5 text-left sm:px-4"
                  aria-expanded={areaOpen}
                  aria-haspopup="listbox"
                  aria-controls="browse-radius-listbox"
                  data-testid="browse-radius-trigger"
                  onClick={() => {
                    setAreaOpen((v) => !v)
                    setSortOpen(false)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setAreaOpen(true)
                      setSortOpen(false)
                    }
                  }}
                >
                  <MapPin className="h-[18px] w-[18px] shrink-0 text-[#1D5CE5]" aria-hidden />
                  <span
                    className={`min-w-0 flex-1 truncate text-[14.5px] ${
                      radius === 'all' ? 'text-[#64748B]' : 'font-medium text-[#071330]'
                    }`}
                  >
                    {radiusLabel}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-[#94A3B8] transition-transform ${
                      areaOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {areaOpen ? (
                  <ul
                    id="browse-radius-listbox"
                    role="listbox"
                    data-testid="browse-radius-listbox"
                    className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-[min(18rem,50vh)] overflow-y-auto overscroll-contain rounded-2xl border border-[rgba(7,19,48,0.12)] bg-white py-1.5 shadow-[0_18px_40px_-12px_rgba(12,42,102,0.35),0_4px_12px_rgba(12,42,102,0.12)] lg:left-0 lg:right-auto lg:min-w-[17rem]"
                    onKeyDown={(e) =>
                      onListboxKeyDown(e, radiusOptionIds, radius, setRadius, () =>
                        setAreaOpen(false),
                      )
                    }
                  >
                    {RADIUS_FILTER_OPTIONS.map((opt) => (
                      <li key={opt.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={radius === opt.id}
                          className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-[14px] transition-colors hover:bg-[#F4F8FD] ${
                            radius === opt.id
                              ? 'bg-[#EEF4FF] font-semibold text-[#1D5CE5]'
                              : opt.id === 'all'
                                ? 'text-[#071330]'
                                : 'text-[#475569]'
                          }`}
                          onClick={() => setRadius(opt.id)}
                        >
                          {opt.label}
                          {radius === opt.id ? (
                            <Check className="h-4 w-4 shrink-0" aria-hidden />
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            )}
          </div>

          <span className="mx-1 hidden h-8 w-px bg-[rgba(7,19,48,0.1)] lg:block" aria-hidden />

          <div className="relative min-w-0 flex-1 lg:max-w-[13.5rem]" ref={sortRef}>
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-full px-3 py-2.5 text-left sm:px-4"
              aria-expanded={sortOpen}
              aria-haspopup="listbox"
              aria-controls="browse-sort-listbox"
              aria-label="Sort results"
              data-testid="browse-sort-trigger"
              onClick={() => {
                setSortOpen((v) => !v)
                setAreaOpen(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setSortOpen(true)
                  setAreaOpen(false)
                }
              }}
            >
              <ArrowUpDown className="h-[18px] w-[18px] shrink-0 text-[#1D5CE5]" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-[14.5px] font-medium text-[#071330]">
                {sortLabel}
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-[#94A3B8] transition-transform ${
                  sortOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
            {sortOpen ? (
              <ul
                id="browse-sort-listbox"
                role="listbox"
                data-testid="browse-sort-listbox"
                className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-y-auto rounded-2xl border border-[rgba(7,19,48,0.12)] bg-white py-1.5 shadow-[0_18px_40px_-12px_rgba(12,42,102,0.35),0_4px_12px_rgba(12,42,102,0.12)] lg:left-auto lg:right-0 lg:min-w-[14rem]"
                onKeyDown={(e) =>
                  onListboxKeyDown(e, sortOptionIds, sort, setSort, () => setSortOpen(false))
                }
              >
                {sortOptions.map((opt) => (
                  <li key={opt.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={sort === opt.id}
                      className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-[14px] transition-colors hover:bg-[#F4F8FD] ${
                        sort === opt.id
                          ? 'bg-[#EEF4FF] font-semibold text-[#1D5CE5]'
                          : 'text-[#475569]'
                      }`}
                      onClick={() => setSort(opt.id)}
                    >
                      {opt.label}
                      {sort === opt.id ? <Check className="h-4 w-4 shrink-0" aria-hidden /> : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>

      {/* Single category icon-pill row */}
      <div className="hide-scrollbar mb-3 flex gap-2 overflow-x-auto pb-1">
        <CategoryPill
          active={category === 'all'}
          onClick={() => setCategory('all')}
          label="All"
          icon={ALL_CATEGORY_ICON}
        />
        {CATEGORIES.map((c) => (
          <CategoryPill
            key={c.id}
            active={category === c.id}
            onClick={() => setCategory(c.id)}
            label={c.shortLabel}
            icon={CATEGORY_ICONS[c.id]}
          />
        ))}
        {tab === 'people' || freeOnly ? (
          <button
            type="button"
            onClick={toggleFree}
            className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition ${
              freeOnly
                ? 'bg-[#1D5CE5] text-white'
                : 'bg-white text-[#475569] ring-1 ring-[rgba(7,19,48,0.1)] hover:text-[#071330]'
            }`}
          >
            <Sun className="h-[15px] w-[15px]" strokeWidth={2} aria-hidden />
            <Clock className="h-[15px] w-[15px]" strokeWidth={2} aria-hidden />
            Afternoons &amp; evenings
          </button>
        ) : null}
      </div>

      {/* Human active filter summary */}
      {hasActiveFilters ? (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {qParam ? (
            <FilterSummaryPill label={`Search: ${qParam}`} onRemove={clearSearch} />
          ) : null}
          {categoryLabel ? (
            <FilterSummaryPill label={categoryLabel} onRemove={removeCategory} />
          ) : null}
          {!isGuest && radius !== 'all' ? (
            <FilterSummaryPill label={radiusLabel} onRemove={removeRadius} />
          ) : null}
          {isGuest && tab === 'requests' && when !== 'all' ? (
            <FilterSummaryPill label={whenLabel} onRemove={removeWhen} />
          ) : null}
          {isGuest && tab === 'people' && avail !== 'all' ? (
            <FilterSummaryPill label={availLabel} onRemove={removeAvail} />
          ) : null}
          {freeOnly ? (
            <FilterSummaryPill label="Afternoons & evenings" onRemove={removeFree} />
          ) : null}
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center px-2 py-1 text-[13px] font-semibold text-[#64748B] transition hover:text-[#1D5CE5]"
          >
            Reset all
          </button>
        </div>
      ) : (
        <div className="mb-5" />
      )}

      {marketplaceEmpty ? (
        <div className="rounded-[28px] border border-[rgba(7,19,48,0.08)] bg-white px-6 py-14 text-center shadow-[0_12px_32px_-16px_rgba(12,42,102,0.1)] sm:px-10">
          <span className="inline-flex items-center rounded-full border border-[rgba(7,19,48,0.1)] bg-[#FFF8D6] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#071330]">
            Fresh marketplace
          </span>
          <h2 className="mt-4 font-display text-[clamp(1.6rem,3vw,2.1rem)] font-bold tracking-[-0.03em] text-[#071330]">
            Be the first on Beam
          </h2>
          <p className="mx-auto mt-2 max-w-[42ch] text-[15px] leading-[1.55] text-[#64748B]">
            No requests yet — post a task for neighbors nearby, or set up your helper profile and
            start earning.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href="/post" variant="brand">
              Post the first request
            </ButtonLink>
            <ButtonLink href="/onboarding/helper" variant="secondary">
              Become a helper
            </ButtonLink>
          </div>
        </div>
      ) : tab === 'requests' ? (
        openRequests.length ? (
          <div className="grid auto-rows-fr gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {openRequests.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No open requests match"
            body="Try clearing filters or post a request for your neighborhood."
            action={
              <ButtonLink href="/post" variant="brand">
                Post a request
              </ButtonLink>
            }
          />
        )
      ) : people.length ? (
        <div className="grid auto-rows-fr gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {people.map((person) => (
            <PersonCard key={person.id} person={person} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No local helpers match"
          body="Widen category or availability filters, or turn off the availability chip."
        />
      )}
    </div>
  )
}

function CategoryPill({
  label,
  active,
  onClick,
  icon: Icon,
}: {
  label: string
  active: boolean
  onClick: () => void
  icon: LucideIcon
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition ${
        active
          ? 'bg-[#1D5CE5] text-white'
          : 'bg-white text-[#475569] ring-1 ring-[rgba(7,19,48,0.1)] hover:text-[#071330]'
      }`}
    >
      <Icon className="h-[15px] w-[15px]" strokeWidth={2} aria-hidden />
      {label}
    </button>
  )
}

function FilterSummaryPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(7,19,48,0.1)] bg-white px-3 py-1.5 text-[13px] font-medium text-[#071330] transition hover:border-[#1D5CE5]/40 hover:text-[#1D5CE5]"
    >
      {label}
      <X className="h-3.5 w-3.5 opacity-70" aria-hidden />
      <span className="sr-only">Remove {label}</span>
    </button>
  )
}
