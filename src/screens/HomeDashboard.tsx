'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Bell, CheckCircle2, ChevronRight, MessageCircle, Star } from 'lucide-react'
import { RequestCard } from '@/components/RequestCard'
import { useBeam } from '@/context/BeamContext'
import { BROWSE_PARENTS } from '@/lib/taxonomy'
import { distanceBetween } from '@/lib/location'
import { rankHelpersForRequest } from '@/lib/matching'
import type { HelpRequest } from '@/types'
import '@/components/account/account-hc.css'

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
        href: '/home?messages=1',
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
          miles <= (currentUser.serviceRadiusMiles ?? 5) + 0.5
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
    <div className="account-hc" data-testid="home-dashboard">
      <div className="account-hc-wrap account-hc-page">
        <div className="account-hc-title-row">
          <div>
            <h1 className="account-hc-hero-title">
              {greeting()}, {first}
            </h1>
            <p className="account-hc-hero-sub">
              {isHelper
                ? 'Same-day jobs matched to your skills and area.'
                : 'Post a request or browse helpers nearby.'}
            </p>
          </div>

          {isHelper ? (
            <div className="account-hc-card account-hc-avail-card">
              <div>
                <p className="lbl">Available now</p>
                <p className="hint">Boost same-day matches</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={Boolean(currentUser.availableNow)}
                aria-label="Available now"
                onClick={() => updateProfile({ availableNow: !currentUser.availableNow })}
                className="account-hc-switch"
              >
                <span className="knob" />
              </button>
            </div>
          ) : (
            <Link href={becomeHelperHref} className="account-hc-btn account-hc-btn-secondary">
              Become a helper
            </Link>
          )}
        </div>

        {actionItems.length ? (
          <section className="account-hc-section">
            <h2 className="account-hc-section-head" style={{ display: 'block', marginBottom: 16 }}>
              Action items
            </h2>
            <ul className="account-hc-card account-hc-list">
              {actionItems.map((row) => (
                <li key={row.id}>
                  <Link href={row.href} className="account-hc-list-row account-hc-action-row">
                    <span className="ico" aria-hidden>
                      <ActionIcon kind={row.icon} />
                    </span>
                    <span className="label">{row.label}</span>
                    <ChevronRight className="chev h-4 w-4" strokeWidth={2} aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {isHelper ? (
          <section className="account-hc-section">
            <div className="account-hc-section-head">
              <h2>Good matches</h2>
              <Link href="/browse" className="account-hc-text-link">
                See all →
              </Link>
            </div>
            {goodMatches.length ? (
              <div className="account-hc-job-grid">
                {goodMatches.map(({ request, reasons }) => (
                  <div key={request.id}>
                    <RequestCard request={request} />
                    <p className="account-hc-match-why">{reasons.slice(0, 3).join(' · ')}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="account-hc-card account-hc-empty">
                <h3>No strong matches yet</h3>
                <p>Browse open requests or update your skills and radius.</p>
                <div className="actions">
                  <Link href="/browse" className="account-hc-btn">
                    Browse requests
                  </Link>
                  <Link href="/onboarding/helper" className="account-hc-btn account-hc-btn-secondary">
                    Edit helper profile
                  </Link>
                </div>
              </div>
            )}
          </section>
        ) : (
          <section className="account-hc-section">
            <h2 className="account-hc-section-head" style={{ display: 'block', marginBottom: 8 }}>
              Quick post
            </h2>
            <p className="account-hc-hero-sub" style={{ marginTop: 0, marginBottom: 16 }}>
              Pick a category and get help today.
            </p>
            <div className="account-hc-quick-grid">
              {BROWSE_PARENTS.map((p) => (
                <Link
                  key={p.id}
                  href={`/post?category=${p.id}`}
                  className="account-hc-card account-hc-quick-tile"
                >
                  <p className="t">{p.shortLabel}</p>
                  <p className="d">{p.description}</p>
                </Link>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/post" className="account-hc-btn">
                Post a request
              </Link>
              <Link href={becomeHelperHref} className="account-hc-btn account-hc-btn-secondary">
                Become a helper
              </Link>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function ActionIcon({
  kind,
}: {
  kind: 'offer' | 'job' | 'msg' | 'review' | 'bell'
}) {
  const className = 'h-4 w-4'
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
