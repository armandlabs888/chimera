'use client'

import { useState } from 'react'
import { ConfirmDialog } from '@/components/ui'
import { dangerOutlineButtonClass } from '@/components/ui/button'
import { useBeam } from '@/context/BeamContext'
import type { HelpRequest } from '@/types'

function canCancelHelpRequest(
  request: Pick<HelpRequest, 'requesterId' | 'status'>,
  currentUserId: string,
): boolean {
  return (
    request.requesterId === currentUserId &&
    (request.status === 'open' || request.status === 'accepted')
  )
}

/**
 * Owner-only cancel control. Renders nothing for other roles so Browse / job
 * layouts stay identical across neighbor, helper, and guest viewers.
 */
export function CancelJobAction({
  request,
  className = '',
  buttonClassName,
  fullWidth = false,
  testId = 'cancel-job',
  onCancelled,
}: {
  request: HelpRequest
  className?: string
  /** Override the default outline button styles. */
  buttonClassName?: string
  fullWidth?: boolean
  testId?: string
  /** Called after a successful cancel (e.g. close Browse sheet). */
  onCancelled?: () => void
}) {
  const { currentUser, cancelHelpRequest } = useBeam()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)

  if (!canCancelHelpRequest(request, currentUser.id)) return null

  async function onConfirm() {
    if (pending) return
    setPending(true)
    try {
      await cancelHelpRequest(request.id)
      setOpen(false)
      onCancelled?.()
    } finally {
      setPending(false)
    }
  }

  return (
    <div className={className} data-testid={`${testId}-wrap`}>
      <button
        type="button"
        data-testid={testId}
        disabled={pending}
        aria-busy={pending || undefined}
        onClick={() => setOpen(true)}
        className={
          buttonClassName ??
          `${dangerOutlineButtonClass}${fullWidth ? ' w-full' : ''}`
        }
      >
        Cancel job
      </button>

      <ConfirmDialog
        open={open}
        title="Cancel this job?"
        body="Helpers with pending offers will be told."
        confirmLabel="Cancel job"
        cancelLabel="Keep job"
        destructive
        pending={pending}
        onConfirm={() => void onConfirm()}
        onClose={() => {
          if (!pending) setOpen(false)
        }}
        testId={`${testId}-confirm`}
      />
    </div>
  )
}
