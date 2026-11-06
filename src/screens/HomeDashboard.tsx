'use client'

import { ArrowRight, Search } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PersonCard } from '@/components/PersonCard'
import { RequestCard } from '@/components/RequestCard'
import { ButtonLink, Card, SectionHeader, TextInput, Badge, Money } from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import { CATEGORIES } from '@/data/categories'
import { getNeighborhood, distanceMiles, formatDistance } from '@/data/neighborhoods'
import { formatMoney, relativeTime } from '@/lib/matching'

export function HomeDashboard() {
  const { state, currentUser } = useBeam()
  const router = useRouter()
  const [query, setQuery] = useState('')

  const neighborhood = getNeighborhood(currentUser.neighborhood)

  const openNearby = useMemo(
    () =>
      state.requests
        .filter((r) => r.status === 'open')
        .sort(
          (a, b) =>
            distanceMiles(currentUser.neighborhood, a.neighborhood) -
              distanceMiles(currentUser.neighborhood, b.neighborhood) ||
            +new Date(b.createdAt) - +new Date(a.createdAt),
        )
        .slice(0, 6),
    [state.requests, currentUser.neighborhood],
  )

  const helpers = useMemo(
    () =>
      state.people
        .filter((p) => !p.isCurrentUser && p.availability.length > 0)
        .sort(
          (a, b) =>
            distanceMiles(currentUser.neighborhood, a.neighborhood) -
              distanceMiles(currentUser.neighborhood, b.neighborhood) || b.rating - a.rating,
        )
        .slice(0, 4),
    [state.people, currentUser.neighborhood],
  )

  const myOpen = useMemo(
    () => state.requests.filter((r) => r.requesterId === currentUser.id && r.status === 'open'),
    [state.requests, currentUser.id],
  )

  const myOffers = useMemo(
    () => state.offers.filter((o) => o.helperId === currentUser.id),
    [state.offers, currentUser.id],
  )

  function onSearch(e: FormEvent) {
    e.preventDefault()
    const q = query.trim()
    router.push(q ? `/browse?q=${encodeURIComponent(q)}` : '/browse')
  }

  return (
    <div className="px-4 py-6 sm:py-8">
      <SectionHeader
        title={`Hi, ${currentUser.name.split(' ')[0]}`}
        subtitle={`${neighborhood.name} · same-day help nearby`}
        action={
          <ButtonLink href="/post" variant="brand" size="sm">
            Post a request
          </ButtonLink>
        }
      />

      <form onSubmit={onSearch} className="mb-6">
        <label className="sr-only" htmlFor="home-search">
          Search requests and people
        </label>
        <div className="flex items-center gap-2 rounded-[12px] border border-beam-line bg-beam-base p-1.5 shadow-[var(--beam-shadow-xs)]">
          <Search className="ml-2 h-4 w-4 shrink-0 text-beam-muted" aria-hidden />
          <TextInput
            id="home-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search open requests or skills…"
            className="border-0 shadow-none focus:border-0"
          />
          <button
            type="submit"
            className="btn-compact shrink-0 rounded-[8px] bg-beam-charcoal px-4 text-[13px] font-semibold text-white"
          >
            Search
          </button>
        </div>
      </form>

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <Card className="p-4" hover>
          <p className="type-meta text-beam-muted">Your open requests</p>
          <p className="mt-1 tabular-nums type-h2 text-beam-cream">{myOpen.length}</p>
        </Card>
        <Card className="p-4" hover>
          <p className="type-meta text-beam-muted">Your offers</p>
          <p className="mt-1 tabular-nums type-h2 text-beam-cream">{myOffers.length}</p>
        </Card>
        <Card className="p-4" hover>
          <p className="type-meta text-beam-muted">Open nearby</p>
          <p className="mt-1 tabular-nums type-h2 text-beam-cream">{openNearby.length}</p>
        </Card>
      </div>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="type-h3 text-beam-cream">Quick categories</h2>
          <Link href="/browse" className="type-sec font-medium text-beam-amber-deep hover:underline">
            Browse all
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {CATEGORIES.map((c) => (
            <Link
              key={c.id}
              href={`/browse?category=${c.id}`}
              className="elevated elevated-hover flex flex-col items-center gap-2 px-3 py-3 text-center"
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-[10px] text-[12px] font-bold"
                style={{ background: c.tintBg, color: c.tintFg }}
              >
                {c.shortLabel[0]}
              </span>
              <p className="text-[13px] font-semibold text-beam-cream">{c.shortLabel}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="type-h3 text-beam-cream">Open requests near you</h2>
          <Link href="/browse" className="inline-flex items-center gap-1 type-sec font-medium text-beam-amber-deep">
            See all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {openNearby.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {openNearby.map((request) => (
              <div key={request.id} className="relative">
                <RequestCard request={request} />
                <p className="mt-1.5 type-meta text-beam-muted">
                  {formatDistance(distanceMiles(currentUser.neighborhood, request.neighborhood))} ·{' '}
                  {relativeTime(request.createdAt)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <Card className="p-6 text-center">
            <p className="type-sec text-beam-muted">No open requests nearby yet.</p>
            <ButtonLink href="/post" variant="brand" size="sm" className="mt-3">
              Post the first one
            </ButtonLink>
          </Card>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="type-h3 text-beam-cream">Helpers available</h2>
          <Link
            href="/browse?tab=people"
            className="inline-flex items-center gap-1 type-sec font-medium text-beam-amber-deep"
          >
            Browse people <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {helpers.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {helpers.map((person) => (
              <PersonCard key={person.id} person={person} />
            ))}
          </div>
        ) : (
          <p className="type-sec text-beam-muted">No helpers listed right now.</p>
        )}
      </section>

      {myOpen.length || myOffers.length ? (
        <section className="mt-8 rounded-[12px] border border-beam-line bg-beam-surface-2 p-4">
          <h2 className="type-h3 text-beam-cream">Your activity</h2>
          <ul className="mt-3 space-y-2">
            {myOpen.slice(0, 3).map((r) => (
              <li key={r.id}>
                <Link href={`/requests/${r.id}`} className="flex items-center justify-between gap-2 type-sec hover:underline">
                  <span className="flex items-center gap-2">
                    <Badge tone="live">Open</Badge>
                    {r.title}
                  </span>
                  <Money amount={r.budget} className="text-beam-cream" />
                </Link>
              </li>
            ))}
            {myOffers.slice(0, 3).map((o) => (
              <li key={o.id}>
                <Link
                  href={`/requests/${o.requestId}`}
                  className="flex items-center justify-between gap-2 type-sec hover:underline"
                >
                  <span>Your offer · {formatMoney(o.price)}</span>
                  <Badge tone="outline">{o.status}</Badge>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/you" className="mt-3 inline-block type-sec font-medium text-beam-amber-deep">
            Open You tab
          </Link>
        </section>
      ) : null}
    </div>
  )
}
