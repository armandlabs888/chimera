'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import '@/components/account/account-hc.css'

const HC_VARS = {
  ['--hc-navy' as string]: '#071330',
  ['--hc-ink' as string]: '#10172a',
  ['--hc-blue' as string]: '#1d5ce5',
  ['--hc-blue-hover' as string]: '#1649bd',
  ['--hc-tint' as string]: '#f5f9ff',
  ['--hc-tint-2' as string]: '#f4f8fd',
  ['--hc-line' as string]: '#e3e8ef',
  ['--hc-line-2' as string]: '#d7e0ec',
  ['--hc-muted' as string]: '#48556a',
  ['--hc-muted-2' as string]: '#6b7384',
  ['--hc-white' as string]: '#ffffff',
} as const

export function ReferHelperShareDialog({
  open,
  title,
  url,
  shareText,
  onClose,
}: {
  open: boolean
  title: string
  url: string
  shareText: string
  onClose: () => void
}) {
  const titleId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(''), 1600)
    return () => window.clearTimeout(t)
  }, [toast])

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setToast('Link copied')
    } catch {
      setToast('Could not copy link')
    }
  }

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="account-hc-modal-overlay is-open"
      role="presentation"
      data-testid="refer-helper-dialog-overlay"
      style={HC_VARS}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="account-hc-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="refer-helper-dialog"
      >
        <h2 id={titleId}>Refer a helper</h2>
        <p className="lead">{shareText}</p>
        <div className="account-hc-field account-hc-modal-field">
          <label htmlFor="refer-helper-link" className="account-hc-label">
            Job link
          </label>
          <input
            ref={inputRef}
            id="refer-helper-link"
            className="account-hc-input"
            type="text"
            readOnly
            value={url}
            data-testid="refer-helper-link"
            aria-label={`Link for ${title}`}
          />
        </div>
        <div className="account-hc-modal-actions">
          <button
            type="button"
            className="account-hc-btn account-hc-btn-secondary"
            onClick={onClose}
            data-testid="refer-helper-dialog-close"
          >
            Close
          </button>
          <button
            type="button"
            className="account-hc-btn"
            onClick={() => void copyLink()}
            data-testid="refer-helper-copy"
          >
            Copy link
          </button>
        </div>
      </div>
      {toast ? (
        <div
          className="refer-helper-toast"
          role="status"
          data-testid="refer-helper-toast"
        >
          {toast}
        </div>
      ) : null}
    </div>,
    document.body,
  )
}
