'use client'

import { ArrowRight, Search } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PersonCard } from '../components/PersonCard'
import { RequestCard } from '../components/RequestCard'
import { ButtonLink, SectionHeader, TextInput } from '../components/ui'
import { useBeam } from '../context/BeamContext'
import { CATEGORIES } from '../data/categories'
import { getNeighborhood } from '../data/neighborhoods'
import { HERO_IMAGE } from '../data/seed'
import { relativeTime } from '../lib/matching'

export function Home() {
  const { state, currentUser } = useBeam()
  const router = useRouter()
  const [query, setQuery] = useState('')

  const openRequests = useMemo(
    () =>
      state.requests
        .filter((r) => r.status === 'open')
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [state.requests],
  )

  const peopleNow = useMemo(
    () =>
      state.people
        .filter((p) => !p.isCurrentUser && p.availability.length > 0)
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 4),
    [state.people],
  )

  const pulse = openRequests.slice(0, 3)

  function onSearch(e: FormEvent) {
    e.preventDefault()
    const q = query.trim()
    router.push(q ? `/browse?q=${encodeURIComponent(q)}` : '/browse')
  }

  return (
    <div>
      <section className="relative min-h-[88dvh] overflow-hidden md:min-h-[78dvh]">
        <img
          src={HERO_IMAGE}
          alt="Austin neighborhood at dusk"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="scrim-hero absolute inset-0" />
        <div className="relative mx-auto flex min-h-[88dvh] max-w-6xl flex-col justify-end px-4 pb-10 pt-24 md:min-h-[78dvh] md:pb-16">
          <p className="animate-fade-up font-display text-4xl font-semibold tracking-tight text-beam-amber sm:text-5xl md:text-6xl">
            Beam
          </p>
          <h1 className="animate-fade-up-delay mt-3 max-w-xl font-display text-3xl font-semibold leading-[1.1] text-beam-cream sm:text-4xl md:text-5xl">
            Help nearby. Done today.
          </h1>
          <p className="mt-4 max-w-md text-base text-beam-cream-dim md:text-lg">
            Post what you need done. Neighbors nearby reply with a time and a price — no lead fees,
            no feed to dig through.
          </p>

          <form onSubmit={onSearch} className="mt-8 max-w-xl animate-fade-up-delay">
            <label className="sr-only" htmlFor="home-search">
              What do you need help with?
            </label>
            <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-beam-base/70 p-2 backdrop-blur-md">
              <Search className="ml-2 h-5 w-5 shrink-0 text-beam-amber" />
              <TextInput
                id="home-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What do you need help with?"
                className="border-0 bg-transparent px-2 shadow-none focus:border-0 focus:outline-none"
              />
              <button
                type="submit"
                className="touch-target shrink-0 rounded-xl bg-beam-amber px-4 py-3 text-sm font-semibold text-beam-base"
              >
                Search
              </button>
            </div>
          </form>

          <div className="mt-5 flex flex-wrap gap-3">
            <ButtonLink href="/browse?tab=people" className="min-w-[10rem]">
              Find nearby help
            </ButtonLink>
            <ButtonLink href="/browse?tab=people&free=1" variant="secondary" className="min-w-[10rem]">
              See who&apos;s free
            </ButtonLink>
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-beam-base/55 p-4 backdrop-blur-md">
            <div className="mb-3 flex items-center gap-2 text-sm text-beam-cream-dim">
              <span className="h-2 w-2 animate-pulse-dot rounded-full bg-emerald-400" />
              Nearby pulse · {getNeighborhood(currentUser.neighborhood).shortName}
            </div>
            <ul className="space-y-2">
              {pulse.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/requests/${r.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 transition hover:bg-white/5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-beam-cream">{r.title}</p>
                      <p className="text-xs text-beam-muted">
                        {getNeighborhood(r.neighborhood).shortName} · {relativeTime(r.createdAt)}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-beam-amber" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="px-4 py-10">
        <SectionHeader title="Categories" subtitle="Narrow on purpose — practical jobs only." />
        <div className="hide-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              href={`/browse?category=${cat.id}`}
              className="group relative h-36 w-44 shrink-0 overflow-hidden rounded-2xl"
            >
              <img
                src={cat.image}
                alt=""
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-3">
                <p className="font-display text-lg text-beam-cream">{cat.shortLabel}</p>
                <p className="text-[11px] text-beam-cream-dim">{cat.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="px-4 pb-10">
        <SectionHeader
          title="Open nearby"
          subtitle="Requests stay visible until they’re filled."
          action={
            <Link href="/browse" className="text-sm font-medium text-beam-amber">
              See all
            </Link>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {openRequests.slice(0, 6).map((request) => (
            <RequestCard key={request.id} request={request} />
          ))}
        </div>
      </section>

      <section className="px-4 pb-12">
        <SectionHeader
          title="People available now"
          subtitle="Ranked locally once you open a request."
          action={
            <Link href="/browse?tab=people" className="text-sm font-medium text-beam-amber">
              Browse people
            </Link>
          }
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {peopleNow.map((person) => (
            <PersonCard key={person.id} person={person} />
          ))}
        </div>
      </section>
    </div>
  )
}
