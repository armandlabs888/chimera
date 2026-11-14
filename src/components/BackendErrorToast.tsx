'use client'

import { X } from 'lucide-react'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useBeam } from '@/context/BeamContext'

/**
 * Surfaces live-mode action failures (accept, complete, save, invite, withdraw)
 * next to the chrome where the user acted. Auth screens still show backendError inline.
 */
export function BackendErrorToast() {
  const pathname = usePathname()
  const { backendError, clearBackendError, mode } = useBeam()

  useEffect(() => {
    clearBackendError()
  }, [pathname, clearBackendError])

  if (!backendError || mode === 'unconfigured') return null

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top,0px)+4.5rem)] z-[80] flex justify-center px-4"
      data-testid="backend-error-toast-host"
    >
      <div
        role="alert"
        data-testid="backend-error-toast"
        className="pointer-events-auto flex max-w-md items-start gap-3 rounded-[12px] border border-[#D7E0EC] bg-white px-4 py-3 text-[14px] font-medium text-[#071330] shadow-[0_12px_32px_-16px_rgba(7,19,48,0.35)]"
      >
        <p className="min-w-0 flex-1 leading-snug">{backendError}</p>
        <button
          type="button"
          aria-label="Dismiss"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#48556A] transition hover:bg-[#F4F8FD] hover:text-[#071330]"
          onClick={() => clearBackendError()}
          data-testid="backend-error-toast-dismiss"
        >
          <X className="h-4 w-4" strokeWidth={2.25} aria-hidden />
        </button>
      </div>
    </div>
  )
}
