'use client'

import { useState } from 'react'
import { useBeam } from '@/context/BeamContext'

const DEFAULT_BTN =
  'inline-flex h-11 items-center justify-center whitespace-nowrap rounded-lg border border-[#D7E0EC] bg-white px-[18px] text-[14px] font-semibold tracking-[-0.01em] text-[#071330] hover:bg-[#EEF2F7] disabled:cursor-not-allowed disabled:opacity-60'

/**
 * Helper withdraw control for a pending offer. Used on Browse (panel + drawer)
 * and the job page so Cancel offer stays identical in wording and outline style.
 */
export function CancelOfferAction({
  offerId,
  className = '',
  buttonClassName,
  fullWidth = false,
  testId = 'cancel-offer',
  showInlineError = true,
  onCancelled,
  onError,
}: {
  offerId: string
  className?: string
  /** Override the default outline button styles. */
  buttonClassName?: string
  fullWidth?: boolean
  testId?: string
  /** When false, parent owns error display via onError. */
  showInlineError?: boolean
  /** Called after a successful withdraw. */
  onCancelled?: () => void
  onError?: (message: string) => void
}) {
  const { withdrawOffer } = useBeam()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function onClick() {
    if (pending) return
    setPending(true)
    setError('')
    try {
      await withdrawOffer(offerId)
      onCancelled?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not cancel offer'
      setError(message)
      onError?.(message)
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
        onClick={() => void onClick()}
        className={buttonClassName ?? `${DEFAULT_BTN}${fullWidth ? ' w-full' : ''}`}
      >
        {pending ? 'Canceling' : 'Cancel offer'}
      </button>
      {showInlineError && error ? (
        <p
          className="mt-2 rounded-lg border border-[#D7E0EC] bg-white px-3 py-2 text-[13px] font-medium text-[#071330]"
          role="alert"
          data-testid={`${testId}-error`}
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}
