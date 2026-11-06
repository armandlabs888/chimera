'use client'

import {
  ArrowUpDown,
  Check,
  ChevronDown,
  Clock,
  MapPin,
  Search,
  SlidersHorizontal,
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
import { Avatar, EmptyState, ButtonLink } from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import { CATEGORIES, WHEN_OPTIONS } from '@/data/categories'
import { ALL_CATEGORY_ICON, CATEGORY_ICONS } from '@/lib/categoryIcons'
import { distanceBetween, formatLocation } from '@/lib/location'
import { formatBudget, formatRate } from '@/lib/matching'
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

function milesTo(
  entity: { lat?: number | null; lng?: number | null; neighborhood?: string },
  user: Person,
) {
  return distanceBetween(user, entity)
}

function trendingScore(helper: Person, user: Person, signedIn: boolean): number {
  let score = helper.rating * 12 + Math.min(helper.jobsCompleted, 40) * 0.55
  if (helper.availableNow) score += 28
  if (signedIn) {
    const d = milesTo(helper, user)
    if (d != null && Number.isFinite(d)) {
      if (d <= 5) score += 36 - d * 3
      else if (d <= 15) score += 18 - (d - 5)
      else if (d <= 25) score += 6
    } else {
      score += 4
    }
  }
  return score
}

export function Browse() {
  const { state, currentUser, authUser, mode } = useBeam()
  // Demo uses the seed user chrome; only live signed-out visitors are guests.
  const isGuest = mode === 'live' && !authUser
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
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
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
  const cityOrArea =
    (currentUser.city && currentUser.city.trim()) ||
    (userLocationLabel && userLocationLabel !== 'Local area'
      ? userLocationLabel.split(',')[0]?.trim()
      : '')

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
      .filter((r) => (when === 'all' ? true : r.when === when))
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
      .filter((p) => (avail === 'all' ? true : p.availability.includes(avail)))
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
      return (
        (da ?? Number.POSITIVE_INFINITY) - (db ?? Number.POSITIVE_INFINITY) || b.rating - a.rating
      )
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

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 }
    for (const c of CATEGORIES) counts[c.id] = 0
    if (tab === 'requests') {
      const open = state.requests.filter((r) => r.status === 'open')
      counts.all = open.length
      for (const r of open) {
        if (counts[r.category] != null) counts[r.category] += 1
      }
    } else {
      const helpers = state.people.filter(
        (p) => isBrowseHelper(p) && !(p.isCurrentUser || p.id === currentUser.id),
      )
      counts.all = helpers.length
      for (const p of helpers) {
        for (const skill of p.skills) {
          if (counts[skill] != null) counts[skill] += 1
        }
      }
    }
    return counts
  }, [state.requests, state.people, tab, currentUser.id])

  const trendingHelpers = useMemo(() => {
    return state.people
      .filter((p) => isBrowseHelper(p) && !(p.isCurrentUser || p.id === currentUser.id))
      .map((p) => ({ person: p, score: trendingScore(p, currentUser, !isGuest) }))
      .sort((a, b) => b.score - a.score || b.person.rating - a.person.rating)
      .slice(0, 5)
      .map((x) => x.person)
  }, [state.people, currentUser, isGuest])

  function setTab(next: string) {
    const nextParams = new URLSearchParams(params.toString())
    if (next === 'people') nextParams.set('tab', 'people')
    else nextParams.delete('tab')
    if (next !== 'people') nextParams.delete('free')
    if (next === 'people') nextParams.delete('when')
    else nextParams.delete('avail')
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
  const sortLabel =
    sortOptions.find((o) => o.id === sort)?.label ?? (isGuest ? 'Newest first' : 'Nearest')
  const radiusLabel = RADIUS_FILTER_OPTIONS.find((o) => o.id === radius)?.label ?? 'Any distance'
  const whenLabel = WHEN_FILTER_OPTIONS.find((o) => o.id === when)?.label ?? 'Any timing'
  const availLabel = AVAIL_FILTER_OPTIONS.find((o) => o.id === avail)?.label ?? 'Any availability'
  const categoryLabel =
    category === 'all' ? null : (CATEGORIES.find((c) => c.id === category)?.shortLabel ?? category)

  const hasActiveFilters =
    category !== 'all' ||
    !!qParam ||
    freeOnly ||
    when !== 'all' ||
    avail !== 'all' ||
    (!isGuest && radius !== 'all')

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
      onSelect(options[(idx + 1) % options.length])
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      onSelect(options[(idx - 1 + options.length) % options.length])
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

  const showFreshMarketplace =
    tab === 'requests' && !hasActiveFilters && openRequests.length === 0
  const showFilteredRequestsEmpty =
    tab === 'requests' && hasActiveFilters && openRequests.length === 0
  const showHelpersEmpty = tab === 'people' && people.length === 0

  const trendingTitle = isGuest
    ? 'Trending helpers'
    : cityOrArea
      ? `Trending helpers near ${cityOrArea}`
      : 'Trending helpers in your area'

  const filterSurface =
    'rounded-xl border border-[rgba(7,19,48,0.08)] bg-white shadow-[0_8px_24px_-14px_rgba(12,42,102,0.08)]'

  function renderSidebarFilterList(
    label: string,
    options: { id: string; label: string }[],
    current: string,
    onSelect: (id: string) => void,
  ) {
    return (
      <div className="space-y-1.5">
        <p className="px-1 text-[11.5px] font-bold uppercase tracking-[0.08em] text-[#94A3B8]">
          {label}
        </p>
        <ul className="space-y-0.5">
          {options.map((opt) => {
            const active = current === opt.id
            return (
              <li key={opt.id}>
                <button
                  type="button"
                  onClick={() => onSelect(opt.id)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[13.5px] transition ${
                    active
                      ? 'bg-[#EEF4FF] font-semibold text-[#1D5CE5]'
                      : 'font-medium text-[#475569] hover:bg-[#F4F8FD] hover:text-[#071330]'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {active ? <Check className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  function renderFiltersSidebar() {
    return (
      <div className={`${filterSurface} overflow-hidden`}>
        <div className="flex items-center justify-between gap-3 border-b border-[#E2E8F0] px-4 py-3">
          <h2 className="text-[14px] font-bold text-[#071330]">Filters</h2>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="text-[12.5px] font-semibold text-[#1D5CE5] transition hover:text-[#1649BD]"
            >
              Reset
            </button>
          ) : null}
        </div>

        <div className="space-y-4 px-3 py-3.5">
          <div className="space-y-1.5">
            <p className="px-1 text-[11.5px] font-bold uppercase tracking-[0.08em] text-[#94A3B8]">
              Category
            </p>
            <ul className="space-y-0.5">
              <li>
                <CategoryRow
                  active={category === 'all'}
                  onClick={() => setCategory('all')}
                  label="All"
                  icon={ALL_CATEGORY_ICON}
                  count={categoryCounts.all}
                />
              </li>
              {CATEGORIES.map((c) => (
                <li key={c.id}>
                  <CategoryRow
                    active={category === c.id}
                    onClick={() => setCategory(c.id)}
                    label={c.shortLabel}
                    icon={CATEGORY_ICONS[c.id]}
                    count={categoryCounts[c.id] ?? 0}
                  />
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-[#E2E8F0] pt-4">
            {isGuest ? (
              tab === 'requests'
                ? renderSidebarFilterList('Timing', WHEN_FILTER_OPTIONS, when, setWhen)
                : renderSidebarFilterList('Availability', AVAIL_FILTER_OPTIONS, avail, setAvail)
            ) : (
              <>
                <div className="mb-4">
                  {renderSidebarFilterList('Distance', RADIUS_FILTER_OPTIONS, radius, setRadius)}
                </div>
                {tab === 'requests'
                  ? renderSidebarFilterList('When', WHEN_FILTER_OPTIONS, when, setWhen)
                  : renderSidebarFilterList('Availability', AVAIL_FILTER_OPTIONS, avail, setAvail)}
              </>
            )}
          </div>

          {tab === 'people' || freeOnly ? (
            <div className="border-t border-[#E2E8F0] pt-4">
              <button
                type="button"
                onClick={toggleFree}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13.5px] font-semibold transition ${
                  freeOnly
                    ? 'bg-[#EEF4FF] text-[#1D5CE5]'
                    : 'text-[#475569] hover:bg-[#F4F8FD] hover:text-[#071330]'
                }`}
              >
                <Sun className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                <Clock className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                Afternoons &amp; evenings
              </button>
            </div>
          ) : null}

          <div className="border-t border-[#E2E8F0] pt-4">
            {renderSidebarFilterList(
              'Sort',
              sortOptions.map((o) => ({ id: o.id, label: o.label })),
              sort,
              setSort,
            )}
          </div>
        </div>
      </div>
    )
  }

  function renderTrendingHelpers() {
    return (
      <div className="space-y-3">
        <div className={`${filterSurface} overflow-hidden`} data-testid="browse-trending-helpers">
          <div className="border-b border-[#E2E8F0] px-4 py-3">
            <h2 className="text-[14px] font-bold text-[#071330]">{trendingTitle}</h2>
          </div>

          {trendingHelpers.length === 0 ? (
            <div className="px-4 py-5">
              <p className="text-[13.5px] font-semibold text-[#071330]">No helpers in your area yet</p>
              <p className="mt-1 text-[12.5px] leading-snug text-[#64748B]">
                Be the first neighbor to set up a helper profile.
              </p>
              <Link
                href="/onboarding/helper"
                className="mt-3 inline-flex text-[13px] font-semibold text-[#1D5CE5] transition hover:text-[#1649BD]"
              >
                Become a helper →
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-[#F1F5F9]">
              {trendingHelpers.map((helper) => {
                const miles = !isGuest ? milesTo(helper, currentUser) : null
                const skillLabels = helper.skills
                  .slice(0, 2)
                  .map((id) => CATEGORIES.find((c) => c.id === id)?.shortLabel ?? id)
                return (
                  <li key={helper.id}>
                    <Link
                      href={`/people/${helper.id}`}
                      className="flex gap-3 px-4 py-3 transition hover:bg-[#F8FBFF]"
                    >
                      <span className="relative shrink-0">
                        <Avatar src={helper.avatar} name={helper.name} size={42} />
                        {helper.availableNow ? (
                          <span
                            className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#22C55E]"
                            aria-label="Available now"
                          />
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="truncate text-[14px] font-bold text-[#071330]">
                            {helper.name}
                          </span>
                          <span className="shrink-0 font-display text-[14.5px] font-bold tabular-nums text-[#071330]">
                            {formatRate(helper)}
                          </span>
                        </span>
                        <span className="mt-0.5 block truncate text-[12.5px] text-[#64748B]">
                          ★ {helper.rating.toFixed(1)} · {helper.jobsCompleted} tasks
                          {miles != null && Number.isFinite(miles)
                            ? ` · ${miles < 10 ? miles.toFixed(1) : Math.round(miles)} mi`
                            : ` · ${formatLocation(helper)}`}
                        </span>
                        {skillLabels.length ? (
                          <span className="mt-1.5 flex flex-wrap gap-1">
                            {skillLabels.map((label) => (
                              <span
                                key={label}
                                className="rounded-full bg-[#F4F8FD] px-2 py-0.5 text-[11px] font-semibold text-[#475569]"
                              >
                                {label}
                              </span>
                            ))}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}

          {trendingHelpers.length > 0 ? (
            <div className="border-t border-[#E2E8F0] px-4 py-3">
              <button
                type="button"
                onClick={() => setTab('people')}
                className="text-[13px] font-semibold text-[#1D5CE5] transition hover:text-[#1649BD]"
              >
                View all helpers →
              </button>
            </div>
          ) : null}
        </div>

        <div className={`${filterSurface} px-4 py-3.5`}>
          <p className="text-[13.5px] font-bold text-[#071330]">Need a hand today?</p>
          <p className="mt-1 text-[12.5px] leading-snug text-[#64748B]">
            Post a task and get offers from reviewed neighbors nearby.
          </p>
          <Link
            href="/post"
            className="mt-2.5 inline-flex text-[13px] font-semibold text-[#1D5CE5] transition hover:text-[#1649BD]"
          >
            Post a task →
          </Link>
        </div>

        {!currentUser.isHelper ? (
          <div className={`${filterSurface} px-4 py-3.5`}>
            <p className="text-[13.5px] font-bold text-[#071330]">Earn in your neighborhood</p>
            <p className="mt-1 text-[12.5px] leading-snug text-[#64748B]">
              Set up a helper profile and pick up nearby tasks.
            </p>
            <Link
              href="/onboarding/helper"
              className="mt-2.5 inline-flex text-[13px] font-semibold text-[#1D5CE5] transition hover:text-[#1649BD]"
            >
              Helper profile →
            </Link>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="py-1 sm:py-0">
      <div
        data-testid="browse-3col-grid"
        className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(248px,268px)_minmax(0,1fr)] lg:gap-6 xl:grid-cols-[minmax(248px,268px)_minmax(0,1fr)_minmax(300px,328px)]"
      >
        <aside
          data-testid="browse-filters-sidebar"
          className="hidden max-h-[calc(100vh-6.5rem)] overflow-y-auto overscroll-contain lg:block lg:sticky lg:top-24 lg:self-start"
        >
          {renderFiltersSidebar()}
        </aside>

        <div data-testid="browse-feed-main" className="min-w-0">
          <div className="mb-4 flex flex-col gap-4 sm:mb-5">
            <div className="max-w-2xl">
              <h1 className="font-display text-[clamp(1.75rem,3.2vw,2.35rem)] font-bold leading-[1.15] tracking-[-0.02em] text-[#071330] text-balance">
                Browse Local Jobs
              </h1>
              <p className="mt-1.5 max-w-[52ch] text-[14.5px] leading-[1.55] text-[#64748B] sm:text-[15px]">
                {isGuest
                  ? 'Compare open neighborhood requests with upfront budgets, or connect with reviewed helpers nearby.'
                  : `Open requests and reviewed helpers near ${userLocationLabel}.`}
              </p>
            </div>

            <div
              className="inline-flex self-start rounded-full border border-[rgba(7,19,48,0.1)] bg-white p-1 shadow-[0_8px_20px_-12px_rgba(12,42,102,0.12)]"
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
          </div>

          {/* Compact category + filters access on < lg */}
          <div className="mb-3 lg:hidden">
            <div className="hide-scrollbar mb-2 flex gap-2 overflow-x-auto pb-1">
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
            </div>
            <button
              type="button"
              onClick={() => setMobileFiltersOpen((v) => !v)}
              className={`inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition ${
                mobileFiltersOpen || hasActiveFilters
                  ? 'bg-[#1D5CE5] text-white'
                  : 'bg-white text-[#475569] ring-1 ring-[rgba(7,19,48,0.1)]'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden />
              Filters
            </button>
            {mobileFiltersOpen ? <div className="mt-3">{renderFiltersSidebar()}</div> : null}
          </div>

          {/* Command bar: search + distance/timing + sort */}
          <div className="relative z-30 mb-3" data-testid="browse-command-bar">
            <div className="flex w-full max-w-[780px] flex-col gap-2 rounded-xl border border-[rgba(7,19,48,0.09)] bg-white p-2 shadow-[0_12px_32px_-12px_rgba(12,42,102,0.08)] lg:max-w-[45rem] lg:flex-row lg:items-center lg:gap-0">
              <label className="relative flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-3 py-2.5 sm:px-4 lg:flex-1">
                <Search className="h-[18px] w-[18px] shrink-0 text-[#1D5CE5]" aria-hidden />
                <span className="sr-only">Search browse</span>
                <input
                  value={qDraft}
                  onChange={(e) => setQDraft(e.target.value)}
                  placeholder="Search tasks or skills…"
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

              <div className="relative min-w-0 flex-1 lg:w-[11.25rem] lg:flex-none" ref={areaRef}>
                {isGuest ? (
                  <>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left sm:px-4"
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
                        className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-[min(18rem,50vh)] overflow-y-auto overscroll-contain rounded-xl border border-[rgba(7,19,48,0.12)] bg-white py-1.5 shadow-[0_18px_40px_-12px_rgba(12,42,102,0.35),0_4px_12px_rgba(12,42,102,0.12)] lg:left-0 lg:right-auto lg:min-w-[17rem]"
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
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left sm:px-4"
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
                        className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-[min(18rem,50vh)] overflow-y-auto overscroll-contain rounded-xl border border-[rgba(7,19,48,0.12)] bg-white py-1.5 shadow-[0_18px_40px_-12px_rgba(12,42,102,0.35),0_4px_12px_rgba(12,42,102,0.12)] lg:left-0 lg:right-auto lg:min-w-[17rem]"
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

              <div className="relative min-w-0 flex-1 lg:w-[10.75rem] lg:flex-none" ref={sortRef}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left sm:px-4"
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
                    className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-y-auto rounded-xl border border-[rgba(7,19,48,0.12)] bg-white py-1.5 shadow-[0_18px_40px_-12px_rgba(12,42,102,0.35),0_4px_12px_rgba(12,42,102,0.12)] lg:left-auto lg:right-0 lg:min-w-[14rem]"
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
                          {sort === opt.id ? (
                            <Check className="h-4 w-4 shrink-0" aria-hidden />
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          </div>

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
              {tab === 'requests' && when !== 'all' ? (
                <FilterSummaryPill label={whenLabel} onRemove={removeWhen} />
              ) : null}
              {tab === 'people' && avail !== 'all' ? (
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

          {showFreshMarketplace ? (
            <div
              className="rounded-xl border border-[rgba(7,19,48,0.08)] bg-white px-6 py-14 text-center shadow-[0_12px_32px_-16px_rgba(12,42,102,0.1)] sm:px-10"
              data-testid="browse-fresh-empty"
            >
              <span className="inline-flex items-center rounded-full border border-[rgba(7,19,48,0.1)] bg-[#FFF8D6] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#071330]">
                Fresh marketplace
              </span>
              <h2 className="mt-4 font-display text-[clamp(1.6rem,3vw,2.1rem)] font-bold tracking-[-0.02em] text-[#071330]">
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
          ) : showFilteredRequestsEmpty ? (
            <EmptyState
              title="No open requests match"
              body="Try clearing filters or post a request for your neighborhood."
              action={
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex h-10 items-center justify-center rounded-full bg-[#1D5CE5] px-4 text-[13.5px] font-semibold text-white transition hover:bg-[#1649BD]"
                  data-testid="browse-reset-filters"
                >
                  Reset filters
                </button>
              }
            />
          ) : tab === 'requests' ? (
            <div className="grid auto-rows-fr gap-x-5 gap-y-7 sm:grid-cols-2 2xl:grid-cols-2">
              {openRequests.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          ) : people.length ? (
            <div className="grid auto-rows-fr gap-5 sm:grid-cols-2 2xl:grid-cols-2">
              {people.map((person) => (
                <PersonCard key={person.id} person={person} />
              ))}
            </div>
          ) : showHelpersEmpty ? (
            <EmptyState
              title={hasActiveFilters ? 'No local helpers match' : 'No helpers nearby yet'}
              body={
                hasActiveFilters
                  ? 'Widen category or availability filters, or reset to see everyone nearby.'
                  : 'Be the first neighbor to set up a helper profile and start earning.'
              }
              action={
                hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex h-10 items-center justify-center rounded-full bg-[#1D5CE5] px-4 text-[13.5px] font-semibold text-white transition hover:bg-[#1649BD]"
                    data-testid="browse-reset-filters"
                  >
                    Reset filters
                  </button>
                ) : (
                  <ButtonLink href="/onboarding/helper" variant="brand">
                    Become a helper
                  </ButtonLink>
                )
              }
            />
          ) : null}

        </div>

        {/* Right rail on xl+; stacks below feed on smaller breakpoints */}
        <aside className="min-w-0 max-h-none overflow-visible md:max-w-xl lg:col-span-2 xl:col-span-1 xl:sticky xl:top-24 xl:max-h-[calc(100vh-6.5rem)] xl:max-w-none xl:self-start xl:overflow-y-auto xl:overscroll-contain">
          {renderTrendingHelpers()}
        </aside>
      </div>
    </div>
  )
}

function CategoryRow({
  label,
  active,
  onClick,
  icon: Icon,
  count,
}: {
  label: string
  active: boolean
  onClick: () => void
  icon: LucideIcon
  count: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13.5px] transition ${
        active
          ? 'bg-[#EEF4FF] font-semibold text-[#1D5CE5]'
          : 'font-medium text-[#475569] hover:bg-[#F4F8FD] hover:text-[#071330]'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span
        className={`inline-flex min-w-[1.35rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
          active ? 'bg-white/80 text-[#1D5CE5]' : 'bg-[#F4F8FD] text-[#64748B]'
        }`}
      >
        {count}
      </span>
    </button>
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
