'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useBeam } from '@/context/BeamContext'
import { useMessagesDrawer } from '@/components/messages/useMessagesDrawer'
import { formatRate } from '@/lib/matching'
import { formatCategoryLabel } from '@/lib/taxonomy'
import { activeReferralsForJob } from '@/lib/jobReferrals'
import type { JobReferral } from '@/types'
import './refer-helper-picker.css'

export function SuggestedHelpersSection({
  jobId,
  previewLimit = 3,
  compact = false,
}: {
  jobId: string
  previewLimit?: number
  compact?: boolean
}) {
  const { state, getPerson, dismissJobReferral, ensureDirectThread } = useBeam()
  const { openThread } = useMessagesDrawer()
  const [showAll, setShowAll] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const referrals = useMemo(
    () => activeReferralsForJob(state.jobReferrals, jobId),
    [state.jobReferrals, jobId],
  )

  if (referrals.length === 0) return null

  const shown = showAll ? referrals : referrals.slice(0, previewLimit)
  const hasMore = referrals.length > previewLimit

  async function onMessage(helperId: string) {
    setBusyId(helperId)
    try {
      const threadId = await ensureDirectThread(helperId)
      openThread(threadId)
    } finally {
      setBusyId(null)
    }
  }

  async function onDismiss(ref: JobReferral) {
    setBusyId(ref.id)
    try {
      await dismissJobReferral(ref.id)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section
      className="rh-suggested"
      data-testid="suggested-helpers"
      style={compact ? { marginTop: 0 } : undefined}
    >
      <div className="rh-suggested-head">
        <h3>Suggested helpers ({referrals.length})</h3>
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
        const helper = getPerson(ref.helperId)
        const referrer = getPerson(ref.referrerId)
        if (!helper) return null
        const skills = helper.skills
          .slice(0, 2)
          .map((s) => formatCategoryLabel(s, s === 'other' ? helper.otherSkillLabel : null))
          .join(' · ')
        const referrerName = (referrer?.name || 'A neighbor').split(' ')[0]
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
                  {helper.rating > 0 && helper.reviewCount > 0 ? (
                    <span className="rh-picker-stars">★ {helper.rating.toFixed(1)}</span>
                  ) : (
                    <span>New</span>
                  )}
                  <span aria-hidden>·</span>
                  <span>{formatRate(helper)}</span>
                </div>
                {skills ? <div className="rh-suggested-skills">{skills}</div> : null}
              </div>
            </div>

            <p className="rh-suggested-by">
              <strong>Suggested by {referrerName}</strong>
              {ref.note ? ` · "${ref.note}"` : null}
            </p>

            <div className="rh-suggested-actions">
              <Link
                href={`/people/${helper.id}`}
                className="rh-suggested-btn hc-btn-navy"
                data-testid={`suggested-view-profile-${helper.id}`}
              >
                View profile
              </Link>
              <button
                type="button"
                className="rh-suggested-btn rh-suggested-btn-primary"
                data-testid={`suggested-message-${helper.id}`}
                disabled={busyId === helper.id}
                onClick={() => void onMessage(helper.id)}
              >
                Message
              </button>
              <button
                type="button"
                className="rh-suggested-dismiss"
                data-testid={`suggested-dismiss-${helper.id}`}
                disabled={busyId === ref.id}
                onClick={() => void onDismiss(ref)}
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
