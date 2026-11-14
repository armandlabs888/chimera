'use client'

import { ChevronDown, MapPin } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { BrowseFilteredEmpty } from '@/components/browse/BrowseFilteredEmpty'
import { BrowseFreshEmpty } from '@/components/browse/BrowseFreshEmpty'
import { BrowseHelperDetailPanel } from '@/components/browse/BrowseHelperDetailPanel'
import { BrowseHelperRow } from '@/components/browse/BrowseHelperRow'
import { BrowseJobDetailPanel } from '@/components/browse/BrowseJobDetailPanel'
import { BrowseJobDrawer } from '@/components/browse/BrowseJobDrawer'
import { BrowseJobRow } from '@/components/browse/BrowseJobRow'
import { BrowseLocationTrigger } from '@/components/browse/BrowseLocationDialog'
import { BrowseToolsBar } from '@/components/browse/BrowseToolsBar'
import type { FilterOption } from '@/components/browse/BrowseFilterBar'
import { WhileYouWait } from '@/components/browse/WhileYouWait'
import { useBeam } from '@/context/BeamContext'
import { WHEN_OPTIONS } from '@/data/categories'
import { useBrowseLocation } from '@/hooks/useBrowseLocation'
import { helperProfileProgress } from '@/lib/helperProfileProgress'
import { readJobAlertsPreference, writeJobAlertsPreference } from '@/lib/jobAlerts'
import { distanceBetween, formatLocation } from '@/lib/location'
import { formatBudget, formatRate, relativeTime } from '@/lib/matching'
import { formatPublicRating } from '@/lib/ratingDisplay'
import { hidesPeerHelperDiscovery, stripHelperDiscoveryParams } from '@/lib/roles'
import { listingCoverImage, normalizeListingImages } from '@/lib/listingPhotos'
import {
  BROWSE_PARENTS,
  expandBrowseFilter,
  formatCategoryLabel,
  matchesBrowseCategory,
} from '@/lib/taxonomy'
import type { AvailabilitySlot, HelpRequest, Person, WhenOption } from '@/types'
import '@/components/browse/browse-hc.css'

type SortMode = 'nearest' | 'newest' | 'budget'
type RadiusMiles = 'all' | '3' | '5' | '10' | '25'
type PayFilter = 'all' | 'fixed' | 'open'

const PAGE_SIZE = 20

const REQUEST_SORT_OPTIONS: FilterOption[] = [
  { id: 'nearest', label: 'Nearest' },
  { id: 'newest', label: 'Newest first' },
  { id: 'budget', label: 'Highest budget' },
]

const PEOPLE_SORT_OPTIONS: FilterOption[] = [
  { id: 'nearest', label: 'Nearest' },
  { id: 'newest', label: 'Top rated' },
  { id: 'budget', label: 'Lowest rate' },
]

const WHEN_FILTER_OPTIONS: FilterOption[] = [
  { id: 'all', label: 'Anytime' },
  ...WHEN_OPTIONS.map((w) => ({ id: w.id, label: w.label })),
]

const PAY_FILTER_OPTIONS: FilterOption[] = [
  { id: 'all', label: 'All types' },
  { id: 'fixed', label: 'Fixed budget' },
  { id: 'open', label: 'Accepting offers' },
]

const AVAIL_FILTER_OPTIONS: FilterOption[] = [
  { id: 'all', label: 'Any' },
  { id: 'mornings', label: 'Mornings' },
  { id: 'afternoons', label: 'Afternoons' },
  { id: 'evenings', label: 'Evenings' },
  { id: 'weekends', label: 'Weekends' },
]

