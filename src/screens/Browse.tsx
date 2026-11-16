'use client'

import { ChevronDown, MapPin } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { BrowseDistanceEmpty } from '@/components/browse/BrowseDistanceEmpty'
import { BrowseDistanceToggle } from '@/components/browse/BrowseDistanceToggle'
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
import { useBrowseHome } from '@/hooks/useBrowseHome'
import { helperProfileProgress } from '@/lib/helperProfileProgress'
import { readJobAlertsPreference, writeJobAlertsPreference } from '@/lib/jobAlerts'
import {
  formatBrowseMiles,
  formatBrowseMilesAway,
  nextBrowseRadius,
  parseBrowseRadius,
  radiusPhrase,
  type BrowseRadiusId,
  distanceMapForEntities,
} from '@/lib/browseDistance'
import { fetchBrowseMarketplaceDistances } from '@/lib/browseDistancesLive'
import { requestBrowseLocationPicker } from '@/lib/browseLocationPreference'
import { formatLocation } from '@/lib/location'
import { formatJobDetailsDisplay } from '@/lib/displayDetails'
import {
  formatBudget,
  formatPriceCaption,
  formatRate,
  hasListedPrice,
  relativeTime,
  requestAcceptsOffers,
} from '@/lib/matching'
import { formatPublicRating } from '@/lib/ratingDisplay'
import { hidesPeerHelperDiscovery, stripHelperDiscoveryParams } from '@/lib/roles'
import { listingCoverImage, normalizeListingImages } from '@/lib/listingPhotos'
import {
  BROWSE_PARENTS,
  expandBrowseFilter,
  formatCategoryLabel,
  matchesBrowseCategory,
} from '@/lib/taxonomy'
import { getWorkingHoursStatus } from '@/lib/workingHours'
import type { HelpRequest, Person, WhenOption } from '@/types'
import '@/components/browse/browse-hc.css'

type SortMode = 'nearest' | 'newest' | 'budget'
type PayFilter = 'all' | 'fixed' | 'open'

const PAGE_SIZE = 20

const REQUEST_SORT_OPTIONS: FilterOption[] = [
  { id: 'nearest', label: 'Nearest' },
  { id: 'newest', label: 'Newest first' },
  { id: 'budget', label: 'Highest price' },
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
  { id: 'fixed', label: 'Firm price' },
  { id: 'open', label: 'Open to offers' },
]

const AVAIL_FILTER_OPTIONS: FilterOption[] = [
  { id: 'all', label: 'Any' },
  { id: 'same-day', label: 'Same-day' },
  { id: 'available', label: 'Available now' },
]

function parseWhen(value: string | null): WhenOption | 'all' {
  if (value === 'asap' || value === 'today' || value === 'tomorrow' || value === 'this-week') {
    return value
  }
  return 'all'
}

type AvailFilter = 'all' | 'same-day' | 'available'

function parseAvail(value: string | null): AvailFilter {
  if (value === 'same-day' || value === 'available') return value
  return 'all'
}

function matchesAvailFilter(person: Person, avail: AvailFilter): boolean {
  if (avail === 'all') return true
  if (avail === 'same-day') return Boolean(person.availableNow)
  return getWorkingHoursStatus(person)?.status === 'available'
}

function parsePay(value: string | null): PayFilter {
  if (value === 'fixed' || value === 'open') return value
  return 'all'
}

function isBlankZeroCard(person: Person): boolean {
  return !(person.hourlyRate > 0)
}

function isBrowseHelper(person: Person): boolean {
  return Boolean(person.isHelper || person.skills.length > 0) && !isBlankZeroCard(person)
}

function oneLine(value: string): string {
  return formatJobDetailsDisplay(value).replace(/\s+/g, ' ').trim()
}

/** Neighborhood or city only — never a street address. */
function publicArea(request: HelpRequest): string {
  const label = formatLocation(request)
  const first = label.split(',')[0]?.trim() || ''
  if (!first || first === 'Local area' || first === 'Nearby') return ''
  if (/\d/.test(first)) return ''
  return first
}

