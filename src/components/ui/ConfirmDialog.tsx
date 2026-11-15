'use client'

import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import '@/components/account/account-hc.css'

const HC_VARS = {
  ['--hc-navy' as string]: '#071330',
  ['--hc-ink' as string]: '#10172a',
  ['--hc-blue' as string]: '#1d5ce5',
  ['--hc-blue-hover' as string]: '#1649bd',
  ['--hc-tint' as string]: '#eef2f7',
  ['--hc-tint-2' as string]: '#eef2f7',
  ['--hc-line' as string]: '#e3e8ef',
  ['--hc-line-2' as string]: '#d7e0ec',
  ['--hc-muted' as string]: '#48556a',
  ['--hc-muted-2' as string]: '#4A5568',
  ['--hc-white' as string]: '#ffffff',
  ['--hc-red' as string]: '#dc2626',
  ['--hc-red-hover' as string]: '#fef2f2',
} as const

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Cancel',
  pending = false,
  destructive = false,
  onConfirm,
  onClose,
  testId = 'confirm-dialog',
}: {
  open: boolean
  title: string
  body?: ReactNode
  confirmLabel: string
  cancelLabel?: string
  pending?: boolean
  /** Red confirm button for destructive actions. */
  destructive?: boolean
  onConfirm: () => void
  onClose: () => void
  testId?: string
}) {
  const titleId = useId()
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    confirmRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !pending) onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose, pending])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="account-hc-modal-overlay is-open"
      role="presentation"
      data-testid={`${testId}-overlay`}
      style={HC_VARS}
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onClose()
      }}
    >
      <div
        className="account-hc-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid={testId}
      >
        <h2 id={titleId}>{title}</h2>
        {body ? <div className="lead">{body}</div> : null}
        <div className="account-hc-modal-actions">
          <button
            type="button"
            className="account-hc-btn account-hc-btn-secondary"
            onClick={onClose}
            disabled={pending}
            data-testid={`${testId}-cancel`}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={destructive ? 'account-hc-btn-danger' : 'account-hc-btn'}
            onClick={onConfirm}
            disabled={pending}
            data-testid={`${testId}-confirm`}
          >
            {pending ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