const RADIUS_FILTER_OPTIONS: FilterOption[] = [
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

function parsePay(value: string | null): PayFilter {
  if (value === 'fixed' || value === 'open') return value
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

function formatMiles(miles: number | null): string | null {
  if (miles == null || !Number.isFinite(miles)) return null
  if (miles < 0.1) return '0.1 mi'
  return `${miles < 10 ? miles.toFixed(1) : String(Math.round(miles))} mi`
}

function oneLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

/** Neighborhood or city only — never a street address. */
function publicArea(request: HelpRequest): string {
  const label = formatLocation(request)
  const first = label.split(',')[0]?.trim() || ''
  if (!first || first === 'Local area' || first === 'Nearby') return ''
  if (/\d/.test(first)) return ''
  return first
}

function isOpenBudget(request: HelpRequest): boolean {
  return request.budgetType === 'open' || request.budget === 0
}

function subscribeNarrow(onChange: () => void) {
  const mq = window.matchMedia('(max-width: 860px)')
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

function narrowSnapshot() {
  return window.matchMedia('(max-width: 860px)').matches
}

export function Browse() {
  const { state, currentUser, authUser, mode, ready } = useBeam()
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
  const narrow = useSyncExternalStore(subscribeNarrow, narrowSnapshot, () => false)

  const hidePeerDiscovery = hidesPeerHelperDiscovery(currentUser, isGuest)
  const urlTab = params.get('tab') === 'people' ? 'people' : 'requests'
  const tab = hidePeerDiscovery ? 'requests' : urlTab
  const category = params.get('category') ?? 'all'
  const radius = parseRadius(params.get('radius'))
  const when = parseWhen(params.get('when'))
  const pay = parsePay(params.get('pay'))
  const avail = hidePeerDiscovery ? 'all' : parseAvail(params.get('avail'))
  const qParam = params.get('q') ?? ''
  const freeOnly = hidePeerDiscovery ? false : params.get('free') === '1'
  const sortParam = params.get('sort') as SortMode | null
  const sort: SortMode =
    isGuest && (!sortParam || sortParam === 'nearest')
      ? 'newest'
      : sortParam || (isGuest ? 'newest' : 'nearest')
  const jobId = params.get('job')
  const helperId = params.get('helper')

  const [qDraft, setQDraft] = useState(qParam)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [alertsEnabled, setAlertsEnabled] = useState(
    () => (typeof window === 'undefined' ? false : readJobAlertsPreference().enabled),
  )

  useEffect(() => {
    setQDraft(qParam)
  }, [qParam])

  useEffect(() => {
    if (!hidePeerDiscovery) return
    const hasDiscovery =
      params.get('tab') === 'people' || params.get('free') === '1' || params.has('avail')
    if (!hasDiscovery) return
    const nextParams = stripHelperDiscoveryParams(params)
    nextParams.delete('view')
    const qs = nextParams.toString()
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    })
  }, [hidePeerDiscovery, params, pathname, router, startTransition])

  useEffect(() => {
    if (!params.has('view')) return
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
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    })
  }, [hidePeerDiscovery, params, pathname, router, startTransition])

  useEffect(() => {
    if (!ready || !jobId) return
    if (state.requests.some((r) => r.id === jobId)) return
    const nextParams = new URLSearchParams(params.toString())
    nextParams.delete('job')
    const qs = nextParams.toString()
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    })
  }, [ready, jobId, state.requests, params, pathname, router, startTransition])

  useEffect(() => {
    if (!ready || !helperId) return
    if (state.people.some((p) => p.id === helperId)) return
    const nextParams = new URLSearchParams(params.toString())
    nextParams.delete('helper')
    const qs = nextParams.toString()
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    })
  }, [ready, helperId, state.people, params, pathname, router, startTransition])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = qDraft.trim()
      if (next === qParam.trim()) return
      const nextParams = new URLSearchParams(params.toString())
      if (next) nextParams.set('q', next)
      else nextParams.delete('q')
      const qs = nextParams.toString()
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
      })
    }, 250)
    return () => window.clearTimeout(handle)
  }, [qDraft, qParam, params, pathname, router, startTransition])

  const replaceQuery = useCallback(
    (nextParams: URLSearchParams) => {
      const qs = nextParams.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router],
  )

  const q = qParam.toLowerCase().trim()
  const radiusMiles = radius === 'all' ? null : Number(radius)
  const cityName = (() => {
    const label = browseOrigin.locationLabel?.trim() || ''
    if (label && label.toLowerCase() !== 'nearby') {
      return label.split(',')[0]?.trim() || browseOrigin.city?.trim() || 'you'
    }
    return browseOrigin.city?.trim() || 'you'
  })()
  const areaLine = (() => {
    const label = browseOrigin.locationLabel?.trim() || ''
    if (label && label.toLowerCase() !== 'nearby') return label
    const city = browseOrigin.city?.trim()
    const state = browseOrigin.stateCode?.trim()
    if (city && state) return `${city}, ${state}`
    return city || 'your area'
  })()

  const openRequests = useMemo(() => {
    let list = state.requests
      .filter((r) => r.status === 'open')
      .filter((r) => matchesBrowseCategory(r.category, category))
      .filter((r) => {
        if (radiusMiles == null) return true
        const d = milesTo(r, browseAnchor)
        if (d == null) return true
        return d <= radiusMiles
      })
      .filter((r) => (when === 'all' ? true : r.when === when))
      .filter((r) => {
        if (pay === 'all') return true
        const open = isOpenBudget(r)
        return pay === 'open' ? open : !open
      })
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
      return (
        (da ?? Number.POSITIVE_INFINITY) - (db ?? Number.POSITIVE_INFINITY) ||
        +new Date(b.createdAt) - +new Date(a.createdAt)
      )
    })
    return list
  }, [state.requests, category, radiusMiles, when, pay, q, sort, browseAnchor, isGuest])

  const people = useMemo(() => {
    let list = state.people
      .filter((p) => isBrowseHelper(p))
      .filter((p) => !(p.isCurrentUser || p.id === currentUser.id))
      .filter((p) => {
        if (category === 'all') return true
        const expanded = expandBrowseFilter(category)
        if (!expanded) return true
        return p.skills.some((s) => expanded.includes(s))
      })
      .filter((p) => {
        if (radiusMiles == null) return true
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
  }, [
    state.people,
    category,
    radiusMiles,
    avail,
    q,
    freeOnly,
    sort,
    browseAnchor,
    currentUser.id,
    isGuest,
  ])

  const profileProgress = useMemo(() => helperProfileProgress(currentUser), [currentUser])
  const jobsTabCount = useMemo(
    () => state.requests.filter((r) => r.status === 'open').length,
    [state.requests],
  )
  const helpersTabCount = useMemo(
    () =>
      state.people.filter(
        (p) => isBrowseHelper(p) && !(p.isCurrentUser || p.id === currentUser.id),
      ).length,
    [state.people, currentUser.id],
  )
  const showProfileWaitCard =
    hidePeerDiscovery &&
    (currentUser.accountRole === 'helper' || Boolean(currentUser.isHelper)) &&
    (!currentUser.isHelper || profileProgress.percent < 100)
  const showHelperBanner =
    ready && !isGuest && currentUser.accountRole === 'helper' && !currentUser.isHelper

  const filterKey = `${tab}|${category}|${radius}|${when}|${pay}|${avail}|${qParam}|${sort}|${freeOnly}|${cityName}`
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [filterKey])

  function setTab(next: string) {
    if (hidePeerDiscovery && next === 'people') return
    const nextParams = new URLSearchParams(params.toString())
    if (next === 'people') nextParams.set('tab', 'people')
    else nextParams.delete('tab')
    if (next !== 'people') nextParams.delete('free')
    if (next === 'people') nextParams.delete('when')
    else nextParams.delete('avail')
    nextParams.delete('job')
    nextParams.delete('helper')
    nextParams.delete('pay')
    replaceQuery(nextParams)
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
  }

  function setWhen(id: string) {
    const nextParams = new URLSearchParams(params.toString())
    if (id === 'all') nextParams.delete('when')
    else nextParams.set('when', id)
    replaceQuery(nextParams)
  }

  function setPay(id: string) {
    const nextParams = new URLSearchParams(params.toString())
    if (id === 'all') nextParams.delete('pay')
    else nextParams.set('pay', id)
    replaceQuery(nextParams)
  }

  function setAvail(id: string) {
    const nextParams = new URLSearchParams(params.toString())
    if (id === 'all') nextParams.delete('avail')
    else nextParams.set('avail', id)
    replaceQuery(nextParams)
  }

  function setSort(next: string) {
    const nextParams = new URLSearchParams(params.toString())
    const defaultSort = isGuest ? 'newest' : 'nearest'
    if (next === defaultSort) nextParams.delete('sort')
    else nextParams.set('sort', next)
    replaceQuery(nextParams)
  }

  function clearFilters() {
    const nextParams = new URLSearchParams()
    if (tab === 'people') nextParams.set('tab', 'people')
    replaceQuery(nextParams)
    setQDraft('')
  }

  function clearSearch() {
    setQDraft('')
    const nextParams = new URLSearchParams(params.toString())
    nextParams.delete('q')
    replaceQuery(nextParams)
  }

  function enableAlerts() {
    setAlertsEnabled(writeJobAlertsPreference(true).enabled)
  }

  function toggleAlerts() {
    setAlertsEnabled(writeJobAlertsPreference(!alertsEnabled).enabled)
  }

  const openJob = useCallback(
    (id: string) => {
      const nextParams = new URLSearchParams(params.toString())
      nextParams.set('job', id)
      replaceQuery(nextParams)
    },
    [params, replaceQuery],
  )

  const closeJob = useCallback(() => {
    const nextParams = new URLSearchParams(params.toString())
    if (!nextParams.has('job')) return
    nextParams.delete('job')
    replaceQuery(nextParams)
  }, [params, replaceQuery])

  const openHelper = useCallback(
    (id: string) => {
      const nextParams = new URLSearchParams(params.toString())
      nextParams.set('helper', id)
      replaceQuery(nextParams)
    },
    [params, replaceQuery],
  )

  const closeHelper = useCallback(() => {
    const nextParams = new URLSearchParams(params.toString())
    if (!nextParams.has('helper')) return
    nextParams.delete('helper')
    replaceQuery(nextParams)
  }, [params, replaceQuery])

  // Desktop: keep a selected job for the sticky detail panel.
  useEffect(() => {
    if (!ready || tab !== 'requests' || narrow) return
    if (openRequests.length === 0) {
      if (jobId) closeJob()
      return
    }
    if (jobId && openRequests.some((r) => r.id === jobId)) return
    openJob(openRequests[0].id)
  }, [ready, tab, narrow, openRequests, jobId, openJob, closeJob])

  // Desktop: keep a selected helper for the sticky preview panel.
  useEffect(() => {
    if (!ready || tab !== 'people' || narrow) return
    if (people.length === 0) {
      if (helperId) closeHelper()
      return
    }
    if (helperId && people.some((p) => p.id === helperId)) return
    openHelper(people[0].id)
  }, [ready, tab, narrow, people, helperId, openHelper, closeHelper])

  const sortOptions = (tab === 'people' ? PEOPLE_SORT_OPTIONS : REQUEST_SORT_OPTIONS).filter(
    (o) => !(isGuest && o.id === 'nearest'),
  )
  const sortLabel = sortOptions.find((o) => o.id === sort)?.label ?? (isGuest ? 'Newest first' : 'Nearest')
  const whenLabel = WHEN_FILTER_OPTIONS.find((o) => o.id === when)?.label ?? 'Anytime'
  const payLabel = PAY_FILTER_OPTIONS.find((o) => o.id === pay)?.label ?? 'All types'
  const availLabel = AVAIL_FILTER_OPTIONS.find((o) => o.id === avail)?.label ?? 'Any'
  const categoryLabel = category === 'all' ? null : formatCategoryLabel(category)
  const radiusChipLabel =
    RADIUS_FILTER_OPTIONS.find((o) => o.id === radius)?.label ?? 'Any distance'
  const locRadiusLabel = radius === 'all' ? 'Any distance' : radiusChipLabel

  const hasActiveFilters =
    category !== 'all' ||
    !!qParam ||
    freeOnly ||
    when !== 'all' ||
    pay !== 'all' ||
    avail !== 'all' ||
    radius !== 'all'

  const showFreshMarketplace = tab === 'requests' && !hasActiveFilters && openRequests.length === 0
  const showFilteredRequestsEmpty = tab === 'requests' && hasActiveFilters && openRequests.length === 0
  const showHelpersEmpty = !hidePeerDiscovery && tab === 'people' && people.length === 0
  const showWhileYouWait = showFreshMarketplace && (hidePeerDiscovery || isGuest === false)

  const liveCount = tab === 'requests' ? openRequests.length : people.length
  const taskNoun = liveCount === 1 ? 'task' : 'tasks'
  const shownRequests = openRequests.slice(0, visibleCount)
  const shownPeople = people.slice(0, visibleCount)
  const selectedRequest = jobId ? state.requests.find((r) => r.id === jobId) ?? null : null
  const selectedHelper = helperId ? people.find((p) => p.id === helperId) ?? null : null
  const returnTo = params.toString() ? `${pathname}?${params.toString()}` : pathname
  const authHref = `/auth?next=${encodeURIComponent(returnTo)}`

  const suggestions = [
    category !== 'all' ? { label: 'All categories', onClick: () => setCategory('all') } : null,
    radius !== 'all' ? { label: 'Any distance', onClick: () => setRadius('all') } : null,
    tab === 'requests' && when !== 'all' ? { label: 'Anytime', onClick: () => setWhen('all') } : null,
    tab === 'requests' && pay !== 'all' ? { label: 'All pay types', onClick: () => setPay('all') } : null,
    tab === 'people' && avail !== 'all'
      ? { label: 'Any availability', onClick: () => setAvail('all') }
      : null,
  ].filter((item): item is { label: string; onClick: () => void } => Boolean(item))

  const selectedMiles = selectedRequest ? formatMiles(milesTo(selectedRequest, browseAnchor)) : null
  const selectedArea = selectedRequest ? publicArea(selectedRequest) : ''
  const showDesktopDetail = Boolean(selectedRequest) && !narrow && tab === 'requests'
  const showDesktopHelperDetail = Boolean(selectedHelper) && !narrow && tab === 'people'
  const selectedHelperMiles = selectedHelper
    ? formatMiles(milesTo(selectedHelper, browseAnchor))
    : null
  const selectedHelperSkill = selectedHelper
    ? selectedHelper.skills[0]
      ? formatCategoryLabel(skillId(selectedHelper), selectedHelper.otherSkillLabel)
      : 'Local help'
    : ''

  const heroTitle = tab === 'people' ? 'Helpers near your area' : `Jobs near ${cityName}`
  const subline =
    tab === 'requests'
      ? radius === 'all'
        ? `${liveCount} ${taskNoun} near ${areaLine}`
        : `${liveCount} ${taskNoun} within ${radius} mi of ${areaLine}`
      : null

  return (
    <div
      className={`browse-hc ${showHelperBanner ? 'has-helper-banner' : ''}`}
      data-testid="browse-v3"
      data-browse-layout={hidePeerDiscovery ? 'helper-jobs' : 'discovery'}
      data-browse-tab={tab}
    >
      <div className="browse-hc-wrap browse-hc-page">
        <div
          className="browse-hc-section-tabs"
          role="tablist"
          aria-label="Browse type"
          data-testid="browse-mode-tabs"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'requests'}
            className={tab === 'requests' ? 'is-active' : undefined}
            onClick={() => setTab('requests')}
            data-testid="browse-tab-jobs"
          >
            Jobs
            {ready ? <span className="browse-hc-section-count">{jobsTabCount}</span> : null}
          </button>
          {hidePeerDiscovery ? null : (
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'people'}
              data-testid="browse-tab-local-helpers"
              className={tab === 'people' ? 'is-active' : undefined}
              onClick={() => setTab('people')}
            >
              Helpers
              {ready ? <span className="browse-hc-section-count">{helpersTabCount}</span> : null}
            </button>
          )}
        </div>

        <section
          className={`browse-hc-title-row${tab === 'people' ? ' browse-hc-title-row--helpers' : ''}`}
        >
          <div className="min-w-0">
            <h1 className="browse-hc-hero-title" data-testid="browse-hero-title">
              {heroTitle}
            </h1>
            {subline ? <p className="browse-hc-hero-sub">{subline}</p> : null}
          </div>

          <BrowseLocationTrigger label={areaLine} className="browse-hc-loc-pill">
            <MapPin className="pin h-4 w-4" strokeWidth={2} aria-hidden />
            <span className="browse-hc-loc-label">{areaLine}</span>
            <span className="divider" aria-hidden>
              ·
            </span>
            <span className="radius">
              {locRadiusLabel}
              <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            </span>
          </BrowseLocationTrigger>
        </section>

        <div className="browse-hc-tabs-wrap">
          <div className="browse-hc-tabs" role="tablist" aria-label="Categories">
            <button
              type="button"
              role="tab"
              aria-selected={category === 'all'}
              className={`browse-hc-tab ${category === 'all' ? 'is-active' : ''}`}
              onClick={() => setCategory('all')}
              data-testid="browse-category-all"
            >
              All
            </button>
            {BROWSE_PARENTS.map((parent) => (
              <button
                key={parent.id}
                type="button"
                role="tab"
                aria-selected={category === parent.id}
                className={`browse-hc-tab ${category === parent.id ? 'is-active' : ''}`}
                onClick={() => setCategory(parent.id)}
                data-testid={`browse-category-${parent.id}`}
              >
                {parent.label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'requests' ? (
          <BrowseToolsBar
            qDraft={qDraft}
            onQDraft={setQDraft}
            onClearSearch={clearSearch}
            whenLabel={whenLabel}
            whenValue={when}
            whenOptions={WHEN_FILTER_OPTIONS}
            onWhen={setWhen}
            payLabel={payLabel}
            payValue={pay}
            payOptions={PAY_FILTER_OPTIONS}
            onPay={setPay}
            sortLabel={sortLabel.replace(/ first$/, '')}
            sortValue={sort}
            sortOptions={sortOptions}
            onSort={setSort}
          />
        ) : (
          <BrowseToolsBar
            qDraft={qDraft}
            onQDraft={setQDraft}
            onClearSearch={clearSearch}
            whenNoun="Availability"
            whenLabel={availLabel}
            whenValue={avail}
            whenOptions={AVAIL_FILTER_OPTIONS}
            onWhen={setAvail}
            payLabel="All types"
            payValue="all"
            payOptions={[{ id: 'all', label: 'All types' }]}
            onPay={() => undefined}
            hidePay
            sortLabel={sortLabel.replace(/ first$/, '')}
            sortValue={sort}
            sortOptions={sortOptions}
            onSort={setSort}
          />
        )}

        {showFreshMarketplace ? (
          <>
            <BrowseFreshEmpty
              hidePeerDiscovery={hidePeerDiscovery}
              cityLabel={cityName}
              onEnableAlerts={enableAlerts}
              alertsEnabled={alertsEnabled}
              onWidenRadius={() => setRadius('25')}
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
          <div className="mt-5">
            <BrowseFilteredEmpty
              title="No jobs match these filters"
              body={
                categoryLabel
                  ? `${categoryLabel} is selected and nothing matches right now. Try widening distance or timing.`
                  : 'Nothing matches these filters right now. Try widening distance or timing.'
              }
              onReset={clearFilters}
              suggestions={suggestions}
            />
          </div>
        ) : tab === 'requests' ? (
          <div className={`browse-hc-layout ${showDesktopDetail ? '' : 'browse-hc-layout--solo'}`}>
            <div>
              <ul className="browse-hc-job-list" data-testid="browse-job-list">
                {shownRequests.map((request) => {
                  const area = publicArea(request)
                  const photos = normalizeListingImages(request.images, request.image)
                  const imageSrc = listingCoverImage(photos)
                  const openBudget = isOpenBudget(request)
                  const budget = formatBudget(request)
                  return (
                    <BrowseJobRow
                      key={request.id}
                      request={request}
                      title={request.title}
                      categoryLabel={formatCategoryLabel(request.category, request.categoryCustom)}
                      areaLabel={area}
                      timingLabel={
                        request.when === 'asap'
                          ? 'ASAP'
                          : request.whenLabel || relativeTime(request.createdAt)
                      }
                      asap={request.when === 'asap'}
                      excerpt={oneLine(request.details)}
                      priceLabel={openBudget ? 'Open' : budget}
                      priceCaption={openBudget ? 'Accepting offers' : 'Fixed budget'}
                      openBudget={openBudget}
                      imageSrc={imageSrc}
                      selected={request.id === jobId}
                      onOpen={openJob}
                    />
                  )
                })}
              </ul>
              {openRequests.length > shownRequests.length ? (
                <div className="browse-hc-show-more">
                  <button
                    type="button"
                    data-testid="browse-show-more"
                    onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                  >
                    Show more jobs
                  </button>
                  <p>
                    Showing {shownRequests.length} of {openRequests.length}
                  </p>
                </div>
              ) : null}
            </div>

            {showDesktopDetail && selectedRequest ? (
              <BrowseJobDetailPanel
                request={selectedRequest}
                areaLabel={selectedArea || cityName}
                cityName={cityName}
                authHref={authHref}
              />
            ) : null}
          </div>
        ) : showHelpersEmpty ? (
          <div className="mt-5">
            <BrowseFilteredEmpty
              title={hasActiveFilters ? 'No helpers match these filters' : 'No helpers nearby yet'}
              body={
                hasActiveFilters
                  ? 'Try another category or a wider distance.'
                  : 'Helpers near this city will show up here as they finish their profiles.'
              }
              onReset={hasActiveFilters ? clearFilters : () => setTab('requests')}
              resetLabel={hasActiveFilters ? 'Reset filters' : 'Browse jobs'}
              postHref="/onboarding/helper"
              postLabel="Set up helper profile"
              suggestions={hasActiveFilters ? suggestions : []}
            />
          </div>
        ) : (
          <div className={`browse-hc-layout ${showDesktopHelperDetail ? '' : 'browse-hc-layout--solo'}`}>
            <div>
              <ul className="browse-hc-job-list browse-hc-helper-list" data-testid="browse-helper-list">
                {shownPeople.map((person) => {
                  const skill = person.skills[0]
                    ? formatCategoryLabel(skillId(person), person.otherSkillLabel)
                    : 'Local help'
                  return (
                    <BrowseHelperRow
                      key={person.id}
                      person={person}
                      skillLabel={skill}
                      milesLabel={formatMiles(milesTo(person, browseAnchor))}
                      rateLabel={formatRate(person)}
                      ratingLabel={formatPublicRating(person)}
                      reviewCount={person.reviewCount ?? 0}
                      jobsCompleted={person.jobsCompleted ?? 0}
                      selected={person.id === helperId}
                      navigateOnActivate={narrow}
                      onSelect={openHelper}
                    />
                  )
                })}
              </ul>
              {people.length > shownPeople.length ? (
                <div className="browse-hc-show-more">
                  <button type="button" onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}>
                    Show more helpers
                  </button>
                  <p>
                    Showing {shownPeople.length} of {people.length}
                  </p>
                </div>
              ) : null}
            </div>

            {showDesktopHelperDetail && selectedHelper ? (
              <BrowseHelperDetailPanel
                person={selectedHelper}
                skillLabel={selectedHelperSkill}
                milesLabel={selectedHelperMiles}
              />
            ) : null}
          </div>
        )}
      </div>

      {selectedRequest && narrow ? (
        <BrowseJobDrawer
          request={selectedRequest}
          narrow
          milesLabel={selectedMiles}
          areaLabel={selectedArea || cityName}
          cityName={cityName}
          authHref={authHref}
          onClose={closeJob}
        />
      ) : null}
    </div>
  )
}

function skillId(person: Person): string {
  return person.skills[0] ?? 'other'
}
