'use client'

import { useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { FilterChip, SegmentedControl, FlatDivider } from '../components/flat'
import { PersonCard } from '../components/PersonCard'
import { RequestCard } from '../components/RequestCard'
import { EmptyState, SectionHeader } from '../components/ui'
import { useBeam } from '../context/BeamContext'
import { CATEGORIES } from '../data/categories'
import { distanceMiles } from '../data/neighborhoods'

export function Browse() {
  const { state, currentUser } = useBeam()
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const tab = params.get('tab') === 'people' ? 'people' : 'requests'
  const category = params.get('category') ?? 'all'
  const q = (params.get('q') ?? '').toLowerCase().trim()
  const freeOnly = params.get('free') === '1'

  function replaceQuery(nextParams: URLSearchParams) {
    const qs = nextParams.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }

  const openRequests = useMemo(() => {
    return state.requests
      .filter((r) => r.status === 'open')
      .filter((r) => (category === 'all' ? true : r.category === category))
      .filter((r) => {
        if (!q) return true
        return (
          r.title.toLowerCase().includes(q) ||
          r.details.toLowerCase().includes(q) ||
          r.category.includes(q)
        )
      })
      .sort((a, b) => {
        const da = distanceMiles(currentUser.neighborhood, a.neighborhood)
        const db = distanceMiles(currentUser.neighborhood, b.neighborhood)
        return da - db || +new Date(b.createdAt) - +new Date(a.createdAt)
      })
  }, [state.requests, category, q, currentUser.neighborhood])

  const people = useMemo(() => {
    return state.people
      .filter((p) => !p.isCurrentUser)
      .filter((p) => (category === 'all' ? true : p.skills.includes(category as never)))
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
      .sort(
        (a, b) =>
          distanceMiles(currentUser.neighborhood, a.neighborhood) -
            distanceMiles(currentUser.neighborhood, b.neighborhood) || b.rating - a.rating,
      )
  }, [state.people, category, q, freeOnly, currentUser.neighborhood])

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

  return (
    <div className="px-4 py-5 sm:py-6">
      <SectionHeader
        title="Browse"
        subtitle="Open requests stay listed. People are nearby neighbors with skills."
      />

      <SegmentedControl
        className="mb-4 max-w-sm"
        value={tab}
        onChange={setTab}
        options={[
          { id: 'requests', label: 'requests' },
          { id: 'people', label: 'people' },
        ]}
      />

      <div className="hide-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1">
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

      <FlatDivider className="mb-5" />

      {tab === 'requests' ? (
        openRequests.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {openRequests.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No open requests"
            body="Try another category, or post what you need done today."
          />
        )
      ) : people.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {people.map((person) => (
            <PersonCard key={person.id} person={person} />
          ))}
        </div>
      ) : (
        <EmptyState title="No people match" body="Widen the category filter or clear search." />
      )}
    </div>
  )
}
