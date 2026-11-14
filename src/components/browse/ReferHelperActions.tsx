'use client'

import { UserPlus } from 'lucide-react'
import { useCallback, useState } from 'react'
import { referHelperShareText } from '@/lib/displayTitle'
import './browse-hc.css'
import { ReferHelperShareDialog } from './ReferHelperShareDialog'

export function useReferHelperShare(jobId: string, title: string) {
  const [dialogOpen, setDialogOpen] = useState(false)

  const shareUrl = useCallback(() => {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/requests/${jobId}`
  }, [jobId])

  const referHelper = useCallback(async () => {
    const url = shareUrl()
    const text = referHelperShareText(title)
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({ title, text, url })
        return
      }
    } catch {
      // Dismissed or unavailable; fall through to the copy dialog.
    }
    setDialogOpen(true)
  }, [shareUrl, title])

  const dialog = (
    <ReferHelperShareDialog
      open={dialogOpen}
      title={title}
      url={shareUrl()}
      shareText={referHelperShareText(title)}
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
}: {
  jobId: string
  title: string
}) {
  const { referHelper, dialog } = useReferHelperShare(jobId, title)
  return (
    <>
      <div className="browse-hc-detail-actions browse-hc-detail-actions--refer">
        <ReferHelperButton onClick={() => void referHelper()} />
      </div>
      <ReferHelperHint />
      {dialog}
    </>
  )
}
