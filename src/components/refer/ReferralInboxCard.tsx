'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { Avatar } from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import { formatBudget } from '@/lib/matching'
import { listingCoverImage, normalizeListingImages } from '@/lib/listingPhotos'
import { relativeTime } from '@/lib/matching'
import type { JobReferral } from '@/types'
import './refer-helper-picker.css'

export function ReferralInboxCard({
  referral,
}: {
  referral: JobReferral
}) {
  const { getPerson, getRequest, markJobReferralViewed } = useBeam()
  const referrer = getPerson(referral.referrerId)
  const job = getRequest(referral.jobId)
  const referrerName = referrer?.name?.split(' ')[0] || 'A neighbor'

  useEffect(() => {
    if (referral.status === 'pending') {
      void markJobReferralViewed(referral.id)
    }
    // Mark once when the card mounts for this referral id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referral.id])

  if (!job) return null

  const images = normalizeListingImages(job.images, job.image)
  const cover = listingCoverImage(images)
  const timing =
    job.when === 'asap' ? 'As soon as possible' : job.whenLabel || 'Flexible'
  const area = job.locationLabel || 'Nearby'

  return (
    <article
      className="rh-inbox-card"
      data-testid={`referral-inbox-card-${referral.id}`}
    >
      <div className="rh-inbox-card-head">
        <Avatar src={referrer?.avatar} name={referrer?.name || referrerName} size={44} />
        <div className="rh-inbox-card-copy">
          <h3>
            {referrerName} suggested you for {job.title}
          </h3>
          <p>{relativeTime(referral.createdAt)}</p>
        </div>
      </div>

      {referral.note ? (
        <p className="rh-inbox-note" data-testid="referral-inbox-note">
          "{referral.note}"
        </p>
      ) : null}

      <div className="rh-inbox-job" data-testid="referral-inbox-job">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" width={88} height={72} />
        ) : (
          <div
            style={{
              width: 88,
              height: 72,
              borderRadius: 8,
              background: '#E3E8EF',
            }}
          />
        )}
        <div>
          <div className="rh-inbox-job-title">{job.title}</div>
          <div className="rh-inbox-job-meta">
            {formatBudget(job)} · {timing} · {area}
          </div>
        </div>
      </div>

      <div className="rh-inbox-actions">
        <Link
          href={`/requests/${job.id}`}
          className="rh-inbox-view"
          data-testid="referral-view-job"
        >
          View job
        </Link>
      </div>
    </article>
  )
}