function isOpenPay(request: HelpRequest): boolean {
  return requestAcceptsOffers(request) || !hasListedPrice(request)
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
  const { state, currentUser, authUser, mode, ready, helperVerification } = useBeam()
  const isGuest = mode === 'live' && !authUser
  const isLive = mode === 'live'
  const { home: browseHome, ready: homeReady, setFromZipPlace } = useBrowseHome({
    person: currentUser,
    helperVerification,
    requests: state.requests,
  })
  const hasHome = browseHome.hasOrigin
  const browseAnchor = useMemo(
    () =>
      hasHome
        ? { lat: browseHome.lat, lng: browseHome.lng }
        : { lat: null as number | null, lng: null as number | null },
    [hasHome, browseHome.lat, browseHome.lng],
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
  const radius = parseBrowseRadius(params.get('radius'), hasHome)
  const when = parseWhen(params.get('when'))
  const pay = parsePay(params.get('pay'))
  const avail = hidePeerDiscovery ? 'all' : parseAvail(params.get('avail'))
  const qParam = params.get('q') ?? ''
  const zipParam = params.get('zip') ?? ''
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
  const [liveRequestMiles, setLiveRequestMiles] = useState<Map<string, number | null> | null>(
    null,
  )
  const [liveProfileMiles, setLiveProfileMiles] = useState<Map<string, number | null> | null>(
    null,
  )

  useEffect(() => {
    setQDraft(qParam)
  }, [qParam])

  // Hero / deep-link ?zip= sets the browse-only area pin (same path as "Set your area").
  useEffect(() => {
    const raw = zipParam.trim()
    if (!raw) return
    const normalized = raw.replace(/\D/g, '').slice(0, 5)
    if (normalized.length !== 5) {
      const nextParams = new URLSearchParams(params.toString())
      nextParams.delete('zip')
      nextParams.delete('neighborhood')
      const qs = nextParams.toString()
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
      })
      return
    }

    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(`/api/zip?zip=${encodeURIComponent(normalized)}`)
        const data = (await res.json()) as {
          error?: string
          zip?: string
          lat?: number
          lng?: number
          city?: string
          stateCode?: string
          label?: string
        }
        if (
          cancelled ||
          !res.ok ||
          !data.zip ||
          data.lat == null ||
          data.lng == null
        ) {
          return
        }
        setFromZipPlace({
          zip: data.zip,
          city: data.city || '',
          stateCode: data.stateCode || '',
          lat: data.lat,
          lng: data.lng,
          label: data.label || `${data.city}, ${data.stateCode}`,
        })
      } catch {
        // Keep browsing; area pin stays unchanged if lookup fails.
      } finally {
        if (cancelled) return
        const nextParams = new URLSearchParams(params.toString())
        nextParams.delete('zip')
        nextParams.delete('neighborhood')
        const qs = nextParams.toString()
        startTransition(() => {
          router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
        })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [zipParam, params, pathname, router, startTransition, setFromZipPlace])

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

  // Prefer server-side distances in live mode when a home origin is known.
  useEffect(() => {
    if (!isLive || !hasHome || browseHome.lat == null || browseHome.lng == null) {
      setLiveRequestMiles(null)
      setLiveProfileMiles(null)
      return
    }
    let cancelled = false
    void fetchBrowseMarketplaceDistances({
      originLat: browseHome.lat,
      originLng: browseHome.lng,
      radius,
    }).then((result) => {
      if (cancelled) return
      if (!result) {
        setLiveRequestMiles(null)
        setLiveProfileMiles(null)
        return
      }
      setLiveRequestMiles(result.requestMiles)
      setLiveProfileMiles(result.profileMiles)
    })
    return () => {
      cancelled = true
    }
  }, [isLive, hasHome, browseHome.lat, browseHome.lng, radius, state.requests, state.people])

  const replaceQuery = useCallback(
    (nextParams: URLSearchParams) => {
      const qs = nextParams.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router],
  )

  const q = qParam.toLowerCase().trim()

  const openBase = useMemo(
    () => state.requests.filter((r) => r.status === 'open'),
    [state.requests],
  )
  const helperBase = useMemo(
    () =>
      state.people.filter(
        (p) => isBrowseHelper(p) && !(p.isCurrentUser || p.id === currentUser.id),
      ),
    [state.people, currentUser.id],
  )

  const localRequestDistances = useMemo(
    () =>
      distanceMapForEntities(openBase, hasHome ? browseAnchor : null, radius, (r) => r),
    [openBase, hasHome, browseAnchor, radius],
  )
  const localProfileDistances = useMemo(
    () =>
      distanceMapForEntities(helperBase, hasHome ? browseAnchor : null, radius, (p) => p),
    [helperBase, hasHome, browseAnchor, radius],
  )

  const requestMilesById = liveRequestMiles ?? localRequestDistances.milesById
  const profileMilesById = liveProfileMiles ?? localProfileDistances.milesById
  const requestAllowed = liveRequestMiles ?? localRequestDistances.ids
  const profileAllowed = liveProfileMiles ?? localProfileDistances.ids

  const openRequests = useMemo(() => {
    let list = openBase
      .filter((r) => requestAllowed.has(r.id))
      .filter((r) => matchesBrowseCategory(r.category, category))
      .filter((r) => (when === 'all' ? true : r.when === when))
      .filter((r) => {
        if (pay === 'all') return true
        const open = isOpenPay(r)
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
      const da = requestMilesById.get(a.id)
      const db = requestMilesById.get(b.id)
      return (
        (da ?? Number.POSITIVE_INFINITY) - (db ?? Number.POSITIVE_INFINITY) ||
        +new Date(b.createdAt) - +new Date(a.createdAt)
      )
    })
    return list
  }, [
    openBase,
    requestAllowed,
    category,
    when,
    pay,
    q,
    sort,
    isGuest,
    requestMilesById,
  ])

  const people = useMemo(() => {
    let list = helperBase
      .filter((p) => profileAllowed.has(p.id))
      .filter((p) => {
        if (category === 'all') return true
        const expanded = expandBrowseFilter(category)
        if (!expanded) return true
        return p.skills.some((s) => expanded.includes(s))
      })
      .filter((p) => matchesAvailFilter(p, avail))
      .filter((p) => {
        if (!q) return true
        return (
          p.name.toLowerCase().includes(q) ||
          p.bio.toLowerCase().includes(q) ||
          p.skills.some((s) => s.includes(q)) ||
          formatLocation(p).toLowerCase().includes(q)
        )
      })
      .filter((p) => (freeOnly ? Boolean(p.availableNow) : true))

    list = [...list].sort((a, b) => {
      if (sort === 'newest' || (isGuest && sort !== 'budget')) return b.rating - a.rating
      if (sort === 'budget') return a.hourlyRate - b.hourlyRate
      const da = profileMilesById.get(a.id)
      const db = profileMilesById.get(b.id)
      return (
        (da ?? Number.POSITIVE_INFINITY) - (db ?? Number.POSITIVE_INFINITY) || b.rating - a.rating
      )
    })
    return list
  }, [
    helperBase,
    profileAllowed,
    category,
    avail,
    q,
    freeOnly,
    sort,
    isGuest,
    profileMilesById,
  ])

  const profileProgress = useMemo(() => helperProfileProgress(currentUser), [currentUser])
  const jobsTabCount = openRequests.length
  const helpersTabCount = people.length
  const showProfileWaitCard =
    hidePeerDiscovery &&
    (currentUser.accountRole === 'helper' || Boolean(currentUser.isHelper)) &&
    (!currentUser.isHelper || profileProgress.percent < 100)
  const showHelperBanner =
    ready && !isGuest && currentUser.accountRole === 'helper' && !currentUser.isHelper

  const filterKey = `${tab}|${category}|${radius}|${when}|${pay}|${avail}|${qParam}|${sort}|${freeOnly}|${browseHome.source}`
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
    const next = id as BrowseRadiusId
    // Always persist explicit radius so Any is not confused with the 1 mi default.
    if (next === '1' && hasHome) nextParams.delete('radius')
    else nextParams.set('radius', next)
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
    if (hasHome) {
      // Keep default 1 mi (omit radius param).
    } else {
      nextParams.set('radius', 'all')
    }
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

  function widenDistance() {
    setRadius(nextBrowseRadius(radius))
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

  const hasNonDistanceFilters =
    category !== 'all' ||
    !!qParam ||
    freeOnly ||
    when !== 'all' ||
    pay !== 'all' ||
    avail !== 'all'

  const hasActiveFilters = hasNonDistanceFilters || (hasHome && radius !== 'all')

  const showDistanceEmpty =
    tab === 'requests' &&
    hasHome &&
    radius !== 'all' &&
    openRequests.length === 0 &&
    !hasNonDistanceFilters

  const showFreshMarketplace =
    tab === 'requests' &&
    !hasNonDistanceFilters &&
    (radius === 'all' || !hasHome) &&
    openRequests.length === 0

  const showFilteredRequestsEmpty =
    tab === 'requests' &&
    openRequests.length === 0 &&
    !showDistanceEmpty &&
    !showFreshMarketplace

  const showHelpersEmpty = !hidePeerDiscovery && tab === 'people' && people.length === 0
  const showWhileYouWait = showFreshMarketplace && (hidePeerDiscovery || isGuest === false)

  const liveCount = tab === 'requests' ? openRequests.length : people.length
  const taskNoun = liveCount === 1 ? 'task' : 'tasks'
  const helperNoun = liveCount === 1 ? 'helper' : 'helpers'
  const shownRequests = openRequests.slice(0, visibleCount)
  const shownPeople = people.slice(0, visibleCount)
  const selectedRequest = jobId ? state.requests.find((r) => r.id === jobId) ?? null : null
  const selectedHelper = helperId ? people.find((p) => p.id === helperId) ?? null : null
  const returnTo = params.toString() ? `${pathname}?${params.toString()}` : pathname
  const authHref = `/auth?next=${encodeURIComponent(returnTo)}`

  const suggestions = [
    category !== 'all' ? { label: 'All categories', onClick: () => setCategory('all') } : null,
    hasHome && radius !== 'all'
      ? { label: 'Any distance', onClick: () => setRadius('all') }
      : null,
    tab === 'requests' && when !== 'all' ? { label: 'Anytime', onClick: () => setWhen('all') } : null,
    tab === 'requests' && pay !== 'all' ? { label: 'All pay types', onClick: () => setPay('all') } : null,
    tab === 'people' && avail !== 'all'
      ? { label: 'Any availability', onClick: () => setAvail('all') }
      : null,
  ].filter((item): item is { label: string; onClick: () => void } => Boolean(item))

  function milesForRequest(id: string): number | null {
    if (!hasHome) return null
    const v = requestMilesById.get(id)
    return v == null ? null : v
  }

  function milesForPerson(id: string): number | null {
    if (!hasHome) return null
    const v = profileMilesById.get(id)
    return v == null ? null : v
  }

  const selectedMilesValue = selectedRequest ? milesForRequest(selectedRequest.id) : null
  const selectedMilesAway =
    selectedMilesValue != null ? formatBrowseMilesAway(selectedMilesValue) : null
  const selectedMilesShort =
    selectedMilesValue != null ? formatBrowseMiles(selectedMilesValue) : null
  const selectedArea = selectedRequest ? publicArea(selectedRequest) : ''
  const showDesktopDetail = Boolean(selectedRequest) && !narrow && tab === 'requests'
  const showDesktopHelperDetail = Boolean(selectedHelper) && !narrow && tab === 'people'
  const selectedHelperMilesValue = selectedHelper ? milesForPerson(selectedHelper.id) : null
  const selectedHelperMiles =
    selectedHelperMilesValue != null ? formatBrowseMiles(selectedHelperMilesValue) : null
  const selectedHelperSkill = selectedHelper
    ? selectedHelper.skills[0]
      ? formatCategoryLabel(skillId(selectedHelper), selectedHelper.otherSkillLabel)
      : 'Local help'
    : ''

  const heroTitle = tab === 'people' ? 'Helpers near you' : 'Jobs near you'
  const resultsCountLine =
    tab === 'requests'
      ? !hasHome
        ? `${liveCount} ${taskNoun} nearby`
        : liveCount === 0
          ? `No tasks within ${radiusPhrase(radius)}`
          : radius === 'all'
            ? `${liveCount} ${taskNoun} at any distance`
            : `${liveCount} ${taskNoun} within ${radiusPhrase(radius)}`
      : !hasHome
        ? `${liveCount} ${helperNoun} nearby`
        : liveCount === 0
          ? `No helpers within ${radiusPhrase(radius)}`
          : radius === 'all'
            ? `${liveCount} ${helperNoun} at any distance`
            : `${liveCount} ${helperNoun} within ${radiusPhrase(radius)}`

  const distanceToggleDisabled = !hasHome

  return (
    <div
      className={`browse-hc ${showHelperBanner ? 'has-helper-banner' : ''}`}
      data-testid="browse-v3"
      data-browse-layout={hidePeerDiscovery ? 'helper-jobs' : 'discovery'}
      data-browse-tab={tab}
      data-browse-radius={radius}
      data-browse-home={browseHome.source}
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
            {!hasHome && homeReady ? (
              <button
                type="button"
                className="browse-hc-set-area-link"
                data-testid="browse-set-area-link"
                onClick={() => requestBrowseLocationPicker()}
              >
                Set your area to see distances
              </button>
            ) : null}
          </div>

          <div className="browse-hc-title-controls">
            <BrowseLocationTrigger label="your area" className="browse-hc-loc-pill is-area-only">
              <MapPin className="pin h-4 w-4" strokeWidth={2} aria-hidden />
              <span className="browse-hc-loc-label">your area</span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#3D4A5F]" strokeWidth={2} aria-hidden />
            </BrowseLocationTrigger>
            <BrowseDistanceToggle
              value={hasHome ? radius : 'all'}
              onChange={setRadius}
              disabled={distanceToggleDisabled}
            />
          </div>
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

        {showDistanceEmpty ? (
          <BrowseDistanceEmpty radius={radius} onWiden={widenDistance} />
        ) : showFreshMarketplace ? (
          <>
            <BrowseFreshEmpty
              hidePeerDiscovery={hidePeerDiscovery}
              cityLabel="your area"
              onEnableAlerts={enableAlerts}
              alertsEnabled={alertsEnabled}
              onWidenRadius={hasHome ? widenDistance : undefined}
            />
            {showWhileYouWait ? (
              <WhileYouWait
                alertsEnabled={alertsEnabled}
                onToggleAlerts={toggleAlerts}
                onWidenRadius={hasHome ? widenDistance : undefined}
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
              <p className="browse-hc-results-count" data-testid="browse-results-count">
                {resultsCountLine}
              </p>
              <ul className="browse-hc-job-list" data-testid="browse-job-list">
                {shownRequests.map((request) => {
                  const area = publicArea(request)
                  const photos = normalizeListingImages(request.images, request.image)
                  const imageSrc = listingCoverImage(photos)
                  const listed = hasListedPrice(request)
                  const budget = formatBudget(request)
                  const caption = formatPriceCaption(request)
                  const miles = milesForRequest(request.id)
                  return (
                    <BrowseJobRow
                      key={request.id}
                      request={request}
                      title={request.title}
                      categoryLabel={formatCategoryLabel(request.category, request.categoryCustom)}
                      areaLabel={area}
                      distanceLabel={miles != null ? formatBrowseMilesAway(miles) : null}
                      timingLabel={
                        request.when === 'asap'
                          ? 'ASAP'
                          : request.whenLabel || relativeTime(request.createdAt)
                      }
                      asap={request.when === 'asap'}
                      excerpt={oneLine(request.details)}
                      priceLabel={listed ? budget : 'Open to offers'}
                      priceCaption={caption ?? ''}
                      openBudget={!listed}
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
              <div className="browse-hc-detail-col">
                <BrowseJobDetailPanel
                  request={selectedRequest}
                  areaLabel={selectedArea}
                  milesLabel={selectedMilesShort}
                  cityName="your area"
                  authHref={authHref}
                />
              </div>
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
              <p className="browse-hc-results-count" data-testid="browse-results-count">
                {resultsCountLine}
              </p>
              <ul className="browse-hc-job-list browse-hc-helper-list" data-testid="browse-helper-list">
                {shownPeople.map((person) => {
                  const skill = person.skills[0]
                    ? formatCategoryLabel(skillId(person), person.otherSkillLabel)
                    : 'Local help'
                  const miles = milesForPerson(person.id)
                  return (
                    <BrowseHelperRow
                      key={person.id}
                      person={person}
                      skillLabel={skill}
                      milesLabel={miles != null ? formatBrowseMiles(miles) : null}
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
              <div className="browse-hc-detail-col">
                <BrowseHelperDetailPanel
                  person={selectedHelper}
                  skillLabel={selectedHelperSkill}
                  milesLabel={selectedHelperMiles}
                />
              </div>
            ) : null}
          </div>
        )}
      </div>

      {selectedRequest && narrow ? (
        <BrowseJobDrawer
          request={selectedRequest}
          narrow
          milesLabel={selectedMilesAway}
          areaLabel={selectedArea}
          cityName="your area"
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
