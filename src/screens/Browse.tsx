'use client'

import { Search, X } from 'lucide-react'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { FilterChip, SegmentedControl, FlatDivider } from '@/components/flat'
import { PersonCard } from '@/components/PersonCard'
import { RequestCard } from '@/components/RequestCard'
import { EmptyState, SectionHeader, TextInput, Select, ButtonLink } from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import { CATEGORIES } from '@/data/categories'
import { NEIGHBORHOODS, distanceMiles } from '@/data/neighborhoods'
import type { NeighborhoodId } from '@/types'

type SortMode = 'nearest' | 'newest' | 'budget'

export function Browse() {
  const { state, currentUser } = useBeam()
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
      if (sort === 'budget') return a.budget - b.budget
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

  function setTab(next: string) {
    const nextParams = new URLSearchParams(params.toString())
    if (next === 'people') nextParams.set('tab', 'people')
    else nextParams.delete('tab')
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
  }

  function setSort(next: string) {
    const nextParams = new URLSearchParams(params.toString())
    if (next === 'nearest') nextParams.delete('sort')
    else nextParams.set('sort', next)
    replaceQuery(nextParams)
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

  const count = tab === 'requests' ? openRequests.length : people.length
  const hasFilters =
    category !== 'all' || neighborhood !== 'all' || !!qParam || freeOnly || sort !== 'nearest'

  return (
    <div className="px-4 py-5 sm:py-6">
      <SectionHeader
        title="Browse"
        subtitle="Open requests and nearby helpers across Austin neighborhoods."
        action={
          <p className="tabular-nums type-sec font-medium text-beam-muted">
            {count} {tab === 'requests' ? 'open requests' : 'people'}
          </p>
        }
      />

      <div className="sticky top-16 z-20 mb-4 flex flex-col gap-3 border-b border-white/[0.08] bg-[#0C0C0E]/95 py-3 backdrop-blur-sm lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-beam-muted" />
          <TextInput
            value={qDraft}
            onChange={(e) => setQDraft(e.target.value)}
            placeholder="Search titles, details, skills…"
            className="h-11 border-white/[0.12] bg-[#141518] pl-9"
            aria-label="Search browse"
          />
        </div>
        <SegmentedControl
          className="w-full max-w-sm shrink-0"
          value={tab}
          onChange={setTab}
          options={[
            { id: 'requests', label: 'Requests' },
            { id: 'people', label: 'People' },
          ]}
        />
        <label className="flex shrink-0 items-center gap-2 type-sec text-beam-muted">
          <span className="sr-only sm:not-sr-only">Sort</span>
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort results"
            className="w-full border-0 bg-beam-surface-3 shadow-none sm:w-40"
          >
            <option value="nearest">Nearest</option>
            <option value="newest">{tab === 'people' ? 'Top rated' : 'Newest'}</option>
            <option value="budget">{tab === 'people' ? 'Rate' : 'Budget'}</option>
          </Select>
        </label>
      </div>

      <div className="hide-scrollbar mb-3 flex gap-2 overflow-x-auto pb-1">
        <FilterChip active={category === 'all'} onClick={() => setCategory('all')} label="All" />
        {CATEGORIES.map((c) => (
          <FilterChip
            key={c.id}
            active={category === c.id}
            onClick={() => setCategory(c.id)}
            label={c.shortLabel}
          />
        ))}
      </div>

      <div className="hide-scrollbar mb-3 flex gap-2 overflow-x-auto pb-1">
        <FilterChip
          active={neighborhood === 'all'}
          onClick={() => setNeighborhood('all')}
          label="All areas"
        />
        {NEIGHBORHOODS.map((n) => (
          <FilterChip
            key={n.id}
            active={neighborhood === n.id}
            onClick={() => setNeighborhood(n.id)}
            label={n.shortName}
          />
        ))}
        {tab === 'people' || freeOnly ? (
          <FilterChip
            active={freeOnly}
            onClick={toggleFree}
            label="Available afternoons/evenings"
          />
        ) : null}
      </div>

      {hasFilters ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {qParam ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-beam-line bg-beam-surface-2 px-2.5 py-1 type-meta text-beam-cream-dim">
              q: {qParam}
            </span>
          ) : null}
          {category !== 'all' ? (
            <span className="inline-flex items-center rounded-full border border-beam-line bg-beam-surface-2 px-2.5 py-1 type-meta">
              {category}
            </span>
          ) : null}
          {neighborhood !== 'all' ? (
            <span className="inline-flex items-center rounded-full border border-beam-line bg-beam-surface-2 px-2.5 py-1 type-meta">
              {neighborhood}
            </span>
          ) : null}
          {freeOnly ? (
            <span className="inline-flex items-center rounded-full border border-beam-line bg-beam-surface-2 px-2.5 py-1 type-meta">
              free=1
            </span>
          ) : null}
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1 rounded-full border border-beam-line px-2.5 py-1 type-meta text-beam-muted hover:text-beam-cream"
          >
            <X className="h-3 w-3" /> Clear filters
          </button>
        </div>
      ) : null}

      <FlatDivider className="mb-5" />

      {tab === 'requests' ? (
        openRequests.length ? (
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {openRequests.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No open requests match"
            body="Try clearing filters or post a request for your neighborhood."
            action={<ButtonLink href="/post" variant="brand">Post a request</ButtonLink>}
          />
        )
      ) : people.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {people.map((person) => (
            <PersonCard key={person.id} person={person} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No people match"
          body="Widen category or neighborhood filters, or turn off the availability chip."
        />
      )}
    </div>
  )
}
