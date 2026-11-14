'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  AccountPageSidebar,
  type AccountQuickLink,
} from '@/components/account/AccountSidebar'
import {
  ACCOUNT_DELETE_ERASE_ITEMS,
  ACCOUNT_DELETE_WARNING,
} from '@/lib/account/deleteAccountCopy'
import {
  ACCOUNT_DELETE_CONFIRM_PHRASE,
  isValidAccountDeleteConfirm,
} from '@/lib/account/deleteConfirm'
import { useBeam } from '@/context/BeamContext'
import { createClient } from '@/lib/supabase/client'
import '@/components/account/account-hc.css'

const SETTINGS_QUICK_LINKS: AccountQuickLink[] = [
  { kind: 'href', href: '/you', label: 'Profile & account', testId: 'settings-link-you' },
  { kind: 'messages', label: 'Messages', testId: 'settings-link-messages' },
  {
    kind: 'href',
    href: '/onboarding?edit=1',
    label: 'Change city',
    testId: 'settings-link-change-city',
  },
]

export function Settings() {
  const { mode, authUser } = useBeam()
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="account-hc" data-testid="settings-page">
      <div className="account-hc-wrap account-hc-page account-hc-profile-page">
        <Link href="/browse" className="account-hc-page-back" data-testid="settings-back-browse">
          <ChevronLeft className="chev h-4 w-4" strokeWidth={2.25} aria-hidden />
          Back to browse
        </Link>
        <h1 className="account-hc-hero-title">Settings</h1>
        <p className="account-hc-hero-sub account-hc-profile-sub">
          Review HouseCall policies and manage your account.
        </p>

        <div className="account-hc-profile-layout">
          <div className="account-hc-profile-main">
            <div className="account-hc-card account-hc-section-card" data-testid="settings-legal">
              <h2>Legal</h2>
              <p className="account-hc-section-note">
                Review HouseCall&apos;s Terms of Service and Privacy Policy.
              </p>
              <Link href="/terms" className="account-hc-link-row account-hc-link-row-tall">
                <span>Terms of Service</span>
                <ChevronRight className="chev h-4 w-4" strokeWidth={2} aria-hidden />
              </Link>
              <Link href="/privacy" className="account-hc-link-row account-hc-link-row-tall">
                <span>Privacy Policy</span>
                <ChevronRight className="chev h-4 w-4" strokeWidth={2} aria-hidden />
              </Link>
            </div>

            <div className="account-hc-card account-hc-danger-card" data-testid="settings-delete">
              <h2>Delete account</h2>
              <p>Deleting your account removes everything we store about you:</p>
              <ul className="account-hc-danger-list">
                {ACCOUNT_DELETE_ERASE_ITEMS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="account-hc-danger-warn">{ACCOUNT_DELETE_WARNING}</p>
              <button
                type="button"
                className="account-hc-btn-danger"
                data-testid="settings-delete-open"
                onClick={() => setModalOpen(true)}
              >
                Delete account
              </button>
            </div>
          </div>

          <AccountPageSidebar
            quickLinks={SETTINGS_QUICK_LINKS}
            showSignOut={false}
            showDemoReset={false}
          />
        </div>
      </div>

      {modalOpen ? (
        <DeleteAccountModal
          mode={mode}
          hasLiveSession={Boolean(authUser)}
          onClose={() => setModalOpen(false)}
        />
      ) : null}
    </div>
  )
}

function DeleteAccountModal({
  mode,
  hasLiveSession,
  onClose,
}: {
  mode: 'live' | 'demo' | 'unconfigured'
  hasLiveSession: boolean
  onClose: () => void
}) {
  const titleId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [confirmText, setConfirmText] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const canSubmit = useMemo(() => isValidAccountDeleteConfirm(confirmText), [confirmText])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
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
  }, [onClose, pending])

  const finishDeleted = useCallback(() => {
    window.location.replace('/?account=deleted')
  }, [])

  async function onConfirmDelete() {
    if (!canSubmit || pending) return
    setError('')
    setPending(true)

    try {
      if (mode !== 'live' || !hasLiveSession) {
        // Demo / unconfigured: no live auth user to hard-delete.
        finishDeleted()
        return
      }

      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: confirmText.trim() }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean }
      if (!res.ok) {
        setError(data.error || 'Could not delete your account. Please try again later.')
        setPending(false)
        return
      }

      try {
        const supabase = createClient()
        await supabase.auth.signOut()
      } catch {
        // Session may already be invalid after hard delete.
      }
      finishDeleted()
    } catch {
      setError('Could not delete your account. Please try again later.')
      setPending(false)
    }
  }

  return (
    <div
      className="account-hc-modal-overlay is-open"
      role="presentation"
      data-testid="settings-delete-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onClose()
      }}
    >
      <div
        className="account-hc-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="settings-delete-modal"
      >
        <h2 id={titleId}>Delete your account permanently?</h2>
        <p className="lead">This will erase all of the following from HouseCall:</p>
        <ul className="account-hc-danger-list account-hc-modal-erase">
          {ACCOUNT_DELETE_ERASE_ITEMS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="account-hc-modal-warn">{ACCOUNT_DELETE_WARNING}</p>

        <div className="account-hc-field account-hc-modal-field">
          <label htmlFor="account-delete-confirm" className="account-hc-label">
            Type {ACCOUNT_DELETE_CONFIRM_PHRASE} to confirm
          </label>
          <input
            ref={inputRef}
            id="account-delete-confirm"
            className="account-hc-input"
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={confirmText}
            disabled={pending}
            onChange={(e) => setConfirmText(e.target.value)}
            data-testid="settings-delete-confirm-input"
          />
        </div>

        {error ? (
          <p className="account-hc-modal-error" role="alert" data-testid="settings-delete-error">
            {error}
          </p>
        ) : null}

        <div className="account-hc-modal-actions">
          <button
            type="button"
            className="account-hc-btn account-hc-btn-secondary"
            onClick={onClose}
            disabled={pending}
            data-testid="settings-delete-cancel"
          >
            Cancel
          </button>
          <button
            type="button"
            className="account-hc-btn-danger"
            disabled={!canSubmit || pending}
            onClick={() => void onConfirmDelete()}
            data-testid="settings-delete-confirm"
          >
            {pending ? 'Deleting…' : 'Delete my account'}
          </button>
        </div>
      </div>
    </div>
  )
}
