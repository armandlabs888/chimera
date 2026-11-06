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
import { CATEGORIES } from '@/data/categories'
import { NEIGHBORHOODS, distanceMiles } from '@/data/neighborhoods'
import { ALL_CATEGORY_ICON, CATEGORY_ICONS } from '@/lib/categoryIcons'
import type { NeighborhoodId } from '@/types'

type SortMode = 'nearest' | 'newest' | 'budget'

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

export function Browse() {
  const { state, currentUser, authUser } = useBeam()
  const isGuest = !authUser
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [, startTransition] = useTransition()

  const tab = params.get('tab') === 'people' ? 'people' : 'requests'
  const category = params.get('category') ?? 'all'
  const neighborhood = (params.get('neighborhood') as NeighborhoodId | null) ?? 'all'
  const qParam = params.get('q') ?? ''
  const freeOnly = params.get('free') === '1'
  const sort = (params.get('sort') as SortMode) || 'nearest'

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

  const openRequests = useMemo(() => {
    let list = state.requests
      .filter((r) => r.status === 'open')
      .filter((r) => (category === 'all' ? true : r.category === category))
      .filter((r) => (neighborhood === 'all' ? true : r.neighborhood === neighborhood))
      .filter((r) => {
        if (!q) return true
        return (
          r.title.toLowerCase().includes(q) ||
          r.details.toLowerCase().includes(q) ||
          r.category.includes(q)
        )
      })

    list = [...list].sort((a, b) => {
      // Highest budget first — helpers browse for higher-paying tasks
      if (sort === 'budget') return b.budget - a.budget
      if (sort === 'newest') return +new Date(b.createdAt) - +new Date(a.createdAt)
      const da = distanceMiles(currentUser.neighborhood, a.neighborhood)
      const db = distanceMiles(currentUser.neighborhood, b.neighborhood)
      return da - db || +new Date(b.createdAt) - +new Date(a.createdAt)
    })
    return list
  }, [state.requests, category, neighborhood, q, sort, currentUser.neighborhood])

  const people = useMemo(() => {
    let list = state.people
      .filter((p) => !p.isCurrentUser)
      .filter((p) => (category === 'all' ? true : p.skills.includes(category as never)))
      .filter((p) => (neighborhood === 'all' ? true : p.neighborhood === neighborhood))
      .filter((p) => {
        if (!q) return true
        return (
          p.name.toLowerCase().includes(q) ||
          p.bio.toLowerCase().includes(q) ||
          p.skills.some((s) => s.includes(q))
        )
      })
      .filter((p) =>
        freeOnly ? p.availability.includes('afternoons') || p.availability.includes('evenings') : true,
      )

    list = [...list].sort((a, b) => {
      if (sort === 'newest') return b.rating - a.rating
      if (sort === 'budget') return a.hourlyRate - b.hourlyRate
      return (
        distanceMiles(currentUser.neighborhood, a.neighborhood) -
          distanceMiles(currentUser.neighborhood, b.neighborhood) || b.rating - a.rating
      )
    })
    return list
  }, [state.people, category, neighborhood, q, freeOnly, sort, currentUser.neighborhood])

  const openRequestCount = useMemo(
    () => state.requests.filter((r) => r.status === 'open').length,
    [state.requests],
  )
  const helperCount = useMemo(
    () => state.people.filter((p) => !p.isCurrentUser).length,
    [state.people],
  )

  function setTab(next: string) {
    const nextParams = new URLSearchParams(params.toString())
    if (next === 'people') nextParams.set('tab', 'people')
    else nextParams.delete('tab')
    if (next !== 'people') nextParams.delete('free')
    replaceQuery(nextParams)
  }

  function setCategory(id: string) {
    const nextParams = new URLSearchParams(params.toString())
    if (id === 'all') nextParams.delete('category')
    else nextParams.set('category', id)
    replaceQuery(nextParams)
  }

  function setNeighborhood(id: string) {
    const nextParams = new URLSearchParams(params.toString())
    if (id === 'all') nextParams.delete('neighborhood')
    else nextParams.set('neighborhood', id)
    replaceQuery(nextParams)
    setAreaOpen(false)
  }

  function setSort(next: string) {
    const nextParams = new URLSearchParams(params.toString())
    if (next === 'nearest') nextParams.delete('sort')
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

  function removeNeighborhood() {
    setNeighborhood('all')
  }

  function removeFree() {
    const nextParams = new URLSearchParams(params.toString())
    nextParams.delete('free')
    replaceQuery(nextParams)
  }

  const sortOptions = tab === 'people' ? PEOPLE_SORT_OPTIONS : REQUEST_SORT_OPTIONS
  const sortLabel = sortOptions.find((o) => o.id === sort)?.label ?? 'Nearest'
  const neighborhoodLabel =
    neighborhood === 'all'
      ? 'All neighborhoods'
      : NEIGHBORHOODS.find((n) => n.id === neighborhood)?.name ?? 'All neighborhoods'
  const categoryLabel =
    category === 'all' ? null : CATEGORIES.find((c) => c.id === category)?.shortLabel ?? category

  const hasActiveFilters = category !== 'all' || neighborhood !== 'all' || !!qParam || freeOnly

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

  const areaOptionIds = ['all', ...NEIGHBORHOODS.map((n) => n.id)]
  const sortOptionIds = sortOptions.map((o) => o.id)

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
              : 'Open neighborhood requests and reviewed helpers across Austin.'}
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
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-full px-3 py-2.5 text-left sm:px-4"
              aria-expanded={areaOpen}
              aria-haspopup="listbox"
              aria-controls="browse-neighborhood-listbox"
              data-testid="browse-neighborhood-trigger"
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
                  neighborhood === 'all' ? 'text-[#64748B]' : 'font-medium text-[#071330]'
                }`}
              >
                {neighborhoodLabel}
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-[#94A3B8] transition-transform ${
                  areaOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
            {areaOpen ? (
              <ul
                id="browse-neighborhood-listbox"
                role="listbox"
                data-testid="browse-neighborhood-listbox"
                className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-[min(18rem,50vh)] overflow-y-auto overscroll-contain rounded-2xl border border-[rgba(7,19,48,0.12)] bg-white py-1.5 shadow-[0_18px_40px_-12px_rgba(12,42,102,0.35),0_4px_12px_rgba(12,42,102,0.12)] lg:left-0 lg:right-auto lg:min-w-[17rem]"
                onKeyDown={(e) =>
                  onListboxKeyDown(
                    e,
                    areaOptionIds,
                    neighborhood,
                    setNeighborhood,
                    () => setAreaOpen(false),
                  )
                }
              >
                <li>
                  <button
                    type="button"
                    role="option"
                    aria-selected={neighborhood === 'all'}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-[14px] transition-colors hover:bg-[#F4F8FD] ${
                      neighborhood === 'all'
                        ? 'bg-[#EEF4FF] font-semibold text-[#1D5CE5]'
                        : 'text-[#071330]'
                    }`}
                    onClick={() => setNeighborhood('all')}
                  >
                    All neighborhoods
                    {neighborhood === 'all' ? <Check className="h-4 w-4 shrink-0" aria-hidden /> : null}
                  </button>
                </li>
                {NEIGHBORHOODS.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={neighborhood === n.id}
                      className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-[14px] transition-colors hover:bg-[#F4F8FD] ${
                        neighborhood === n.id
                          ? 'bg-[#EEF4FF] font-semibold text-[#1D5CE5]'
                          : 'text-[#475569]'
                      }`}
                      onClick={() => setNeighborhood(n.id)}
                    >
                      {n.name}
                      {neighborhood === n.id ? (
                        <Check className="h-4 w-4 shrink-0" aria-hidden />
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
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
          {neighborhood !== 'all' ? (
            <FilterSummaryPill
              label={
                NEIGHBORHOODS.find((n) => n.id === neighborhood)?.shortName ?? neighborhood
              }
              onRemove={removeNeighborhood}
            />
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

      {tab === 'requests' ? (
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
          body="Widen category or neighborhood filters, or turn off the availability chip."
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
