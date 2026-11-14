'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  findMockHelper,
  MOCK_OWNER_SUGGESTIONS,
  rateLabelFor,
  type MockReferral,
} from '@/data/referHelperMock'
import './refer-helper-picker.css'

export function SuggestedHelpersSection({
  referrals = MOCK_OWNER_SUGGESTIONS,
  previewLimit = 3,
  compact = false,
  onMessage,
}: {
  referrals?: MockReferral[]
  previewLimit?: number
  /** Tighter spacing for Browse panel. */
  compact?: boolean
  onMessage?: (helperId: string) => void
}) {
  const [dismissed, setDismissed] = useState<string[]>([])
  const [showAll, setShowAll] = useState(false)

  const visible = useMemo(
    () => referrals.filter((r) => r.status !== 'dismissed' && !dismissed.includes(r.id)),
    [referrals, dismissed],
  )

  if (visible.length === 0) return null

  const shown = showAll ? visible : visible.slice(0, previewLimit)
  const hasMore = visible.length > previewLimit

  return (
    <section
      className="rh-suggested"
      data-testid="suggested-helpers"
      style={compact ? { marginTop: 12 } : undefined}
    >
      <div className="rh-suggested-head">
        <h3>Suggested helpers ({visible.length})</h3>
        {hasMore && !showAll ? (
          <button
            type="button"
            className="rh-suggested-see-all"
            data-testid="suggested-helpers-see-all"
            onClick={() => setShowAll(true)}
          >
            See all
          </button>
        ) : null}
        {showAll && hasMore ? (
          <button
            type="button"
            className="rh-suggested-see-all"
            data-testid="suggested-helpers-see-less"
            onClick={() => setShowAll(false)}
          >
            Show less
          </button>
        ) : null}
      </div>

      {shown.map((ref) => {
        const helper = findMockHelper(ref.helperId)
        if (!helper) return null
        const skills = helper.skills.slice(0, 2).join(' · ')
        return (
          <article
            key={ref.id}
            className="rh-suggested-card"
            data-testid={`suggested-helper-card-${helper.id}`}
          >
            <div className="rh-suggested-top">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={helper.avatar}
                alt=""
                width={56}
                height={56}
                className="rh-suggested-photo"
              />
              <div>
                <div className="rh-suggested-name">{helper.name}</div>
                <div className="rh-suggested-meta">
                  <span className="rh-picker-stars">★ {helper.rating.toFixed(1)}</span>
                  <span aria-hidden>·</span>
                  <span>{rateLabelFor(helper)}</span>
                </div>
                <div className="rh-suggested-skills">{skills}</div>
              </div>
            </div>

            <p className="rh-suggested-by">
              <strong>Suggested by {ref.referrerName}</strong>
              {ref.note ? ` · "${ref.note}"` : null}
            </p>

            <div className="rh-suggested-actions">
              <Link
                href={`/people/${helper.id}`}
                className="rh-suggested-btn"
                data-testid={`suggested-view-profile-${helper.id}`}
              >
                View profile
              </Link>
              <button
                type="button"
                className="rh-suggested-btn rh-suggested-btn-primary"
                data-testid={`suggested-message-${helper.id}`}
                onClick={() => onMessage?.(helper.id)}
              >
                Message
              </button>
              <button
                type="button"
                className="rh-suggested-dismiss"
                data-testid={`suggested-dismiss-${helper.id}`}
                onClick={() => setDismissed((prev) => [...prev, ref.id])}
              >
                Dismiss
              </button>
            </div>
          </article>
        )
      })}
    </section>
  )
}
