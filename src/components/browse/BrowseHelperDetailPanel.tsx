'use client'

import { Calendar, MapPin, MapPinned, Tag } from 'lucide-react'
import Link from 'next/link'
import { useId, useMemo } from 'react'
import { formatMemberSince } from '@/components/profile/ProfileHeader'
import { useBeam } from '@/context/BeamContext'
import { formatLocation } from '@/lib/location'
import { formatRate, relativeTime } from '@/lib/matching'
import { formatPublicRating, hasPublicRating } from '@/lib/ratingDisplay'
import { formatCategoryLabel } from '@/lib/taxonomy'
import type { Person } from '@/types'
import { HelperAvailabilityStatus } from '@/components/HelperAvailabilityStatus'
import { BrowseHelperPhoto } from './BrowseHelperPhoto'

function hasHelperRate(person: Pick<Person, 'hourlyRate' | 'rateType'>): boolean {
  return (person.hourlyRate ?? 0) > 0
}

export function BrowseHelperDetailPanel({
  person,
  skillLabel,
  milesLabel,
}: {
  person: Person
  skillLabel: string
  milesLabel: string | null
}) {
  const { state, getPerson } = useBeam()
  const titleId = useId()
  const showRate = hasHelperRate(person)
  const rateLabel = showRate ? formatRate(person) : null
  const ratingLabel = formatPublicRating(person)
  const serves = useMemo(() => {
    const area = formatLocation(person)
    const radius = person.serviceRadiusMiles ?? 5
    const place = area && area !== 'Local area' && area !== 'Nearby' ? area : null
    if (place) return `${place} · Within ${radius} mi`
    return `Within ${radius} mi`
  }, [person])

  const latestReview = useMemo(() => {
    const reviews = state.reviews
      .filter((r) => r.toId === person.id)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    return reviews[0] ?? null
  }, [state.reviews, person.id])

  const reviewerName = latestReview
    ? getPerson(latestReview.fromId)?.name?.trim() || 'Neighbor'
    : null

  const profileHref = `/people/${person.id}`
  const primarySkill = person.skills[0]
  const bookHref = primarySkill
    ? `/post?rebook=${person.id}&category=${encodeURIComponent(primarySkill)}`
    : `/post?rebook=${person.id}`

  const reviewCount = person.reviewCount ?? 0
  const jobsCompleted = person.jobsCompleted ?? 0
  const reviewNoun = reviewCount === 1 ? 'review' : 'reviews'
  const jobsNoun = jobsCompleted === 1 ? 'job completed' : 'jobs completed'
  const hasRating = hasPublicRating(person)
  const joinedLabel = formatMemberSince(person.createdAt)

  return (
    <aside
      className="browse-hc-detail browse-hc-helper-detail"
      data-testid="browse-helper-detail"
      aria-labelledby={titleId}
    >
      <div className="browse-hc-detail-body">
        <div className="browse-hc-helper-preview-head">
          <div className="browse-hc-helper-preview-id">
            <BrowseHelperPhoto src={person.avatar} name={person.name} size={80} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id={titleId} className="browse-hc-helper-preview-name">
                  {person.name}
                </h2>
                <HelperAvailabilityStatus person={person} />
              </div>
              <p className="browse-hc-helper-preview-skill">
                {skillLabel || formatCategoryLabel(person.skills[0] ?? 'other', person.otherSkillLabel)}
              </p>
            </div>
          </div>
        </div>

        <div className="browse-hc-helper-info-card">
          {showRate && rateLabel ? (
            <div className="browse-hc-info-item">
              <span className="browse-hc-info-icon">
                <Tag className="h-4 w-4" strokeWidth={2} aria-hidden />
              </span>
              <div>
                <div className="browse-hc-info-k">Rate</div>
                <div className="browse-hc-info-v">{rateLabel}</div>
              </div>
            </div>
          ) : null}
          <div className="browse-hc-info-item">
            <span className="browse-hc-info-icon">
              <MapPin className="h-4 w-4" strokeWidth={2} aria-hidden />
            </span>
            <div>
              <div className="browse-hc-info-k">Distance</div>
              <div className="browse-hc-info-v">{milesLabel ?? 'Nearby'}</div>
            </div>
          </div>
          <div className="browse-hc-info-item">
            <span className="browse-hc-info-icon">
              <MapPinned className="h-4 w-4" strokeWidth={2} aria-hidden />
            </span>
            <div>
              <div className="browse-hc-info-k">Serves</div>
              <div className="browse-hc-info-v">{serves}</div>
            </div>
          </div>
        </div>

        <div className="browse-hc-helper-preview-stats">
          {hasRating && ratingLabel ? (
            <>
              <span className="browse-hc-helper-stars">★ {ratingLabel}</span>
              <span>
                {reviewCount} {reviewNoun}
              </span>
              {jobsCompleted > 0 ? (
                <>
                  <span aria-hidden>·</span>
                  <span>
                    {jobsCompleted} {jobsNoun}
                  </span>
                </>
              ) : null}
              {joinedLabel ? (
                <>
                  <span aria-hidden>·</span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 shrink-0 text-[#4A5568]" strokeWidth={2.25} aria-hidden />
                    Joined {joinedLabel}
                  </span>
                </>
              ) : null}
            </>
          ) : (
            <>
              <span className="browse-hc-badge-new">New</span>
              {person.availableNow ? (
                <span className="browse-hc-avail">
                  <span className="dot" aria-hidden />
                  Available now
                </span>
              ) : null}
              {joinedLabel ? (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 shrink-0 text-[#4A5568]" strokeWidth={2.25} aria-hidden />
                  Joined {joinedLabel}
                </span>
              ) : null}
            </>
          )}
        </div>

        {latestReview ? (
          <div className="browse-hc-helper-review" data-testid="browse-helper-latest-review">
            <h3>Latest review</h3>
            <div className="who">
              {latestReview.rating}/5 from {reviewerName} · {relativeTime(latestReview.createdAt)}
            </div>
            <p>{latestReview.comment}</p>
          </div>
        ) : null}

        <div className="browse-hc-detail-actions browse-hc-helper-preview-actions">
          <Link
            href={profileHref}
            className="browse-hc-helper-action hc-btn-navy"
            data-testid="browse-helper-detail-profile"
          >
            View profile
          </Link>
          <Link
            href={bookHref}
            className="browse-hc-helper-action browse-hc-helper-action--primary"
            data-testid="browse-helper-request-book"
          >
            Request to book
          </Link>
        </div>
      </div>
    </aside>
  )
}
