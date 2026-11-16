'use client'

import {
  Eye,
  MessageSquare,
  Star,
} from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getBrowseCategoryIcon } from '@/lib/categoryIcons'
import { useMessagesDrawer } from '@/components/messages/useMessagesDrawer'
import {
  ProfileHeader,
  ProfileHeaderIcons,
  buildHelperStats,
  buildNeighborStats,
  buildRoleMeta,
  shareProfileLink,
} from '@/components/profile/ProfileHeader'
import { Avatar } from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import { formatLocation } from '@/lib/location'
import { formatRate, relativeTime } from '@/lib/matching'
import { isHelperPerson } from '@/lib/roles'
import { formatCategoryLabel } from '@/lib/taxonomy'
import type { Person, Review } from '@/types'
import './helper-profile-body.css'

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name
}

function authNextHref(path: string): string {
  return `/auth?next=${encodeURIComponent(path)}`
}

export function HelperProfileBody({
  person,
  reviews,
  variant,
  jobsPosted = 0,
}: {
  person: Person
  reviews: Review[]
  /** Own signed-in profile vs public neighbor view. */
  variant: 'own' | 'public'
  jobsPosted?: number
}) {
  const {
    authUser,
    mode,
    toggleSavedHelper,
    ensureDirectThread,
    getPerson,
    state,
  } = useBeam()
  const router = useRouter()
  const { openThread } = useMessagesDrawer()
  const [toast, setToast] = useState('')
  const [messaging, setMessaging] = useState(false)

  const isOwn = variant === 'own'
  const isGuest = mode === 'live' && !authUser
  const helper = isHelperPerson(person)
  const locationLabel = formatLocation(person)
  const rateLabel = formatRate(person)
  const helperFirst = firstName(person.name)
  const hourly = Math.round(person.hourlyRate || 0)
  const primarySkill = person.skills[0]
  const primarySkillLabel = primarySkill
    ? formatCategoryLabel(
        primarySkill,
        primarySkill === 'other' ? person.otherSkillLabel : null,
      )
    : null
  const isSaved = state.savedHelperIds?.includes(person.id) ?? false

  const headerStats = useMemo(() => {
    if (helper) return buildHelperStats(person)
    return buildNeighborStats({ jobsPosted, person })
  }, [helper, person, jobsPosted])

  const headerMeta = useMemo(
    () => buildRoleMeta(helper ? 'helper' : 'neighbor', person, { skillLimit: 1 }),
    [helper, person],
  )

  const openJobs = useMemo(
    () =>
      !helper
        ? state.requests.filter((r) => r.requesterId === person.id && r.status === 'open')
        : [],
    [helper, state.requests, person.id],
  )

  async function onShare() {
    const path = `/people/${person.id}`
    const url =
      typeof window !== 'undefined' ? `${window.location.origin}${path}` : path
    const result = await shareProfileLink({
      title: `${person.name} on HouseCall`,
      url,
    })
    if (result === 'copied') {
      setToast('Link copied')
      window.setTimeout(() => setToast(''), 1600)
    } else if (result === 'failed') {
      setToast('Could not copy link')
      window.setTimeout(() => setToast(''), 1600)
    }
  }

  function requireAuth(): boolean {
    if (!isGuest) return true
    router.push(authNextHref(`/people/${person.id}`))
    return false
  }

  async function onMessage() {
    if (isOwn) return
    if (!requireAuth()) return
    if (messaging) return
    setMessaging(true)
    try {
      const threadId = await ensureDirectThread(person.id)
      openThread(threadId)
    } catch {
      setToast('Could not open messages')
      window.setTimeout(() => setToast(''), 1600)
    } finally {
      setMessaging(false)
    }
  }

  function onRequest() {
    if (isOwn) return
    if (!requireAuth()) return
    const params = new URLSearchParams()
    params.set('rebook', person.id)
    if (primarySkill) params.set('category', primarySkill)
    router.push(`/post?${params.toString()}`)
  }

  async function onSave() {
    if (isOwn) return
    if (!requireAuth()) return
    const wasSaved = isSaved
    try {
      await toggleSavedHelper(person.id)
      setToast(wasSaved ? 'Removed from your helpers' : 'Saved to your helpers')
      window.setTimeout(() => setToast(''), 1600)
    } catch {
      setToast('Could not update saved helpers')
      window.setTimeout(() => setToast(''), 1600)
    }
  }

  const editHref = '/settings/profile'
  const bioEditHref = '/settings/profile#bio'
  const servicesEditHref = '/settings/profile#services'

  const primaryAction = isOwn
    ? {
        key: 'edit',
        label: 'Edit profile',
        icon: ProfileHeaderIcons.edit,
        href: editHref,
        testId: 'you-edit-profile',
      }
    : {
        key: 'message',
        label: messaging ? 'Opening...' : 'Message',
        icon: <MessageSquare className="h-4 w-4" strokeWidth={2} aria-hidden />,
        disabled: messaging,
        onClick: () => void onMessage(),
        testId: 'public-helper-message',
      }

  const secondaryActions = [
    {
      key: 'share',
      label: 'Share',
      icon: ProfileHeaderIcons.share,
      onClick: () => void onShare(),
      testId: isOwn ? 'you-share-profile' : 'public-helper-share',
    },
  ]

  const overflowItems =
    isOwn || !helper
      ? []
      : [
          {
            key: 'save',
            label: isSaved ? 'Saved' : 'Save',
            onClick: () => void onSave(),
            testId: 'public-helper-save',
          },
        ]

  const priceDisplay = (
    <div className="hpb-price">
      ${hourly}
      <small>/hr</small>
    </div>
  )

  const railMeta = [primarySkillLabel, locationLabel].filter(Boolean).join(' · ')

  return (
    <div
      className="helper-profile-body"
      data-testid={
        isOwn ? 'you-page' : helper ? 'public-helper-profile' : 'public-neighbor-profile'
      }
    >
      {isOwn ? (
        <div className="hpb-preview-bar" data-testid="you-preview-bar">
          <Eye className="h-[18px] w-[18px] shrink-0 text-[#1D5CE5]" strokeWidth={2} aria-hidden />
          <span>
            <b>This is how neighbors see you.</b> Only you see this line.
          </span>
        </div>
      ) : null}

      <ProfileHeader
        person={person}
        stats={headerStats}
        meta={headerMeta}
        primaryAction={primaryAction}
        secondaryActions={secondaryActions}
        overflowItems={overflowItems}
      />

      {toast ? (
        <p className="mt-3 text-[13px] font-medium text-[#4A5568]" role="status">
          {toast}
        </p>
      ) : null}

      <div className="hpb-layout">
        <div className="hpb-main">
          {helper ? (
            <div className="hpb-mobile-rate" data-testid="you-mobile-rate">
              {priceDisplay}
              <span className="hpb-mobile-rate-label">Hourly rate</span>
            </div>
          ) : null}

          <section className="hpb-sec" aria-labelledby="hpb-about">
            <div className="hpb-sec-head">
              <h2 id="hpb-about" className="hpb-h2">
                About
              </h2>
            </div>
            {person.bio?.trim() ? (
              <p className="hpb-bio" data-testid="helper-about-bio">
                {person.bio.trim()}
              </p>
            ) : isOwn ? (
              <p className="hpb-empty" data-testid="helper-about-empty">
                You have not written a bio yet. Neighbors are more likely to book helpers who say a
                little about themselves.{' '}
                <Link href={bioEditHref} className="hpb-link">
                  Add a bio
                </Link>
              </p>
            ) : (
              <p className="hpb-empty" data-testid="helper-about-empty">
                {helperFirst} has not added a bio yet.
              </p>
            )}
          </section>

          {helper ? (
            <section className="hpb-sec" aria-labelledby="hpb-services" data-testid="helper-services">
              <div className="hpb-sec-head">
                <h2 id="hpb-services" className="hpb-h2">
                  Services
                </h2>
                {isOwn ? (
                  <Link href={servicesEditHref} className="hpb-link" data-testid="you-services-edit">
                    Edit
                  </Link>
                ) : null}
              </div>
              <div className="hpb-chips">
                {person.skills.length ? (
                  person.skills.map((skill) => {
                    const label = formatCategoryLabel(
                      skill,
                      skill === 'other' ? person.otherSkillLabel : null,
                    )
                    const Icon = getBrowseCategoryIcon(skill)
                    return (
                      <span key={skill} className="hpb-pill">
                        <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                        {label}
                      </span>
                    )
                  })
                ) : (
                  <p className="hpb-empty">No services listed yet.</p>
                )}
              </div>
              <div className="hpb-facts">
                <div>
                  <div className="hpb-k">Rate</div>
                  <div className="hpb-v">{rateLabel}</div>
                </div>
                <div>
                  <div className="hpb-k">Area</div>
                  <div className="hpb-v">{locationLabel || 'Nearby'}</div>
                </div>
              </div>
            </section>
          ) : isOwn ? (
            <section className="hpb-sec" data-testid="you-become-helper">
              <div className="hpb-sec-head">
                <h2 className="hpb-h2">Become a helper</h2>
              </div>
              <p className="hpb-empty">
                Set your skills, service area, and rate. Then start browsing open requests nearby.
              </p>
              <Link
                href={
                  mode === 'live' && !authUser
                    ? '/auth?mode=signup&next=%2Fonboarding%2Fhelper'
                    : '/onboarding/helper'
                }
                className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-[#1D5CE5] px-5 text-[14.5px] font-semibold text-white"
                data-testid="you-become-helper-cta"
              >
                Become a helper
              </Link>
            </section>
          ) : null}

          <section className="hpb-sec" aria-labelledby="hpb-reviews" data-testid="helper-profile-reviews">
            <div className="hpb-sec-head">
              <h2 id="hpb-reviews" className="hpb-h2">
                Reviews{' '}
                <span className="hpb-review-count">· {reviews.length}</span>
              </h2>
            </div>
            {reviews.length ? (
              <ul className="hpb-review-list">
                {reviews.map((review) => {
                  const from = getPerson(review.fromId)
                  const name = from?.name ?? 'Neighbor'
                  return (
                    <li key={review.id} className="hpb-review">
                      <Avatar src={from?.avatar} name={name} size={44} />
                      <div className="min-w-0">
                        <p className="font-semibold text-[#071330]">{name}</p>
                        <div className="hpb-stars" aria-label={`${review.rating} out of 5 stars`}>
                          {Array.from({ length: 5 }, (_, i) => (
                            <Star
                              key={i}
                              className={`h-3.5 w-3.5 ${
                                i < review.rating
                                  ? 'fill-[#071330] text-[#071330]'
                                  : 'fill-transparent text-[#D7E0EC]'
                              }`}
                              aria-hidden
                            />
                          ))}
                        </div>
                        {review.comment?.trim() ? (
                          <p className="mt-1 text-[15px] leading-[1.55] text-[#071330]">
                            {review.comment.trim()}
                          </p>
                        ) : null}
                        <p className="mt-1 text-[13px] text-[#4A5568]">
                          {relativeTime(review.createdAt)}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="hpb-empty">
                {helper
                  ? 'Completed jobs will show neighbor feedback here.'
                  : 'No reviews yet.'}
              </p>
            )}
          </section>

          {!helper && openJobs.length > 0 ? (
            <section className="hpb-sec" aria-labelledby="hpb-open-jobs" data-testid="neighbor-open-jobs">
              <div className="hpb-sec-head">
                <h2 id="hpb-open-jobs" className="hpb-h2">
                  Open jobs{' '}
                  <span className="hpb-review-count">· {openJobs.length}</span>
                </h2>
              </div>
              <ul className="divide-y divide-[#E3E8EF]">
                {openJobs.map((job) => (
                  <li key={job.id} className="py-3 first:pt-0 last:pb-0">
                    <Link
                      href={`/requests/${job.id}`}
                      className="block min-w-0 text-[#071330] transition hover:text-[#1D5CE5]"
                    >
                      <p className="truncate text-[15px] font-semibold">{job.title}</p>
                      <p className="mt-0.5 truncate text-[13px] text-[#4A5568]">
                        {[job.locationLabel || job.city, job.whenLabel].filter(Boolean).join(' · ')}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        {helper ? (
          <aside className="hpb-rail" data-testid="helper-rate-panel">
            <div className="hpb-rate-panel">
              {priceDisplay}
              {railMeta ? <p className="hpb-rail-meta">{railMeta}</p> : null}
              <button
                type="button"
                className="hpb-btn hpb-btn-primary"
                disabled={isOwn}
                onClick={onRequest}
                data-testid={isOwn ? 'you-request-disabled' : 'public-helper-request'}
              >
                Request {helperFirst}
              </button>
              <button
                type="button"
                className="hpb-btn hpb-btn-outline"
                disabled={isOwn || messaging}
                onClick={() => void onMessage()}
                data-testid={isOwn ? 'you-message-disabled' : 'public-helper-message-rail'}
              >
                <MessageSquare className="h-4 w-4" strokeWidth={2} aria-hidden />
                Message
              </button>
              {isOwn ? (
                <p className="hpb-note">
                  Neighbors see these buttons. They are turned off on your own profile.
                </p>
              ) : null}
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  )
}
