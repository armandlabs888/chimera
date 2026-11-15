'use client'

import { Bookmark } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { useBeam } from '@/context/BeamContext'
import {
  PENDING_SAVE_PARAM,
  authHrefForJobSave,
  readPendingSaveRequestId,
} from '@/lib/jobs/pendingSave'

/**
 * Persist job saves via BeamContext. Guests are sent to sign-in with a return
 * URL that includes pendingSave so the job is saved after auth.
 */
export function JobSaveButton({
  requestId,
  className = 'browse-hc-save-btn',
  testId = 'job-save',
}: {
  requestId: string
  className?: string
  testId?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { authUser, mode, ready, state, toggleSavedRequest } = useBeam()
  const isGuest = mode === 'live' && !authUser
  const isSaved = state.savedRequestIds?.includes(requestId) ?? false
  const pendingHandled = useRef<string | null>(null)

  useEffect(() => {
    if (!ready || isGuest || mode === 'unconfigured') return
    const pendingId = readPendingSaveRequestId(searchParams)
    if (!pendingId || pendingId !== requestId) return
    if (pendingHandled.current === pendingId) return
    pendingHandled.current = pendingId

    const clearPending = () => {
      const next = new URLSearchParams(searchParams.toString())
      if (!next.has(PENDING_SAVE_PARAM)) return
      next.delete(PENDING_SAVE_PARAM)
      const qs = next.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    }

    void (async () => {
      try {
        if (!(state.savedRequestIds?.includes(requestId) ?? false)) {
          await toggleSavedRequest(requestId)
        }
      } finally {
        clearPending()
      }
    })()
  }, [
    ready,
    isGuest,
    mode,
    searchParams,
    requestId,
    pathname,
    router,
    state.savedRequestIds,
    toggleSavedRequest,
  ])

  function onClick() {
    if (isGuest) {
      const current = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
      router.push(authHrefForJobSave(requestId, current))
      return
    }
    void toggleSavedRequest(requestId)
  }

  return (
    <button
      type="button"
      className={className}
      aria-pressed={isSaved}
      data-testid={testId}
      onClick={onClick}
    >
      <Bookmark
        className={`h-4 w-4 ${isSaved ? 'fill-[#1D5CE5] text-[#1D5CE5]' : ''}`}
        strokeWidth={1.9}
        aria-hidden
      />
      {isSaved ? 'Saved' : 'Save'}
    </button>
  )
}
