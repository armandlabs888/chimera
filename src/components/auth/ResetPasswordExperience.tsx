'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useFocusTrap } from '@/components/browse/useFocusTrap'
import { useBeam } from '@/context/BeamContext'
import { Button, Field, TextInput } from '@/components/ui'
import { friendlyAuthError } from '@/lib/auth/errors'
import { createClient } from '@/lib/supabase/client'
import type { EmailOtpType } from '@supabase/supabase-js'
import { AuthModalShell } from './AuthModalShell'

type Phase = 'loading' | 'form' | 'success' | 'expired'

type Props = {
  onClose?: () => void
}

export function ResetPasswordExperience({ onClose }: Props) {
  const router = useRouter()
  const { currentUser, ready, mode } = useBeam()
  const [phase, setPhase] = useState<Phase>('loading')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pending, setPending] = useState(false)
  const [localError, setLocalError] = useState('')
  const exchangedRef = useRef(false)

  const modalRef = useRef<HTMLDivElement>(null)
  const handleClose = useCallback(() => {
    onClose?.()
  }, [onClose])

  useFocusTrap(Boolean(onClose), modalRef, handleClose)

  useEffect(() => {
    if (mode === 'demo' || mode === 'unconfigured') {
      setPhase('expired')
      return
    }

    let cancelled = false
    const supabase = createClient()

    const markReady = () => {
      if (!cancelled) setPhase('form')
    }
    const markExpired = () => {
      if (!cancelled) setPhase('expired')
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        markReady()
      }
    })

    async function bootstrap() {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const tokenHash = params.get('token_hash')
      const type = params.get('type') as EmailOtpType | null

      try {
        // QA / design preview of the set-password form without a recovery session.
        if (params.get('preview') === '1') {
          markReady()
          return
        }

        if (code && !exchangedRef.current) {
          exchangedRef.current = true
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (cancelled) return
          if (error) {
            markExpired()
            return
          }
          // Drop one-time code from the URL after a successful exchange.
          window.history.replaceState({}, '', '/auth/reset-password')
          markReady()
          return
        }

        if (tokenHash && type === 'recovery') {
          const { error } = await supabase.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash })
          if (cancelled) return
          if (error) {
            markExpired()
            return
          }
          window.history.replaceState({}, '', '/auth/reset-password')
          markReady()
          return
        }

        const { data, error } = await supabase.auth.getSession()
        if (cancelled) return
        if (error || !data.session) {
          markExpired()
          return
        }
        // Already have a session from a prior recovery exchange on this tab.
        markReady()
      } catch {
        if (!cancelled) markExpired()
      }
    }

    void bootstrap()

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [mode])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLocalError('')
    if (password.length < 6) {
      setLocalError('Use a password with at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setLocalError('Passwords must match.')
      return
    }
    setPending(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setLocalError(friendlyAuthError(error.message))
        return
      }
      setPhase('success')
      const destination = currentUser.onboardingCompletedAt ? '/browse' : '/onboarding'
      window.setTimeout(() => {
        router.replace(destination)
      }, 1200)
    } catch (err) {
      setLocalError(
        friendlyAuthError(err instanceof Error ? err.message : 'Could not update password'),
      )
    } finally {
      setPending(false)
    }
  }

  const titleId = 'reset-password-title'

  return (
    <AuthModalShell
      titleId={titleId}
      modalRef={modalRef}
      onClose={handleClose}
      testId="reset-password-modal"
    >
      {phase === 'loading' || !ready ? (
        <div>
          <h1
            id={titleId}
            className="mt-4 font-display text-[26px] font-extrabold leading-[1.15] tracking-[-0.035em] text-[#071330] md:text-[28px]"
          >
            Set a new password
          </h1>
          <p className="mt-2 text-[14px] leading-[22px] text-[#4A5568]">Checking your reset link…</p>
        </div>
      ) : null}

      {phase === 'expired' ? (
        <div data-testid="reset-password-expired">
          <h1
            id={titleId}
            className="mt-4 font-display text-[26px] font-extrabold leading-[1.15] tracking-[-0.035em] text-[#071330] md:text-[28px]"
          >
            Reset link expired
          </h1>
          <p className="mt-2 max-w-[40ch] text-[14px] leading-[22px] text-[#4A5568]">
            This reset link has expired. Request a new one.
          </p>
          <Link
            href="/auth?view=forgot"
            className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-[10px] bg-[#1D5CE5] text-[14px] font-semibold text-white hover:bg-[#1649BD]"
            data-testid="reset-request-new-link"
          >
            Request a new link
          </Link>
          <p className="mt-[18px] text-center text-[13px] text-[#4A5568]">
            <Link
              href="/auth?mode=signin"
              className="font-semibold text-[#1649BD] underline-offset-2 hover:underline"
            >
              Back to sign in
            </Link>
          </p>
        </div>
      ) : null}

      {phase === 'success' ? (
        <div data-testid="reset-password-success">
          <h1
            id={titleId}
            className="mt-4 font-display text-[26px] font-extrabold leading-[1.15] tracking-[-0.035em] text-[#071330] md:text-[28px]"
          >
            Password updated
          </h1>
          <p className="mt-2 text-[14px] leading-[22px] text-[#4A5568]">
            Your password is saved. Taking you into Bunk…
          </p>
        </div>
      ) : null}

      {phase === 'form' && ready ? (
        <div>
          <h1
            id={titleId}
            className="mt-4 font-display text-[26px] font-extrabold leading-[1.15] tracking-[-0.035em] text-[#071330] md:text-[28px]"
          >
            Set a new password
          </h1>
          <p className="mt-2 max-w-[40ch] text-[14px] leading-[22px] text-[#4A5568]">
            Choose a new password for your Bunk account.
          </p>

          <form className="mt-6 space-y-3" onSubmit={onSubmit} data-testid="reset-password-form">
            <Field label="New password" hint="At least 6 characters">
              <div className="relative">
                <TextInput
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="h-[42px] rounded-[10px] border-[#E3E8EF] pr-16 text-[14px]"
                />
                <button
                  type="button"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg px-1.5 py-1 text-[13px] font-semibold text-[#4A5568] hover:text-[#071330]"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-pressed={showPassword}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </Field>

            <Field label="Confirm password">
              <div className="relative">
                <TextInput
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="h-[42px] rounded-[10px] border-[#E3E8EF] pr-16 text-[14px]"
                />
                <button
                  type="button"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg px-1.5 py-1 text-[13px] font-semibold text-[#4A5568] hover:text-[#071330]"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-pressed={showConfirm}
                >
                  {showConfirm ? 'Hide' : 'Show'}
                </button>
              </div>
            </Field>

            {localError ? (
              <div
                role="alert"
                className="rounded-lg border border-[#D7E0EC] bg-white px-4 py-3 text-[14px] text-[#071330]"
              >
                {localError}
              </div>
            ) : null}

            <Button
              type="submit"
              className="mt-[6px] h-11 w-full rounded-[10px] bg-[#1D5CE5] hover:bg-[#1649BD]"
              disabled={pending}
            >
              {pending ? 'Updating…' : 'Update password'}
            </Button>
          </form>
        </div>
      ) : null}
    </AuthModalShell>
  )
}
