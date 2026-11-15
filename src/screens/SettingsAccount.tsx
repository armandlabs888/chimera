'use client'

import {
  CheckCircle2,
  ChevronRight,
  FileText,
  LogOut,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { HelperUrgentSmsSettings } from '@/components/account/HelperUrgentSmsSettings'
import { SettingsPageChrome } from '@/components/account/SettingsNav'
import {
  ACCOUNT_DELETE_ERASE_ITEMS,
  ACCOUNT_DELETE_WARNING,
} from '@/lib/account/deleteAccountCopy'
import {
  ACCOUNT_DELETE_CONFIRM_PHRASE,
  isValidAccountDeleteConfirm,
} from '@/lib/account/deleteConfirm'
import { useBeam } from '@/context/BeamContext'
import { isHelperPerson } from '@/lib/roles'
import { createClient } from '@/lib/supabase/client'
import '@/components/account/account-hc.css'
import './settings-account.css'

const HELPER_ONLY_ACCOUNT_HASHES = new Set(['notifications', 'verification'])

export function SettingsAccount() {
  const { mode, authUser, currentUser, helperVerification, signOut } = useBeam()
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const isHelper = isHelperPerson(currentUser)
  const canSignOut = Boolean(authUser) || mode === 'demo'
  const verificationDone = helperVerification?.status === 'approved'

  useEffect(() => {
    if (typeof window === 'undefined') return

    function syncHash() {
      const hash = window.location.hash.replace('#', '')
      if (!isHelper && HELPER_ONLY_ACCOUNT_HASHES.has(hash)) {
        router.replace('/settings')
        return
      }
      if (!hash) return
      const el = document.getElementById(hash)
      if (el) {
        requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }))
      }
    }

    syncHash()
    window.addEventListener('hashchange', syncHash)
    return () => window.removeEventListener('hashchange', syncHash)
  }, [isHelper, router])

  return (
    <>
      <SettingsPageChrome
        title="Settings"
        subtitle="Private settings. Nothing here shows on your profile."
        active={isHelper ? 'notifications' : 'legal'}
        mobileBackHref="/settings"
        mobileBackLabel="Settings"
      >
        <div data-testid="settings-page">
          {isHelper ? (
            <>
              <h2 className="sa-group" id="notifications">
                Notifications
              </h2>
              <div className="sa-block" data-testid="settings-notifications">
                <HelperUrgentSmsSettings
                  userId={authUser?.id || currentUser.id}
                  localOnly={mode !== 'live'}
                />
              </div>

              <h2 className="sa-group" id="verification">
                Verification
              </h2>
              <div className="sa-list" data-testid="settings-verification">
                <Link href="/verify" className="sa-row">
                  <ShieldCheck className="sa-lead" strokeWidth={2} aria-hidden />
                  <span className="sa-grow">
                    Home location check
                    <span className="sa-meta">
                      Confirms you live where you say you do. Required to make offers.
                    </span>
                  </span>
                  {verificationDone ? (
                    <span className="sa-ok">
                      <CheckCircle2 className="h-4 w-4 text-[#1D5CE5]" strokeWidth={2} aria-hidden />
                      Done
                    </span>
                  ) : (
                    <ChevronRight className="sa-chev" strokeWidth={2} aria-hidden />
                  )}
                </Link>
              </div>
            </>
          ) : null}

          <h2 className="sa-group" id="legal">
            Legal
          </h2>
          <div className="sa-list" data-testid="settings-legal">
            <Link href="/terms" className="sa-row">
              <FileText className="sa-lead" strokeWidth={2} aria-hidden />
              <span className="sa-grow">Terms of Service</span>
              <ChevronRight className="sa-chev" strokeWidth={2} aria-hidden />
            </Link>
            <Link href="/privacy" className="sa-row">
              <FileText className="sa-lead" strokeWidth={2} aria-hidden />
              <span className="sa-grow">Privacy Policy</span>
              <ChevronRight className="sa-chev" strokeWidth={2} aria-hidden />
            </Link>
          </div>

          <h2 className="sa-group">Account</h2>
          <div className="sa-list" data-testid="settings-account">
            {canSignOut ? (
              <button
                type="button"
                className="sa-row sa-red"
                data-testid="settings-sign-out"
                onClick={() => void signOut()}
              >
                <LogOut className="sa-lead" strokeWidth={2} aria-hidden />
                <span className="sa-grow">Sign out</span>
              </button>
            ) : null}
            <button
              type="button"
              className="sa-row sa-red"
              data-testid="settings-delete-open"
              onClick={() => setModalOpen(true)}
            >
              <Trash2 className="sa-lead" strokeWidth={2} aria-hidden />
              <span className="sa-grow">
                Delete account
                <span className="sa-meta">
                  Permanently erases your profile, jobs, offers and messages.
                </span>
              </span>
              <ChevronRight className="sa-chev" strokeWidth={2} aria-hidden />
            </button>
          </div>
        </div>
      </SettingsPageChrome>

      {modalOpen ? (
        <DeleteAccountModal
          mode={mode}
          hasLiveSession={Boolean(authUser)}
          onClose={() => setModalOpen(false)}
        />
      ) : null}
    </>
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
