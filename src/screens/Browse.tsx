'use client'

import {
  ArrowUpDown,
  Check,
  ChevronDown,
  Clock,
  Crosshair,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Users,
  X,
  Zap,
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
import { BrowseFreshEmpty } from '@/components/browse/BrowseFreshEmpty'
import { WhileYouWait } from '@/components/browse/WhileYouWait'
import { PersonCard } from '@/components/PersonCard'
import { RequestCard } from '@/components/RequestCard'
import { Avatar, EmptyState, ButtonLink } from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import { CATEGORIES, WHEN_OPTIONS } from '@/data/categories'
import { useBrowseLocation } from '@/hooks/useBrowseLocation'
import { ALL_CATEGORY_ICON, CATEGORY_ICONS } from '@/lib/categoryIcons'
import { helperProfileProgress } from '@/lib/helperProfileProgress'
import { readJobAlertsPreference, writeJobAlertsPreference } from '@/lib/jobAlerts'
import { distanceBetween, formatLocation } from '@/lib/location'
import { formatBudget, formatRate } from '@/lib/matching'
import { formatPublicRating } from '@/lib/ratingDisplay'
import { hidesPeerHelperDiscovery, stripHelperDiscoveryParams } from '@/lib/roles'
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

const AVAIL_CHIP_OPTIONS: { id: AvailabilitySlot | 'all'; label: string }[] = [
  { id: 'all', label: 'Any' },
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

const RADIUS_SEGMENT_OPTIONS: { id: RadiusMiles; label: string }[] = [
  { id: 'all', label: 'Any' },
  { id: '3', label: '3' },
  { id: '5', label: '5' },
  { id: '10', label: '10' },
  { id: '25', label: '25' },
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
  origin: { lat?: number | null; lng?: number | null; neighborhood?: string },
) {
  return distanceBetween(origin, entity)
}

function trendingScore(
  helper: Person,
  origin: { lat?: number | null; lng?: number | null },
  signedIn: boolean,
): number {
  let score = helper.rating * 12 + Math.min(helper.jobsCompleted, 40) * 0.55
  if (helper.availableNow) score += 28
  if (signedIn) {
    const d = milesTo(helper, origin)
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
  const { origin: browseOrigin } = useBrowseLocation(currentUser)
  const browseAnchor = useMemo(
    () => ({
      lat: browseOrigin.lat,
      lng: browseOrigin.lng,
      locationLabel: browseOrigin.locationLabel,
      city: browseOrigin.city,
      stateCode: browseOrigin.stateCode,
    }),
    [browseOrigin],
  )
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [, startTransition] = useTransition()

  const hidePeerDiscovery = hidesPeerHelperDiscovery(currentUser, isGuest)
  const urlTab = params.get('tab') === 'people' ? 'people' : 'requests'
  // Synchronous guard — never flash peer helpers while URL/history still says people.
  const tab = hidePeerDiscovery ? 'requests' : urlTab
  const category = params.get('category') ?? 'all'
  const radius = parseRadius(params.get('radius'))
  const when = parseWhen(params.get('when'))
  const avail = hidePeerDiscovery ? 'all' : parseAvail(params.get('avail'))
  const qParam = params.get('q') ?? ''
  const freeOnly = hidePeerDiscovery ? false : params.get('free') === '1'
  const sortParam = params.get('sort') as SortMode | null
  const sort: SortMode =
    isGuest && (!sortParam || sortParam === 'nearest')
      ? 'newest'
      : sortParam || (isGuest ? 'newest' : 'nearest')

  const [qDraft, setQDraft] = useState(qParam)
  const [areaOpen, setAreaOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [alertsEnabled, setAlertsEnabled] = useState(
    () => (typeof window === 'undefined' ? false : readJobAlertsPreference().enabled),
  )
  const areaRef = useRef<HTMLDivElement>(null)
  const sortRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setQDraft(qParam)
  }, [qParam])

  // Role-aware deep-link / history guard: normalize helper-discovery URLs to jobs.
  useEffect(() => {
    if (!hidePeerDiscovery) return
    const hasDiscovery =
      params.get('tab') === 'people' || params.get('free') === '1' || params.has('avail')
    if (!hasDiscovery) return
    const nextParams = stripHelperDiscoveryParams(params)
    // Also drop retired map mode if present on the same deep link.
    nextParams.delete('view')
    const qs = nextParams.toString()
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname)
    })
  }, [hidePeerDiscovery, params, pathname, router, startTransition])

  // Legacy ?view=map (and any view=*) falls back to the list/grid feed for all roles.
  useEffect(() => {
    if (!params.has('view')) return
    // Helper discovery redirect owns combined cleanup when both apply.
    if (
      hidePeerDiscovery &&
      (params.get('tab') === 'people' || params.get('free') === '1' || params.has('avail'))
    ) {
      return
    }
    const nextParams = new URLSearchParams(params.toString())
    nextParams.delete('view')
    const qs = nextParams.toString()
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname)
    })
  }, [hidePeerDiscovery, params, pathname, router, startTransition])

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
  const cityOrArea = browseOrigin.city || ''

  const openRequests = useMemo(() => {
    let list = state.requests
      .filter((r) => r.status === 'open')
      .filter((r) => (category === 'all' ? true : r.category === category))
      .filter((r) => {
        if (isGuest || radiusMiles == null) return true
        const d = milesTo(r, browseAnchor)
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
      const da = milesTo(a, browseAnchor)
      const db = milesTo(b, browseAnchor)
      const na = da ?? Number.POSITIVE_INFINITY
      const nb = db ?? Number.POSITIVE_INFINITY
      return na - nb || +new Date(b.createdAt) - +new Date(a.createdAt)
    })
    return list
  }, [state.requests, category, radiusMiles, when, q, sort, browseAnchor, isGuest])

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
        const d = milesTo(p, browseAnchor)
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
      const da = milesTo(a, browseAnchor)
      const db = milesTo(b, browseAnchor)
      return (
        (da ?? Number.POSITIVE_INFINITY) - (db ?? Number.POSITIVE_INFINITY) || b.rating - a.rating
      )
    })
    return list
  }, [state.people, category, radiusMiles, avail, q, freeOnly, sort, browseAnchor, currentUser.id, isGuest])

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
      .map((p) => ({ person: p, score: trendingScore(p, browseAnchor, !isGuest) }))
      .sort((a, b) => b.score - a.score || b.person.rating - a.person.rating)
      .slice(0, 5)
      .map((x) => x.person)
  }, [state.people, currentUser.id, browseAnchor, isGuest])

  const profileProgress = useMemo(() => helperProfileProgress(currentUser), [currentUser])
  const showProfileWaitCard =
    hidePeerDiscovery &&
    (currentUser.accountRole === 'helper' || Boolean(currentUser.isHelper)) &&
    (!currentUser.isHelper || profileProgress.percent < 100)

  function setTab(next: string) {
    if (hidePeerDiscovery && next === 'people') return
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
    if (hidePeerDiscovery) return
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

  function enableAlerts() {
    const next = writeJobAlertsPreference(true)
    setAlertsEnabled(next.enabled)
  }

  function toggleAlerts() {
    const next = writeJobAlertsPreference(!alertsEnabled)
    setAlertsEnabled(next.enabled)
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
  const showHelpersEmpty = !hidePeerDiscovery && tab === 'people' && people.length === 0
  const showDiscoveryChrome = !hidePeerDiscovery
  const showWhileYouWait = showFreshMarketplace && (hidePeerDiscovery || isGuest === false)

  const trendingSubtitle = isGuest
    ? 'Top-rated neighbors'
    : cityOrArea
      ? `Active near ${cityOrArea}`
      : 'Active near you'

  const filterSurface = 'rounded-lg border border-[#E2E8F0] bg-white'

  function renderFiltersSidebar() {
    return (
      <div className={`${filterSurface} flex h-fit max-h-full flex-col overflow-hidden`}>
        <div className="flex items-center justify-between gap-3 border-b border-[#F1F5F9] px-3.5 py-2.5">
          <h2 className="text-[13px] font-semibold text-[#071330]">Filters</h2>
          <button
            type="button"
            onClick={clearFilters}
            className={`text-[12px] font-semibold transition ${
              hasActiveFilters
                ? 'text-[#1D5CE5] hover:text-[#1649BD]'
                : 'text-[#94A3B8] hover:text-[#64748B]'
            }`}
            data-testid="browse-filters-reset"
          >
            Reset
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto px-3 py-3">
          <div className="space-y-1.5">
            <p className="px-0.5 text-[11.5px] font-bold uppercase tracking-[0.08em] text-[#94A3B8]">
              Categories
            </p>
            <ul className="space-y-0.5">
              <li>
                <CategoryRow
                  active={category === 'all'}
                  onClick={() => setCategory('all')}
                  label="All categories"
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
                    tint={c.tintFg}
                  />
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3 border-t border-[#F1F5F9] pt-3">
            {isGuest ? (
              tab === 'requests' ? (
                <WhenChipRow current={when} onSelect={setWhen} />
              ) : (
                <AvailChipRow current={avail} onSelect={setAvail} />
              )
            ) : (
              <>
                <div className="space-y-2">
                  <p className="px-0.5 text-[11.5px] font-bold uppercase tracking-[0.08em] text-[#94A3B8]">
                    Miles radius
                  </p>
                  <div
                    className="grid grid-cols-5 gap-0.5 rounded-lg bg-[#F1F5F9] p-0.5"
                    role="group"
                    aria-label="Miles radius"
                  >
                    {RADIUS_SEGMENT_OPTIONS.map((opt) => {
                      const active = radius === opt.id
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setRadius(opt.id)}
                          className={`inline-flex h-7 items-center justify-center rounded-md text-[12px] font-semibold transition ${
                            active
                              ? 'bg-white text-[#071330] shadow-[0_1px_2px_rgba(7,19,48,0.08)]'
                              : 'text-[#64748B] hover:text-[#071330]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                {tab === 'requests' ? (
                  <WhenChipRow current={when} onSelect={setWhen} />
                ) : (
                  <AvailChipRow current={avail} onSelect={setAvail} />
                )}
              </>
            )}
          </div>

          {tab === 'people' || freeOnly ? (
            <div className="border-t border-[#F1F5F9] pt-3">
              <button
                type="button"
                onClick={toggleFree}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] font-semibold transition ${
                  freeOnly
                    ? 'bg-[#1D5CE5]/[0.08] text-[#1D5CE5]'
                    : 'text-[#475569] hover:bg-[#F8FAFC] hover:text-[#071330]'
                }`}
              >
                <Sun className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                <Clock className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                Afternoons &amp; evenings
              </button>
            </div>
          ) : null}
        </div>

        <div className="mt-auto border-t border-[#F1F5F9] px-3.5 py-2.5">
          <Link
            href="/safety"
            className="flex items-center gap-2 text-[11.5px] font-medium text-[#64748B] transition hover:text-[#1D5CE5]"
          >
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
            Safety guidelines for every listing
          </Link>
        </div>
      </div>
    )
  }

  function renderTrendingHelpers(opts?: { omitTestId?: boolean }) {
    const emptyCity = cityOrArea || 'your area'
    return (
      <div
        className={`${filterSurface} flex h-fit max-h-full flex-col overflow-y-auto`}
        data-testid={opts?.omitTestId ? undefined : 'browse-trending-helpers'}
      >
        <div className="border-b border-[#F1F5F9] px-4 py-3">
          <h2 className="text-[14px] font-semibold text-[#071330]">Trending helpers</h2>
          <p className="mt-0.5 text-[12px] text-[#64748B]">{trendingSubtitle}</p>
        </div>

        {trendingHelpers.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <span className="mx-auto inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#F8FAFC] text-[#64748B]">
              <Users className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </span>
            <p className="mt-3 text-[13px] font-semibold text-[#071330]">
              No active helpers listed near {emptyCity} yet.
            </p>
            <Link
              href="/onboarding/helper"
              className="mt-2 inline-flex text-[12.5px] font-semibold text-[#1D5CE5] transition hover:text-[#1649BD]"
            >
              {currentUser.isHelper ? 'Complete helper profile →' : 'Become a local helper →'}
            </Link>
          </div>
        ) : (
          <ul className="px-1.5 py-1.5">
            {trendingHelpers.map((helper) => {
              const skillLabels = helper.skills
                .slice(0, 2)
                .map((id) => CATEGORIES.find((c) => c.id === id)?.shortLabel ?? id)
              const ratingLabel = formatPublicRating(helper)
              return (
                <li key={helper.id}>
                  <Link
                    href={`/people/${helper.id}`}
                    className="flex gap-2.5 rounded-lg px-3 py-2.5 transition hover:bg-[#F8FAFC]"
                  >
                    <span className="relative shrink-0">
                      <Avatar src={helper.avatar} name={helper.name} size={36} />
                      {helper.availableNow ? (
                        <span
                          className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500"
                          aria-label="Available now"
                        />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="truncate text-[13.5px] font-semibold text-[#071330]">
                          {helper.name}
                        </span>
                        <span className="shrink-0 font-display text-[13px] font-bold tabular-nums text-[#071330]">
                          {formatRate(helper)}
                        </span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[#64748B]">
                        {ratingLabel ? (
                          <span>★ {ratingLabel}</span>
                        ) : (
                          <span className="rounded bg-[#F1F5F9] px-1.5 py-0.5 text-[10.5px] font-medium text-[#64748B]">
                            New
                          </span>
                        )}
                      </span>
                      {skillLabels.length ? (
                        <span className="mt-1.5 flex flex-wrap gap-1">
                          {skillLabels.map((label) => (
                            <span
                              key={label}
                              className="rounded-md bg-[#F4F8FD] px-1.5 py-0.5 text-[11px] font-medium text-[#475569]"
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

        <div className="mt-auto flex items-center justify-between gap-2 rounded-b-lg border-t border-[#F1F5F9] bg-[#FAFBFD] px-4 py-2.5">
          <p className="truncate text-[12px] text-[#64748B]">Need something done today?</p>
          <Link
            href="/post"
            className="shrink-0 text-[12px] font-semibold text-[#1D5CE5] transition hover:text-[#1649BD]"
          >
            Post a task →
          </Link>
        </div>
      </div>
    )
  }

  const liveCount = tab === 'requests' ? openRequests.length : people.length

  return (
    <div className="xl:flex xl:h-full xl:min-h-0 xl:flex-col">
      <div
        data-testid="browse-3col-grid"
        data-browse-layout={showDiscoveryChrome ? 'discovery' : 'helper-jobs'}
        className={`grid grid-cols-1 gap-5 xl:h-full xl:min-h-0 xl:items-stretch xl:gap-5 ${
          showDiscoveryChrome
            ? 'xl:grid-cols-[248px_minmax(0,1fr)_292px]'
            : 'xl:grid-cols-[248px_minmax(0,1fr)]'
        }`}
      >
        <aside
          data-testid="browse-filters-sidebar"
          className="hidden xl:flex xl:h-full xl:min-h-0 xl:flex-col"
        >
          {renderFiltersSidebar()}
        </aside>

        <div
          data-testid="browse-feed-main"
          className="flex min-w-0 flex-col xl:h-full xl:min-h-0"
        >
          <div className="shrink-0 pb-3.5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2.5">
                  <h1 className="text-[22px] font-bold leading-tight tracking-[-0.02em] text-[#071330] sm:text-[24px]">
                    Browse Local Jobs
                  </h1>
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#E2E8F0]/80 px-1.5 text-[12px] font-semibold tabular-nums text-[#334155]">
                    {liveCount}
                  </span>
                </div>
              </div>

              {showDiscoveryChrome ? (
                <div className="flex shrink-0 flex-wrap items-center gap-2 self-start sm:self-auto">
                  <div
                    className="inline-flex h-9 shrink-0 rounded-lg border border-[#E2E8F0] bg-white p-0.5"
                    role="tablist"
                    aria-label="Browse mode"
                    data-testid="browse-mode-tabs"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={tab === 'requests'}
                      onClick={() => setTab('requests')}
                      className={`inline-flex h-full items-center gap-1.5 rounded-md px-3 text-[12.5px] font-semibold transition ${
                        tab === 'requests'
                          ? 'bg-[#1D5CE5] text-white'
                          : 'text-[#64748B] hover:text-[#071330]'
                      }`}
                    >
                      Open requests
                      <span
                        className={`tabular-nums ${
                          tab === 'requests' ? 'text-white/85' : 'text-[#94A3B8]'
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
                      data-testid="browse-tab-local-helpers"
                      className={`inline-flex h-full items-center gap-1.5 rounded-md px-3 text-[12.5px] font-semibold transition ${
                        tab === 'people'
                          ? 'bg-[#1D5CE5] text-white'
                          : 'text-[#64748B] hover:text-[#071330]'
                      }`}
                    >
                      Local helpers
                      <span
                        className={`tabular-nums ${
                          tab === 'people' ? 'text-white/85' : 'text-[#94A3B8]'
                        }`}
                      >
                        {helperCount}
                      </span>
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Command bar: search + distance/timing + sort */}
            <div className="relative z-30 mt-3" data-testid="browse-command-bar">
              <div className="flex w-full flex-col gap-1 rounded-lg border border-[#E2E8F0] bg-white px-2 py-1 shadow-[0_1px_2px_rgba(7,19,48,0.04)] sm:flex-row sm:items-center sm:gap-0">
                <label className="relative flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg px-2">
                  <Search className="h-4 w-4 shrink-0 text-[#64748B]" aria-hidden />
                  <span className="sr-only">Search browse</span>
                  <input
                    value={qDraft}
                    onChange={(e) => setQDraft(e.target.value)}
                    placeholder="Search titles, skills, neighborhoods…"
                    aria-label="Search browse"
                    className="min-w-0 flex-1 bg-transparent text-[13px] text-[#071330] outline-none placeholder:text-[#94A3B8]"
                  />
                  {qDraft ? (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[#64748B] transition hover:bg-[#F8FAFC] hover:text-[#071330]"
                      aria-label="Clear search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <kbd className="hidden rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-1.5 py-0.5 text-[10.5px] font-semibold text-[#94A3B8] sm:inline-flex">
                      ⌘K
                    </kbd>
                  )}
                </label>

                <span className="mx-0.5 hidden h-5 w-px bg-[#E2E8F0] sm:block" aria-hidden />

                <div
                  className="relative min-w-0 max-w-[180px] flex-1 sm:flex-none sm:w-[180px]"
                  ref={areaRef}
                >
                  {isGuest ? (
                    <>
                      <button
                        type="button"
                        className="flex h-9 w-full items-center gap-1.5 rounded-lg px-2 text-left"
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
                        <Clock className="h-3.5 w-3.5 shrink-0 text-[#64748B]" aria-hidden />
                        <span
                          className={`min-w-0 flex-1 truncate text-[13px] ${
                            guestMiddleIsDefault ? 'text-[#64748B]' : 'font-medium text-[#071330]'
                          }`}
                        >
                          {guestMiddleLabel}
                        </span>
                        <ChevronDown
                          className={`h-3.5 w-3.5 shrink-0 text-[#94A3B8] transition-transform ${
                            areaOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {areaOpen ? (
                        <ul
                          id={guestMiddleListboxId}
                          role="listbox"
                          data-testid={guestMiddleListboxId}
                          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-[min(18rem,50vh)] overflow-y-auto overscroll-contain rounded-lg border border-[#E2E8F0] bg-white py-1.5 shadow-[0_12px_32px_-8px_rgba(7,19,48,0.12)] sm:right-auto sm:min-w-[16rem]"
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
                                className={`flex w-full items-center justify-between gap-3 px-3.5 py-2 text-left text-[13px] transition-colors hover:bg-[#F8FAFC] ${
                                  guestMiddleValue === opt.id
                                    ? 'bg-[#EFF6FF] font-semibold text-[#1D5CE5]'
                                    : opt.id === 'all'
                                      ? 'text-[#071330]'
                                      : 'text-[#475569]'
                                }`}
                                onClick={() => guestMiddleSelect(opt.id)}
                              >
                                {opt.label}
                                {guestMiddleValue === opt.id ? (
                                  <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
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
                        className="flex h-9 w-full items-center gap-1.5 rounded-lg px-2 text-left"
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
                        <Crosshair className="h-3.5 w-3.5 shrink-0 text-[#64748B]" aria-hidden />
                        <span
                          className={`min-w-0 flex-1 truncate text-[13px] ${
                            radius === 'all' ? 'text-[#64748B]' : 'font-medium text-[#071330]'
                          }`}
                        >
                          {radiusLabel}
                        </span>
                        <ChevronDown
                          className={`h-3.5 w-3.5 shrink-0 text-[#94A3B8] transition-transform ${
                            areaOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {areaOpen ? (
                        <ul
                          id="browse-radius-listbox"
                          role="listbox"
                          data-testid="browse-radius-listbox"
                          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-[min(18rem,50vh)] overflow-y-auto overscroll-contain rounded-lg border border-[#E2E8F0] bg-white py-1.5 shadow-[0_12px_32px_-8px_rgba(7,19,48,0.12)] sm:right-auto sm:min-w-[16rem]"
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
                                className={`flex w-full items-center justify-between gap-3 px-3.5 py-2 text-left text-[13px] transition-colors hover:bg-[#F8FAFC] ${
                                  radius === opt.id
                                    ? 'bg-[#EFF6FF] font-semibold text-[#1D5CE5]'
                                    : opt.id === 'all'
                                      ? 'text-[#071330]'
                                      : 'text-[#475569]'
                                }`}
                                onClick={() => setRadius(opt.id)}
                              >
                                {opt.label}
                                {radius === opt.id ? (
                                  <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                ) : null}
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </>
                  )}
                </div>

                <span className="mx-0.5 hidden h-5 w-px bg-[#E2E8F0] sm:block" aria-hidden />

                <div
                  className="relative min-w-0 max-w-[160px] flex-1 sm:flex-none sm:w-[150px]"
                  ref={sortRef}
                >
                  <button
                    type="button"
                    className="flex h-9 w-full items-center gap-1.5 rounded-lg px-2 text-left"
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
                    <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-[#64748B]" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#071330]">
                      {sortLabel}
                    </span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 shrink-0 text-[#94A3B8] transition-transform ${
                        sortOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {sortOpen ? (
                    <ul
                      id="browse-sort-listbox"
                      role="listbox"
                      data-testid="browse-sort-listbox"
                      className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-y-auto rounded-lg border border-[#E2E8F0] bg-white py-1.5 shadow-[0_12px_32px_-8px_rgba(7,19,48,0.12)] sm:left-auto sm:right-0 sm:min-w-[13rem]"
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
                            className={`flex w-full items-center justify-between gap-3 px-3.5 py-2 text-left text-[13px] transition-colors hover:bg-[#F8FAFC] ${
                              sort === opt.id
                                ? 'bg-[#EFF6FF] font-semibold text-[#1D5CE5]'
                                : 'text-[#475569]'
                            }`}
                            onClick={() => setSort(opt.id)}
                          >
                            {opt.label}
                            {sort === opt.id ? (
                              <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            ) : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen((v) => !v)}
                  className={`ml-1 inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-semibold transition xl:hidden ${
                    mobileFiltersOpen || hasActiveFilters
                      ? 'bg-[#1D5CE5] text-white'
                      : 'text-[#475569] hover:bg-[#F8FAFC] hover:text-[#071330]'
                  }`}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
                  Filters
                </button>
              </div>
              {mobileFiltersOpen ? (
                <div className="mt-3 xl:hidden">{renderFiltersSidebar()}</div>
              ) : null}
            </div>

            {hasActiveFilters ? (
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
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
                  className="inline-flex h-6 items-center px-1.5 text-[11.5px] font-semibold text-[#64748B] transition hover:text-[#1D5CE5]"
                >
                  Clear all
                </button>
              </div>
            ) : null}
          </div>

          <div
            data-testid="browse-feed-scroll"
            className="browse-feed-scroll xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-1"
          >
            {showFreshMarketplace ? (
              <>
                <BrowseFreshEmpty
                  hidePeerDiscovery={hidePeerDiscovery}
                  cityLabel={cityOrArea || 'your area'}
                  onEnableAlerts={enableAlerts}
                  alertsEnabled={alertsEnabled}
                />
                {showWhileYouWait ? (
                  <WhileYouWait
                    alertsEnabled={alertsEnabled}
                    onToggleAlerts={toggleAlerts}
                    onWidenRadius={() => setRadius('25')}
                    profileProgress={profileProgress}
                    showProfileCard={showProfileWaitCard}
                  />
                ) : null}
              </>
            ) : showFilteredRequestsEmpty ? (
              <EmptyState
                title="No open requests match"
                body="Try clearing filters or post a request for your neighborhood."
                action={
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex h-9 items-center justify-center rounded-lg bg-[#1D5CE5] px-4 text-[13px] font-semibold text-white transition hover:bg-[#1649BD]"
                    data-testid="browse-reset-filters"
                  >
                    Reset filters
                  </button>
                }
              />
            ) : tab === 'requests' ? (
              <div className="grid grid-cols-1 content-start items-start gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
                {openRequests.map((request) => (
                  <RequestCard key={request.id} request={request} />
                ))}
              </div>
            ) : people.length ? (
              <div className="grid grid-cols-1 content-start items-start gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
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
                      className="inline-flex h-9 items-center justify-center rounded-lg bg-[#1D5CE5] px-4 text-[13px] font-semibold text-white transition hover:bg-[#1649BD]"
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
        </div>

        {showDiscoveryChrome ? (
          <aside
            className="hidden min-w-0 xl:flex xl:h-full xl:min-h-0 xl:flex-col"
            data-testid="browse-trending-aside"
          >
            {renderTrendingHelpers()}
          </aside>
        ) : null}

        {/* Stacked trending rail below feed on < xl (no duplicate test id) */}
        {showDiscoveryChrome ? (
          <div className="min-w-0 md:max-w-xl xl:hidden" aria-hidden={false}>
            {renderTrendingHelpers({ omitTestId: true })}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function WhenChipRow({
  current,
  onSelect,
}: {
  current: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="space-y-2">
      <p className="px-0.5 text-[11.5px] font-bold uppercase tracking-[0.08em] text-[#94A3B8]">
        When
      </p>
      <div className="flex flex-wrap gap-1.5">
        {WHEN_FILTER_OPTIONS.map((opt) => {
          const active = current === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelect(opt.id)}
              className={`inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-[12px] font-medium transition ${
                active
                  ? 'bg-[#1D5CE5]/[0.08] font-semibold text-[#1D5CE5]'
                  : 'bg-[#F8FAFC] text-[#475569] hover:bg-[#F1F5F9] hover:text-[#071330]'
              }`}
            >
              {opt.id === 'asap' ? <Zap className="h-3 w-3" strokeWidth={2.25} aria-hidden /> : null}
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function AvailChipRow({
  current,
  onSelect,
}: {
  current: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="space-y-2">
      <p className="px-0.5 text-[11.5px] font-bold uppercase tracking-[0.08em] text-[#94A3B8]">
        Availability
      </p>
      <div className="flex flex-wrap gap-1.5">
        {AVAIL_CHIP_OPTIONS.map((opt) => {
          const active = current === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelect(opt.id)}
              className={`inline-flex h-7 items-center rounded-md px-2.5 text-[12px] font-medium transition ${
                active
                  ? 'bg-[#1D5CE5]/[0.08] font-semibold text-[#1D5CE5]'
                  : 'bg-[#F8FAFC] text-[#475569] hover:bg-[#F1F5F9] hover:text-[#071330]'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
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
  tint,
}: {
  label: string
  active: boolean
  onClick: () => void
  icon: LucideIcon
  count: number
  tint?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition ${
        active
          ? 'bg-[#1D5CE5]/[0.08] font-semibold text-[#1D5CE5]'
          : 'font-medium text-[#475569] hover:bg-[#F8FAFC] hover:text-[#071330]'
      }`}
    >
      <Icon
        className="h-3.5 w-3.5 shrink-0"
        strokeWidth={2}
        aria-hidden
        style={tint && !active ? { color: tint } : undefined}
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span
        className={`inline-flex min-w-[1.25rem] items-center justify-center text-[11px] font-semibold tabular-nums ${
          active ? 'text-[#1D5CE5]' : 'text-[#94A3B8]'
        }`}
      >
        {count}
      </span>
    </button>
  )
}

function FilterSummaryPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex h-6 items-center gap-1 rounded-md border border-[#E2E8F0] bg-white px-2 text-[11.5px] font-medium text-[#071330] transition hover:border-[#1D5CE5]/40 hover:text-[#1D5CE5]"
    >
      {label}
      <X className="h-3 w-3 opacity-70" aria-hidden />
      <span className="sr-only">Remove {label}</span>
    </button>
  )
}
