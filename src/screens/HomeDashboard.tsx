'use client'

import { useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Bell, CheckCircle2, ChevronRight, MessageCircle, Star } from 'lucide-react'
import { BrowseCategoryThumb } from '@/components/browse/BrowseCategoryThumb'
import { useBeam } from '@/context/BeamContext'
import { formatDistance } from '@/data/neighborhoods'
import { distanceBetween, formatLocation } from '@/lib/location'
import { formatBudget, relativeTime, rankHelpersForRequest } from '@/lib/matching'
import { listingCoverImage, normalizeListingImages } from '@/lib/listingPhotos'
import { BROWSE_PARENTS, formatCategoryLabel } from '@/lib/taxonomy'
import { formatPublicRating } from '@/lib/ratingDisplay'
import type { HelpRequest } from '@/types'
import '@/components/account/account-hc.css'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

type ActionIconKind = 'offer' | 'job' | 'msg' | 'review' | 'bell'

type ActionItem = {
  id: string
  title: string
  body: string
  action: string
  href: string
  icon: ActionIconKind
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
    const rows: ActionItem[] = []
    if (waitingOffers.length) {
      const firstOffer = waitingOffers[0]
      const req = state.requests.find((r) => r.id === firstOffer.requestId)
      const n = waitingOffers.length
      rows.push({
        id: 'offers',
        title: `${n} offer${n === 1 ? '' : 's'} waiting`,
        body: req
          ? `New offers on “${req.title}”. Open the job to review and respond.`
          : 'Helpers are waiting on a reply. Open your requests to review offers.',
        action: 'Review',
        href: req ? `/requests/${req.id}` : '/you?tab=requests',
        icon: 'offer',
      })
    }
    for (const job of acceptedJobs.slice(0, 2)) {
      rows.push({
        id: `job-${job.id}`,
        title: 'Accepted job',
        body: `You are booked for “${job.title}”. Open it to coordinate next steps.`,
        action: 'Open',
        href: `/requests/${job.id}`,
        icon: 'job',
      })
    }
    if (unreadMessages > 0) {
      rows.push({
        id: 'messages',
        title: `${unreadMessages} unread message${unreadMessages === 1 ? '' : 's'}`,
        body: 'Neighbors are waiting for your reply. Open Messages to respond.',
        action: 'Reply',
        href: '/home?messages=1',
        icon: 'msg',
      })
    }
    for (const job of pendingReviews.slice(0, 2)) {
      rows.push({
        id: `review-${job.id}`,
        title: 'Leave a review',
        body: `You finished “${job.title}”. Rate the neighbor to close it out.`,
        action: 'Review',
        href: `/requests/${job.id}`,
        icon: 'review',
      })
    }
    if (unreadNotifications > 0 && rows.length < 2) {
      const n = unreadNotifications
      rows.push({
        id: 'notifs',
        title: `${n} unread notification${n === 1 ? '' : 's'}`,
        body: 'Catch up on updates about your jobs and offers.',
        action: 'View',
        href: '/browse?messages=1',
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
      <div className="account-hc-wrap account-hc-page account-hc-activity">
        <div className="account-hc-title-row">
          <div>
            <h1 className="account-hc-hero-title">
              {greeting()}, {first}
            </h1>
            <p className="account-hc-hero-sub account-hc-activity-sub">
              {isHelper
                ? 'Your helper dashboard. Jobs near you that match your skills, plus anything that needs your reply.'
                : 'Post a task or browse helpers nearby.'}
            </p>
          </div>

          {isHelper ? (
            <div className="account-hc-card account-hc-avail-card">
              <div>
                <p className="lbl">Available now</p>
                <p className="hint">Turn on to get same-day jobs first</p>
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
          <section className="account-hc-section" aria-labelledby="actions-heading">
            <div className="account-hc-section-head account-hc-section-head-stack">
              <div>
                <h2 id="actions-heading">Action items</h2>
                <p className="account-hc-section-sub">Things waiting on you</p>
              </div>
            </div>
            <ul className="account-hc-card account-hc-action-list">
              {actionItems.map((row) => (
                <li key={row.id}>
                  <Link href={row.href} className="account-hc-action-link">
                    <span className="ico" aria-hidden>
                      <ActionIcon kind={row.icon} />
                    </span>
                    <span className="copy">
                      <span className="label">{row.title}</span>
                      <span className="body">{row.body}</span>
                    </span>
                    <span className="action-go">
                      {row.action}{' '}
                      <ChevronRight className="chev h-4 w-4" strokeWidth={2} aria-hidden />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {isHelper ? (
          <section className="account-hc-section" aria-labelledby="jobs-heading">
            <div className="account-hc-section-head">
              <div>
                <h2 id="jobs-heading">Recommended jobs near you</h2>
                <p className="account-hc-section-sub">
                  Open jobs in your area that match your skills. Send an offer on any you can take.
                </p>
              </div>
              <Link href="/browse" className="account-hc-text-link">
                See all
              </Link>
            </div>
            {goodMatches.length ? (
              <>
                <div className="account-hc-card account-hc-job-list">
                  {goodMatches.map(({ request }) => (
                    <RecommendedJobRow key={request.id} request={request} />
                  ))}
                </div>
                <p className="account-hc-more-hint">
                  Looking for something else?{' '}
                  <Link href="/browse">Browse all open jobs in your area</Link>.
                </p>
              </>
            ) : (
              <div className="account-hc-card account-hc-empty account-hc-empty-calm">
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
          <section className="account-hc-section" aria-labelledby="quick-post-heading">
            <div className="account-hc-section-head">
              <div>
                <h2 id="quick-post-heading">Quick post</h2>
                <p className="account-hc-section-sub">
                  Pick a category and get help today.
                </p>
              </div>
            </div>
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
                Post a task
              </Link>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function RecommendedJobRow({ request }: { request: HelpRequest }) {
  const { state, currentUser } = useBeam()
  const [imgFailed, setImgFailed] = useState(false)

  const categoryLabel = formatCategoryLabel(request.category, request.categoryCustom)
  const cover = listingCoverImage(
    normalizeListingImages(request.images, request.image),
    request.image,
  )
  const showImage = Boolean(cover) && !imgFailed

  const requester = useMemo(
    () => state.people.find((p) => p.id === request.requesterId),
    [state.people, request.requesterId],
  )

  const offerCount = useMemo(() => {
    if (typeof request.publicOfferCount === 'number') return request.publicOfferCount
    return state.offers.filter((o) => o.requestId === request.id && o.status !== 'withdrawn')
      .length
  }, [state.offers, request.id, request.publicOfferCount])

  const myOffer = useMemo(
    () =>
      state.offers.find(
        (o) =>
          o.requestId === request.id &&
          o.helperId === currentUser.id &&
          o.status !== 'withdrawn',
      ),
    [state.offers, request.id, currentUser.id],
  )

  const location = formatLocation(request)
  const neighborhood = location.split(',')[0]?.trim() || location
  const miles = distanceBetween(currentUser, request)
  const distanceLabel = miles == null ? null : formatDistance(miles)
  const isAsap = request.when === 'asap'
  const timingLabel = isAsap
    ? 'As soon as possible'
    : request.whenLabel?.trim() || request.when
  const isOpenBudget = request.budgetType === 'open' || !request.budget || request.budget <= 0
  const budgetLabel = formatBudget(request)
  const posterFirst = requester?.name?.split(/\s+/)[0] ?? 'Neighbor'
  const isNewPoster = requester ? !formatPublicRating(requester) : true
  const detailHref = `/requests/${request.id}`
  const ctaLabel = myOffer ? 'Offer sent' : 'Send offer'

  const metaParts: { key: string; node: ReactNode; asap?: boolean }[] = [
    { key: 'loc', node: neighborhood },
    { key: 'posted', node: relativeTime(request.createdAt) },
  ]
  if (distanceLabel) metaParts.push({ key: 'dist', node: `${distanceLabel} away` })
  if (timingLabel) {
    metaParts.push({
      key: 'when',
      node: timingLabel,
      asap: isAsap,
    })
  }
  metaParts.push({ key: 'poster', node: <span className="poster-name">{posterFirst}</span> })
  if (isNewPoster) {
    metaParts.push({ key: 'new', node: <span className="new-tag">New</span> })
  }

  return (
    <article className="account-hc-job-row" data-testid="recommended-job-row">
      {showImage ? (
        // Listing photos may be arbitrary HTTPS hosts.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="account-hc-job-thumb"
          src={cover}
          alt=""
          width={64}
          height={64}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span className="account-hc-job-thumb account-hc-job-thumb-fallback">
          <BrowseCategoryThumb
            categoryId={request.category}
            className="!h-full !w-full !rounded-[10px] !border-0"
          />
        </span>
      )}

      <div className="account-hc-job-main">
        <div className="account-hc-job-top">
          <span className="account-hc-job-chip">{categoryLabel}</span>
          {request.isUrgent ? (
            <span
              className="account-hc-job-chip"
              style={{ background: '#EEF4FF', color: '#1D5CE5' }}
              data-testid="needs-help-now-label"
            >
              Needs help now
            </span>
          ) : null}
          <Link href={detailHref} className="account-hc-job-title">
            {request.title}
          </Link>
        </div>
        {request.details ? (
          <p className="account-hc-job-desc">{request.details}</p>
        ) : null}
        <p className="account-hc-job-meta">
          {metaParts.map((part, i) => (
            <span key={part.key} className="account-hc-job-meta-item">
              {i > 0 ? (
                <span className="dot" aria-hidden>
                  ·
                </span>
              ) : null}
              <span className={part.asap ? 'when asap' : undefined}>{part.node}</span>
            </span>
          ))}
        </p>
      </div>

      <div className="account-hc-job-side">
        <div className="price-block">
          {isOpenBudget ? (
            <span className="open-offers">{budgetLabel}</span>
          ) : (
            <span className="price">{budgetLabel}</span>
          )}
          {offerCount > 0 ? (
            <span className="offers">
              {offerCount} offer{offerCount === 1 ? '' : 's'}
            </span>
          ) : null}
        </div>
        <Link
          href={detailHref}
          className={`account-hc-send-btn${myOffer ? ' is-sent' : ''}`}
          data-testid="recommended-send-offer"
        >
          {ctaLabel}
        </Link>
      </div>
    </article>
  )
}

function ActionIcon({ kind }: { kind: ActionIconKind }) {
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
