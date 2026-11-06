'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { RequestCard } from '@/components/RequestCard'
import { ButtonLink } from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import { distanceMiles } from '@/data/neighborhoods'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export function HomeDashboard() {
  const { state, currentUser } = useBeam()
  const first = currentUser.name.split(' ')[0]

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
        .slice(0, 3),
    [state.requests, currentUser.neighborhood],
  )

  const myOpen = useMemo(
    () => state.requests.filter((r) => r.requesterId === currentUser.id && r.status === 'open'),
    [state.requests, currentUser.id],
  )

  const waitingOffers = useMemo(() => {
    const openIds = new Set(myOpen.map((r) => r.id))
    return state.offers.filter((o) => openIds.has(o.requestId) && o.status === 'pending').length
  }, [state.offers, myOpen])

  const activity = useMemo(() => {
    const rows: { id: string; label: string; href: string }[] = []
    for (const r of myOpen.slice(0, 3)) {
      rows.push({ id: r.id, label: `Open · ${r.title}`, href: `/requests/${r.id}` })
    }
    const myOffers = state.offers.filter((o) => o.helperId === currentUser.id).slice(0, 3)
    for (const o of myOffers) {
      const req = state.requests.find((r) => r.id === o.requestId)
      rows.push({
        id: o.id,
        label: `${o.status} offer · ${req?.title ?? 'Request'}`,
        href: `/requests/${o.requestId}`,
      })
    }
    return rows.slice(0, 6)
  }, [myOpen, state.offers, state.requests, currentUser.id])

  return (
    <div className="px-4 py-8 sm:py-10">
      <h1
        className="font-serif text-[clamp(2rem,4vw,2.5rem)] font-normal leading-[1.05] tracking-[-0.02em] text-[#071330]"
        style={{ fontVariationSettings: "'opsz' 72" }}
      >
        {greeting()}, {first}
      </h1>
      {waitingOffers > 0 && myOpen[0] ? (
        <Link
          href={`/requests/${myOpen[0].id}`}
          className="mt-3 inline-flex items-center gap-1 text-[16px] text-[#1D5CE5] hover:text-[#1D5CE5]"
        >
          {waitingOffers} offer{waitingOffers === 1 ? '' : 's'} waiting on your {myOpen[0].title.toLowerCase()}
          <ArrowRight className="h-4 w-4" />
        </Link>
      ) : (
        <p className="mt-3 text-[16px] text-[#64748B]">Same-day help near you in Austin.</p>
      )}

      <section className="mt-12">
        <div className="mb-5 flex items-end justify-between gap-3">
          <h2
            className="font-serif text-[26px] font-normal text-[#071330]"
            style={{ fontVariationSettings: "'opsz' 72" }}
          >
            Open near you
          </h2>
          <Link href="/browse" className="text-[14px] font-medium text-[#1D5CE5]">
            See all →
          </Link>
        </div>
        {openNearby.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {openNearby.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-[rgba(7,19,48,0.08)] px-6 py-10 text-center">
            <p className="font-serif text-[22px] text-[#071330]">Nothing open nearby yet</p>
            <ButtonLink href="/post" className="mt-5">
              Post a request
            </ButtonLink>
          </div>
        )}
      </section>

      <section className="mt-14">
        <h2
          className="font-serif text-[26px] font-normal text-[#071330]"
          style={{ fontVariationSettings: "'opsz' 72" }}
        >
          Your activity
        </h2>
        {activity.length ? (
          <ul className="mt-5 divide-y divide-white/[0.08] border-y border-[rgba(7,19,48,0.08)]">
            {activity.map((row) => (
              <li key={row.id}>
                <Link
                  href={row.href}
                  className="flex items-center justify-between gap-3 py-4 text-[15px] text-[#071330] hover:text-white"
                >
                  <span className="truncate">{row.label}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-[#64748B]" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-[15px] text-[#64748B]">No activity yet — post or browse to get started.</p>
        )}
      </section>
    </div>
  )
}
