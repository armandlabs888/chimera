'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { ArrowRight, Bell, CheckCircle2, MessageCircle, Star } from 'lucide-react'
import { RequestCard } from '@/components/RequestCard'
import { ButtonLink } from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import { CATEGORIES } from '@/data/categories'
import { distanceBetween } from '@/lib/location'
import { rankHelpersForRequest } from '@/lib/matching'
import type { HelpRequest } from '@/types'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export function HomeDashboard() {
  const { state, currentUser, updateProfile, authUser, mode } = useBeam()
  const first = currentUser.name.split(' ')[0] || 'there'
  const isHelper = Boolean(currentUser.isHelper || currentUser.skills.length > 0)
  const becomeHelperHref =
    mode === 'live' && !authUser
      ? '/auth?mode=signup&next=%2Fonboarding%2Fhelper'
      : '/onboarding/helper'

  const myOpen = useMemo(
    () => state.requests.filter((r) => r.requesterId === currentUser.id && r.status === 'open'),
    [state.requests, currentUser.id],
  )

  const waitingOffers = useMemo(() => {
    const openIds = new Set(myOpen.map((r) => r.id))
    return state.offers.filter((o) => openIds.has(o.requestId) && o.status === 'pending')
  }, [state.offers, myOpen])

  const acceptedJobs = useMemo(
    () =>
      state.requests.filter(
        (r) =>
          r.status === 'accepted' &&
          (r.requesterId === currentUser.id || r.helperId === currentUser.id),
      ),
    [state.requests, currentUser.id],
  )

  const unreadMessages = useMemo(() => {
    const myThreadIds = new Set(
      state.threads.filter((t) => t.participantIds.includes(currentUser.id)).map((t) => t.id),
    )
    return state.messages.filter(
      (m) => myThreadIds.has(m.threadId) && m.senderId !== currentUser.id,
    ).length
  }, [state.threads, state.messages, currentUser.id])

  const pendingReviews = useMemo(() => {
    return state.requests.filter((r) => {
      if (r.status !== 'completed') return false
      const involved =
        r.requesterId === currentUser.id || r.helperId === currentUser.id
      if (!involved) return false
      return !state.reviews.some((rev) => rev.requestId === r.id && rev.fromId === currentUser.id)
    })
  }, [state.requests, state.reviews, currentUser.id])

  const unreadNotifications = useMemo(
    () =>
      (state.notifications ?? []).filter(
        (n) => !n.readAt && (n.userId === currentUser.id || mode === 'demo'),
      ).length,
    [state.notifications, currentUser.id, mode],
  )

  const actionItems = useMemo(() => {
    const rows: { id: string; label: string; href: string; icon: 'offer' | 'job' | 'msg' | 'review' | 'bell' }[] =
      []
    if (waitingOffers.length) {
      const firstOffer = waitingOffers[0]
      const req = state.requests.find((r) => r.id === firstOffer.requestId)
      rows.push({
        id: 'offers',
        label: `${waitingOffers.length} offer${waitingOffers.length === 1 ? '' : 's'} waiting${
          req ? ` on ${req.title}` : ''
        }`,
        href: req ? `/requests/${req.id}` : '/you?tab=requests',
        icon: 'offer',
      })
    }
    for (const job of acceptedJobs.slice(0, 2)) {
      rows.push({
        id: `job-${job.id}`,
        label: `Accepted · ${job.title}`,
        href: `/requests/${job.id}`,
        icon: 'job',
      })
    }
    if (unreadMessages > 0) {
      rows.push({
        id: 'messages',
        label: `${unreadMessages} unread message${unreadMessages === 1 ? '' : 's'}`,
        href: '/messages',
        icon: 'msg',
      })
    }
    for (const job of pendingReviews.slice(0, 2)) {
      rows.push({
        id: `review-${job.id}`,
        label: `Leave a review · ${job.title}`,
        href: `/requests/${job.id}`,
        icon: 'review',
      })
    }
    if (unreadNotifications > 0 && rows.length < 2) {
      rows.push({
        id: 'notifs',
        label: `${unreadNotifications} unread notification${unreadNotifications === 1 ? '' : 's'}`,
        href: '/you?tab=notifications',
        icon: 'bell',
      })
    }
    return rows.slice(0, 6)
  }, [
    waitingOffers,
    acceptedJobs,
    unreadMessages,
    pendingReviews,
    unreadNotifications,
    state.requests,
  ])

  const goodMatches = useMemo(() => {
    if (!isHelper) return [] as { request: HelpRequest; score: number; reasons: string[] }[]
    const open = state.requests.filter(
      (r) => r.status === 'open' && r.requesterId !== currentUser.id,
    )
    return open
      .map((request) => {
        const ranked = rankHelpersForRequest(request, [currentUser])
        const self = ranked[0]
        const miles = distanceBetween(currentUser, request)
        const within =
          miles == null ||
          miles <= Math.max(request.radiusMiles ?? 5, currentUser.serviceRadiusMiles ?? 5) + 0.5
        const skillMatch = currentUser.skills.includes(request.category)
        if (!self && !skillMatch) return null
        if (!within && !skillMatch) return null
        return {
          request,
          score: self?.score ?? (skillMatch ? 40 : 10),
          reasons: self?.reasons ?? (skillMatch ? ['Matches your skills'] : ['Nearby']),
        }
      })
      .filter(Boolean)
      .sort((a, b) => (b?.score ?? 0) - (a?.score ?? 0))
      .slice(0, 4) as { request: HelpRequest; score: number; reasons: string[] }[]
  }, [isHelper, state.requests, currentUser])

  return (
    <div className="py-2 sm:py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[clamp(2rem,4vw,2.5rem)] font-bold leading-[1.15] tracking-[-0.02em] text-[#071330]">
            {greeting()}, {first}
          </h1>
          <p className="mt-2 text-[16px] text-[#64748B]">
            {isHelper
              ? 'Same-day jobs matched to your skills and area.'
              : 'Post a request or browse helpers nearby.'}
          </p>
        </div>

        {isHelper ? (
          <div className="flex items-center gap-3 rounded-full border border-[rgba(7,19,48,0.08)] bg-white px-4 py-2.5 shadow-[0_8px_20px_-12px_rgba(12,42,102,0.12)]">
            <div>
              <p className="text-[13px] font-semibold text-[#071330]">Available now</p>
              <p className="text-[11px] text-[#64748B]">Boost same-day matches</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(currentUser.availableNow)}
              onClick={() => updateProfile({ availableNow: !currentUser.availableNow })}
              className={`relative h-7 w-12 rounded-full transition ${
                currentUser.availableNow ? 'bg-emerald-500' : 'bg-[#CBD5E1]'
              }`}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                  currentUser.availableNow ? 'left-[22px]' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        ) : (
          <ButtonLink href={becomeHelperHref} variant="secondary">
            Become a helper
          </ButtonLink>
        )}
      </div>

      {actionItems.length ? (
        <section className="mt-10">
          <h2 className="font-display text-[22px] font-bold text-[#071330]">Action items</h2>
          <ul className="mt-4 divide-y divide-[rgba(7,19,48,0.08)] overflow-hidden rounded-[22px] border border-[rgba(7,19,48,0.08)] bg-white">
            {actionItems.map((row) => (
              <li key={row.id}>
                <Link
                  href={row.href}
                  className="flex items-center gap-3 px-4 py-4 text-[15px] text-[#071330] transition hover:bg-[#F4F8FD]"
                >
                  <ActionIcon kind={row.icon} />
                  <span className="min-w-0 flex-1 truncate font-medium">{row.label}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-[#94A3B8]" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {isHelper ? (
        <section className="mt-12">
          <div className="mb-5 flex items-end justify-between gap-3">
            <h2 className="font-display text-[22px] font-bold text-[#071330]">Good matches</h2>
            <Link href="/browse" className="text-[14px] font-semibold text-[#1D5CE5]">
              See all →
            </Link>
          </div>
          {goodMatches.length ? (
            <div className="grid gap-5 sm:grid-cols-2">
              {goodMatches.map(({ request, reasons }) => (
                <div key={request.id} className="space-y-2">
                  <RequestCard request={request} />
                  <p className="px-1 text-[12.5px] font-medium text-[#64748B]">
                    {reasons.slice(0, 3).join(' · ')}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[22px] border border-[rgba(7,19,48,0.08)] bg-white px-6 py-10 text-center">
              <p className="font-display text-[20px] font-bold text-[#071330]">
                No strong matches yet
              </p>
              <p className="mt-2 text-[14px] text-[#64748B]">
                Browse open requests or update your skills and radius.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <ButtonLink href="/browse">Browse requests</ButtonLink>
                <ButtonLink href="/onboarding/helper" variant="secondary">
                  Edit helper profile
                </ButtonLink>
              </div>
            </div>
          )}
        </section>
      ) : (
        <section className="mt-12">
          <h2 className="font-display text-[22px] font-bold text-[#071330]">Quick post</h2>
          <p className="mt-1 text-[14px] text-[#64748B]">
            Pick a category and get help today.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {CATEGORIES.map((c) => (
              <Link
                key={c.id}
                href={`/post?category=${c.id}`}
                className="rounded-[20px] border border-[rgba(7,19,48,0.08)] bg-white px-4 py-4 text-left transition hover:border-[rgba(29,92,229,0.28)] hover:shadow-[0_12px_28px_-16px_rgba(12,42,102,0.14)]"
              >
                <p className="text-[15px] font-bold text-[#071330]">{c.shortLabel}</p>
                <p className="mt-1 text-[12.5px] text-[#64748B]">{c.typicalRange}</p>
              </Link>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <ButtonLink href="/post">Post a request</ButtonLink>
            <ButtonLink href={becomeHelperHref} variant="secondary">
              Become a helper
            </ButtonLink>
          </div>
        </section>
      )}
    </div>
  )
}

function ActionIcon({
  kind,
}: {
  kind: 'offer' | 'job' | 'msg' | 'review' | 'bell'
}) {
  const className = 'h-4 w-4 text-[#1D5CE5]'
  switch (kind) {
    case 'offer':
      return <CheckCircle2 className={className} />
    case 'job':
      return <CheckCircle2 className={className} />
    case 'msg':
      return <MessageCircle className={className} />
    case 'review':
      return <Star className={className} />
    case 'bell':
      return <Bell className={className} />
  }
}
