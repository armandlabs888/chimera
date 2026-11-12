'use client'

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { BrowseFilterBar, type FilterOption } from '@/components/browse/BrowseFilterBar'
import { BrowseFilteredEmpty } from '@/components/browse/BrowseFilteredEmpty'
import { BrowseFreshEmpty } from '@/components/browse/BrowseFreshEmpty'
import { BrowseHelperRow } from '@/components/browse/BrowseHelperRow'
import { BrowseJobDrawer } from '@/components/browse/BrowseJobDrawer'
import { BrowseJobRow } from '@/components/browse/BrowseJobRow'
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
import '@/components/landing/landing-v2.css'

type SortMode = 'nearest' | 'newest' | 'budget'
type RadiusMiles = 'all' | '3' | '5' | '10' | '25'

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
  { id: 'all', label: 'Any timing' },
  ...WHEN_OPTIONS.map((w) => ({ id: w.id, label: w.label })),
]

const AVAIL_FILTER_OPTIONS: FilterOption[] = [
  { id: 'all', label: 'Any availability' },
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

const SLOT_LABELS: Record<AvailabilitySlot, string> = {
  mornings: 'Mornings',
  afternoons: 'Afternoons',
  evenings: 'Evenings',
  weekends: 'Weekends',
}

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

function subscribeNarrow(onChange: () => void) {
  const mq = window.matchMedia('(max-width: 639px)')
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

function narrowSnapshot() {
  return window.matchMedia('(max-width: 639px)').matches
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
  const avail = hidePeerDiscovery ? 'all' : parseAvail(params.get('avail'))
  const qParam = params.get('q') ?? ''
  const freeOnly = hidePeerDiscovery ? false : params.get('free') === '1'
  const sortParam = params.get('sort') as SortMode | null
  const sort: SortMode =
    isGuest && (!sortParam || sortParam === 'nearest')
      ? 'newest'
      : sortParam || (isGuest ? 'newest' : 'nearest')
  const jobId = params.get('job')

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
  // Always derive from the same origin the float header shows (locationLabel),
  // never a stale profile city that can disagree with the picker text.
  const cityName = (() => {
    const label = browseOrigin.locationLabel?.trim() || ''
    if (label && label.toLowerCase() !== 'nearby') {
      return label.split(',')[0]?.trim() || browseOrigin.city?.trim() || 'you'
    }
    return browseOrigin.city?.trim() || 'you'
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
  }, [state.requests, category, radiusMiles, when, q, sort, browseAnchor, isGuest])

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

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 }
    for (const p of BROWSE_PARENTS) counts[p.id] = 0
    if (tab === 'requests') {
      const open = state.requests.filter((r) => r.status === 'open')
      counts.all = open.length
      for (const parent of BROWSE_PARENTS) {
        counts[parent.id] = open.filter((r) => matchesBrowseCategory(r.category, parent.id)).length
      }
    } else {
      const helpers = state.people.filter(
        (p) => isBrowseHelper(p) && !(p.isCurrentUser || p.id === currentUser.id),
      )
      counts.all = helpers.length
      for (const parent of BROWSE_PARENTS) {
        const expanded = expandBrowseFilter(parent.id) ?? []
        counts[parent.id] = helpers.filter((h) => h.skills.some((s) => expanded.includes(s))).length
      }
    }
    return counts
  }, [state.requests, state.people, tab, currentUser.id])

  const profileProgress = useMemo(() => helperProfileProgress(currentUser), [currentUser])
  const showProfileWaitCard =
    hidePeerDiscovery &&
    (currentUser.accountRole === 'helper' || Boolean(currentUser.isHelper)) &&
    (!currentUser.isHelper || profileProgress.percent < 100)
  const showHelperBanner =
    ready && !isGuest && currentUser.accountRole === 'helper' && !currentUser.isHelper

  const filterKey = `${tab}|${category}|${radius}|${when}|${avail}|${qParam}|${sort}|${freeOnly}|${cityName}`
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

  const sortOptions = (tab === 'people' ? PEOPLE_SORT_OPTIONS : REQUEST_SORT_OPTIONS).filter(
    (o) => !(isGuest && o.id === 'nearest'),
  )
  const sortLabel = sortOptions.find((o) => o.id === sort)?.label ?? (isGuest ? 'Newest first' : 'Nearest')
  const radiusLabel = RADIUS_FILTER_OPTIONS.find((o) => o.id === radius)?.label ?? 'Any distance'
  const whenLabel = WHEN_FILTER_OPTIONS.find((o) => o.id === when)?.label ?? 'Any timing'
  const availLabel = AVAIL_FILTER_OPTIONS.find((o) => o.id === avail)?.label ?? 'Any availability'
  const categoryLabel = category === 'all' ? null : formatCategoryLabel(category)

  const hasActiveFilters =
    category !== 'all' || !!qParam || freeOnly || when !== 'all' || avail !== 'all' || radius !== 'all'

  const showFreshMarketplace = tab === 'requests' && !hasActiveFilters && openRequests.length === 0
  const showFilteredRequestsEmpty = tab === 'requests' && hasActiveFilters && openRequests.length === 0
  const showHelpersEmpty = !hidePeerDiscovery && tab === 'people' && people.length === 0
  const showWhileYouWait = showFreshMarketplace && (hidePeerDiscovery || isGuest === false)

  const liveCount = tab === 'requests' ? openRequests.length : people.length
  const noun =
    tab === 'requests' ? (liveCount === 1 ? 'job' : 'jobs') : liveCount === 1 ? 'helper' : 'helpers'
  const shownRequests = openRequests.slice(0, visibleCount)
  const shownPeople = people.slice(0, visibleCount)
  const selectedRequest = jobId ? state.requests.find((r) => r.id === jobId) ?? null : null
  const returnTo = params.toString() ? `${pathname}?${params.toString()}` : pathname
  const authHref = `/auth?next=${encodeURIComponent(returnTo)}`

  const chips: { id: string; label: string; onRemove: () => void }[] = []
  if (qParam) chips.push({ id: 'q', label: `Search: ${qParam}`, onRemove: clearSearch })
  if (categoryLabel) chips.push({ id: 'category', label: categoryLabel, onRemove: () => setCategory('all') })
  if (radius !== 'all') chips.push({ id: 'radius', label: radiusLabel, onRemove: () => setRadius('all') })
  if (tab === 'requests' && when !== 'all') {
    chips.push({ id: 'when', label: whenLabel, onRemove: () => setWhen('all') })
  }
  if (tab === 'people' && avail !== 'all') {
    chips.push({ id: 'avail', label: availLabel, onRemove: () => setAvail('all') })
  }
  if (freeOnly) {
    chips.push({
      id: 'free',
      label: 'Afternoons & evenings',
      onRemove: () => {
        const nextParams = new URLSearchParams(params.toString())
        nextParams.delete('free')
        replaceQuery(nextParams)
      },
    })
  }

  const suggestions = [
    category !== 'all' ? { label: 'All categories', onClick: () => setCategory('all') } : null,
    radius !== 'all' ? { label: 'Any distance', onClick: () => setRadius('all') } : null,
    tab === 'requests' && when !== 'all' ? { label: 'Any timing', onClick: () => setWhen('all') } : null,
    tab === 'people' && avail !== 'all'
      ? { label: 'Any availability', onClick: () => setAvail('all') }
      : null,
  ].filter((item): item is { label: string; onClick: () => void } => Boolean(item))

  const selectedMiles = selectedRequest ? formatMiles(milesTo(selectedRequest, browseAnchor)) : null
  const selectedArea = selectedRequest ? publicArea(selectedRequest) : ''
  const drawerDocked = Boolean(selectedRequest) && !narrow

  return (
    <div
      className={`browse-v3-shell ${drawerDocked ? 'browse-v3-shell--drawer-open' : ''}`}
      data-browse-drawer={drawerDocked ? 'open' : 'closed'}
    >
    <div
      className={`browse-v3 mx-auto w-full max-w-[808px] px-4 pb-16 sm:px-6 ${
        showHelperBanner ? 'has-helper-banner' : ''
      }`}
      data-testid="browse-v3"
      data-browse-layout={hidePeerDiscovery ? 'helper-jobs' : 'discovery'}
    >
      <div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-end sm:gap-6">
        <div className="min-w-0">
          <h1 className="text-[27px] font-bold leading-[1.12] tracking-[-0.028em] text-[#071330] sm:text-[34px]">
            Browse Local Jobs
          </h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-2.5 text-[14px] text-[#273449] sm:mt-2.5 sm:text-[15px]">
            <span>
              <b className="font-semibold text-[#071330]">
                {liveCount} {noun}
              </b>{' '}
              near {cityName}
            </span>
          </p>
        </div>
        {hidePeerDiscovery ? null : (
          <div
            className="inline-flex w-full shrink-0 rounded-[10px] bg-[#EEF2F7] p-[3px] sm:w-auto"
            role="tablist"
            aria-label="Browse type"
            data-testid="browse-mode-tabs"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'requests'}
              onClick={() => setTab('requests')}
              className={`h-8 flex-1 rounded-lg px-3.5 text-[13.5px] font-semibold sm:flex-none ${
                tab === 'requests'
                  ? 'bg-white text-[#071330] shadow-[0_1px_2px_rgba(7,19,48,0.12),0_0_0_1px_rgba(7,19,48,0.04)]'
                  : 'text-[#3D4A5F]'
              }`}
            >
              Jobs
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'people'}
              data-testid="browse-tab-local-helpers"
              onClick={() => setTab('people')}
              className={`h-8 flex-1 rounded-lg px-3.5 text-[13.5px] font-semibold sm:flex-none ${
                tab === 'people'
                  ? 'bg-white text-[#071330] shadow-[0_1px_2px_rgba(7,19,48,0.12),0_0_0_1px_rgba(7,19,48,0.04)]'
                  : 'text-[#3D4A5F]'
              }`}
            >
              Helpers
            </button>
          </div>
        )}
      </div>

      <BrowseFilterBar
        tab={tab}
        qDraft={qDraft}
        onQDraft={setQDraft}
        onClearSearch={clearSearch}
        category={category}
        categoryLabel={categoryLabel}
        categoryCounts={categoryCounts}
        onCategory={setCategory}
        radius={radius}
        radiusOptions={RADIUS_FILTER_OPTIONS}
        onRadius={setRadius}
        timingLabel={tab === 'people' ? availLabel : whenLabel}
        timingValue={tab === 'people' ? avail : when}
        timingOptions={tab === 'people' ? AVAIL_FILTER_OPTIONS : WHEN_FILTER_OPTIONS}
        onTiming={tab === 'people' ? setAvail : setWhen}
        timingTestId={tab === 'people' ? 'browse-availability-trigger' : 'browse-when-trigger'}
        sort={sort}
        sortLabel={sortLabel}
        sortOptions={sortOptions}
        onSort={setSort}
        chips={chips}
        onReset={clearFilters}
        resultCount={liveCount}
        resultNoun={noun}
      />

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
      ) : tab === 'requests' ? (
        <>
          <ul className="browse-job-list mt-1 list-none" data-testid="browse-job-list">
            {shownRequests.map((request) => {
              const miles = formatMiles(milesTo(request, browseAnchor))
              const photos = normalizeListingImages(request.images, request.image)
              // Real listing photo only — missing photos use the category icon tile.
              const imageSrc = listingCoverImage(photos)
              const budget = formatBudget(request)
              const openBudget = budget === 'Open to offers'
              return (
                <BrowseJobRow
                  key={request.id}
                  request={request}
                  title={request.title}
                  categoryLabel={formatCategoryLabel(request.category, request.categoryCustom)}
                  milesLabel={miles}
                  timingLabel={request.when === 'asap' ? 'ASAP' : request.whenLabel || relativeTime(request.createdAt)}
                  asap={request.when === 'asap'}
                  excerpt={oneLine(request.details)}
                  priceLabel={openBudget ? 'Open' : budget}
                  priceCaption={openBudget ? 'to offers' : 'Budget'}
                  imageSrc={imageSrc}
                  selected={request.id === jobId}
                  onOpen={openJob}
                />
              )
            })}
          </ul>
          {openRequests.length > shownRequests.length ? (
            <div className="mt-7 flex flex-col items-center gap-3">
              <button
                type="button"
                data-testid="browse-show-more"
                onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                className="inline-flex h-12 min-w-[200px] items-center justify-center rounded-[10px] border border-[#CDD5E0] bg-white px-5 text-[15px] font-semibold text-[#071330] hover:bg-[#F4F8FD]"
              >
                Show more jobs
              </button>
              <p className="text-[13.5px] text-[#3D4A5F]">
                Showing {shownRequests.length} of {openRequests.length}
              </p>
            </div>
          ) : null}
        </>
      ) : showHelpersEmpty ? (
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
      ) : (
        <>
          <ul className="browse-job-list mt-1 list-none" data-testid="browse-helper-list">
            {shownPeople.map((person) => {
              const skill = person.skills[0]
                ? formatCategoryLabel(skillId(person), person.otherSkillLabel)
                : 'Local help'
              const slots = person.availability.slice(0, 2).map((s) => SLOT_LABELS[s])
              return (
                <BrowseHelperRow
                  key={person.id}
                  person={person}
                  skillLabel={skill}
                  milesLabel={formatMiles(milesTo(person, browseAnchor))}
                  availabilityLabel={person.availableNow ? 'Available now' : slots.join(' · ')}
                  rateLabel={formatRate(person)}
                  ratingLabel={formatPublicRating(person)}
                />
              )
            })}
          </ul>
          {people.length > shownPeople.length ? (
            <div className="mt-7 flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                className="inline-flex h-12 min-w-[200px] items-center justify-center rounded-[10px] border border-[#CDD5E0] bg-white px-5 text-[15px] font-semibold text-[#071330] hover:bg-[#F4F8FD]"
              >
                Show more helpers
              </button>
              <p className="text-[13.5px] text-[#3D4A5F]">
                Showing {shownPeople.length} of {people.length}
              </p>
            </div>
          ) : null}
        </>
      )}

      {selectedRequest ? (
        <BrowseJobDrawer
          request={selectedRequest}
          narrow={narrow}
          milesLabel={selectedMiles}
          areaLabel={selectedArea || cityName}
          cityName={cityName}
          authHref={authHref}
          onClose={closeJob}
        />
      ) : null}
    </div>
    </div>
  )
}

function skillId(person: Person): string {
  return person.skills[0] ?? 'other'
}
