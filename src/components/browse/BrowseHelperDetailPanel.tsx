'use client'

import Link from 'next/link'
import { useId, useMemo } from 'react'
import { useBeam } from '@/context/BeamContext'
import { formatLocation } from '@/lib/location'
import { formatRate, relativeTime } from '@/lib/matching'
import { formatPublicRating, hasPublicRating } from '@/lib/ratingDisplay'
import { formatCategoryLabel } from '@/lib/taxonomy'
import type { Person } from '@/types'
import { BrowseHelperPhoto } from './BrowseHelperPhoto'

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
  const rateLabel = formatRate(person)
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
              <h2 id={titleId} className="browse-hc-helper-preview-name">
                {person.name}
              </h2>
              <p className="browse-hc-helper-preview-skill">
                {skillLabel || formatCategoryLabel(person.skills[0] ?? 'other', person.otherSkillLabel)}
              </p>
            </div>
          </div>
          <div className="browse-hc-helper-preview-rate">
            {rateLabel}
            <span>Rate</span>
          </div>
        </div>

        <div className="browse-hc-helper-info-card">
          <div>
            <div className="browse-hc-info-k">Distance</div>
            <div className="browse-hc-info-v">{milesLabel ?? 'Nearby'}</div>
          </div>
          <div>
            <div className="browse-hc-info-k">Serves</div>
            <div className="browse-hc-info-v">{serves}</div>
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
            className="browse-hc-helper-action browse-hc-helper-action--outline"
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
