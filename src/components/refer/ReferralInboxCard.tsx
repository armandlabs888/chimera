'use client'

import Link from 'next/link'
import { MOCK_INBOX_REFERRAL } from '@/data/referHelperMock'
import { Avatar } from '@/components/ui'
import './refer-helper-picker.css'

export function ReferralInboxCard({
  neighborName = MOCK_INBOX_REFERRAL.neighborName,
  neighborAvatar = MOCK_INBOX_REFERRAL.neighborAvatar,
  note = MOCK_INBOX_REFERRAL.note,
  job = MOCK_INBOX_REFERRAL.job,
  whenLabel = MOCK_INBOX_REFERRAL.whenLabel,
}: {
  neighborName?: string
  neighborAvatar?: string
  note?: string
  job?: typeof MOCK_INBOX_REFERRAL.job
  whenLabel?: string
}) {
  return (
    <article className="rh-inbox-card" data-testid="referral-inbox-card">
      <div className="rh-inbox-card-head">
        <Avatar src={neighborAvatar} name={neighborName} size={44} />
        <div className="rh-inbox-card-copy">
          <h3>
            {neighborName} suggested you for {job.title}
          </h3>
          <p>{whenLabel}</p>
        </div>
      </div>

      {note ? (
        <p className="rh-inbox-note" data-testid="referral-inbox-note">
          "{note}"
        </p>
      ) : null}

      <div className="rh-inbox-job" data-testid="referral-inbox-job">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={job.image} alt="" width={88} height={72} />
        <div>
          <div className="rh-inbox-job-title">{job.title}</div>
          <div className="rh-inbox-job-meta">
            {job.budgetLabel} · {job.timingLabel} · {job.areaLabel}
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
