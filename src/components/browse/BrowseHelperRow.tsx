'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BrowseHelperPhoto } from './BrowseHelperPhoto'
import type { Person } from '@/types'

export function BrowseHelperRow({
  person,
  skillLabel,
  milesLabel,
  rateLabel,
  ratingLabel,
  reviewCount,
  jobsCompleted,
  selected,
  navigateOnActivate,
  onSelect,
}: {
  person: Person
  skillLabel: string
  milesLabel: string | null
  rateLabel: string
  ratingLabel: string | null
  reviewCount: number
  jobsCompleted: number
  selected: boolean
  /** Mobile: activating the row goes to the profile. Desktop: selects for preview. */
  navigateOnActivate: boolean
  onSelect: (id: string) => void
}) {
  const router = useRouter()
  const profileHref = `/people/${person.id}`
  const hasRating = Boolean(ratingLabel)
  const reviewNoun = reviewCount === 1 ? 'review' : 'reviews'
  const jobsNoun = jobsCompleted === 1 ? 'job completed' : 'jobs completed'

  function activate() {
    if (navigateOnActivate) {
      router.push(profileHref)
      return
    }
    onSelect(person.id)
  }

  return (
    <li data-selected={selected ? 'true' : 'false'}>
      <div
        role="button"
        tabIndex={0}
        data-testid="browse-helper-row"
        data-helper-id={person.id}
        aria-pressed={selected}
        className={`browse-hc-helper-row ${selected ? 'is-selected' : ''}`}
        onClick={activate}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            activate()
          }
        }}
      >
        <BrowseHelperPhoto src={person.avatar} name={person.name} size={88} />
        <span className="browse-hc-helper-main">
          <span className="browse-hc-helper-copy">
            <span className="browse-hc-helper-name">{person.name}</span>
            <span className="browse-hc-helper-skill">{skillLabel}</span>
            <span className="browse-hc-helper-meta">
              <span className="browse-hc-helper-meta-primary">
                {milesLabel ? <span className="nowrap">{milesLabel}</span> : null}
                {hasRating ? (
                  <>
                    <span className="browse-hc-helper-stars">★ {ratingLabel}</span>
                    <span>
                      {reviewCount} {reviewNoun}
                    </span>
                  </>
                ) : (
                  <span className="browse-hc-badge-new">New</span>
                )}
                {!hasRating && person.availableNow ? (
                  <span className="browse-hc-avail">
                    <span className="dot" aria-hidden />
                    Available now
                  </span>
                ) : null}
              </span>
              {hasRating && (jobsCompleted > 0 || person.availableNow) ? (
                <span className="browse-hc-helper-meta-secondary">
                  {jobsCompleted > 0 ? (
                    <span>
                      {jobsCompleted} {jobsNoun}
                    </span>
                  ) : null}
                  {person.availableNow ? (
                    <span className="browse-hc-avail">
                      <span className="dot" aria-hidden />
                      Available now
                    </span>
                  ) : null}
                </span>
              ) : null}
            </span>
          </span>
          <span className="browse-hc-helper-side">
            <span className="browse-hc-helper-rate">{rateLabel}</span>
            <Link
              href={profileHref}
              data-testid="browse-helper-view-profile"
              className="browse-hc-btn-secondary"
              onClick={(e) => e.stopPropagation()}
            >
              View profile
            </Link>
          </span>
        </span>
      </div>
    </li>
  )
}
