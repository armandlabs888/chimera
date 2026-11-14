'use client'

import { UserPlus } from 'lucide-react'
import { useCallback, useState } from 'react'
import { ReferHelperPickerDialog } from '@/components/refer/ReferHelperPickerDialog'
import './browse-hc.css'

export function useReferHelperShare(
  jobId: string,
  title: string,
  jobOwnerId?: string,
) {
  const [dialogOpen, setDialogOpen] = useState(false)

  const referHelper = useCallback(() => {
    setDialogOpen(true)
  }, [])

  const dialog = (
    <ReferHelperPickerDialog
      open={dialogOpen}
      jobId={jobId}
      jobTitle={title}
      jobOwnerId={jobOwnerId || ''}
      onClose={() => setDialogOpen(false)}
    />
  )

  return { referHelper, dialog, dialogOpen, setDialogOpen }
}

export function ReferHelperButton({
  onClick,
  className = '',
  fullWidth = true,
}: {
  onClick: () => void
  className?: string
  fullWidth?: boolean
}) {
  return (
    <button
      type="button"
      data-testid="browse-refer-helper"
      onClick={onClick}
      className={`browse-hc-btn-refer ${fullWidth ? 'is-full' : ''} ${className}`.trim()}
    >
      <UserPlus className="h-4 w-4 shrink-0" strokeWidth={2.1} aria-hidden />
      Refer a helper
    </button>
  )
}

export function ReferHelperHint() {
  return (
    <p className="browse-hc-refer-hint" data-testid="browse-refer-helper-hint">
      Know a reliable helper? Send them this job.
    </p>
  )
}

export function ReferHelperFooterActions({
  jobId,
  title,
  jobOwnerId,
}: {
  jobId: string
  title: string
  jobOwnerId: string
}) {
  const { referHelper, dialog } = useReferHelperShare(jobId, title, jobOwnerId)
  return (
    <>
      <div className="browse-hc-detail-actions browse-hc-detail-actions--refer">
        <ReferHelperButton onClick={() => referHelper()} />
      </div>
      <ReferHelperHint />
      {dialog}
    </>
  )
}
