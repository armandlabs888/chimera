'use client'

import Link from 'next/link'
import { useCallback, useMemo, useRef, useState, type FormEvent } from 'react'
import { useFocusTrap } from '@/components/browse/useFocusTrap'
import { useBeam } from '@/context/BeamContext'
import { Button, Field, TextInput } from '@/components/ui'
import { friendlyAuthError } from '@/lib/auth/errors'
import { buildAuthCallbackUrl, sanitizeNext } from '@/lib/auth/safeNext'
import { resolveOAuthRedirectOrigin } from '@/lib/auth/siteOrigin'
import { createClient } from '@/lib/supabase/client'
import { AuthMobileVerifyBadge, AuthModalShell } from './AuthModalShell'
import { GoogleMark } from './GoogleMark'

export type AuthMode = 'signin' | 'signup'
type AuthView = 'auth' | 'forgot'

type Props = {
  initialMode?: AuthMode
  nextPath?: string
  initialError?: string | null
  onClose?: () => void
  /** Open directly on the password-reset request view (e.g. expired link). */
  initialView?: AuthView
}

const RESET_SENT_MESSAGE =
  'If an account exists for that email, a reset link is on its way.'

export function AuthExperience({
  initialMode = 'signin',
  nextPath = '/onboarding',
  initialError = null,
  onClose,
  initialView = 'auth',
}: Props) {
  const {
    mode,
    signIn,
    signUp,
    signInWithGoogle,
    resendSignupConfirmation,
    backendError,
    clearBackendError,
  } = useBeam()

  const safeNext = useMemo(() => sanitizeNext(nextPath, '/onboarding'), [nextPath])
  const [tab, setTab] = useState<AuthMode>(initialMode)
  const [view, setView] = useState<AuthView>(initialView)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [pending, setPending] = useState(false)
  const [googlePending, setGooglePending] = useState(false)
  const [resetPending, setResetPending] = useState(false)
  const [localError, setLocalError] = useState(() =>
    initialError ? friendlyAuthError(initialError) : '',
  )
  const [confirmSent, setConfirmSent] = useState(false)
  const [resendPending, setResendPending] = useState(false)
  const [info, setInfo] = useState('')
  const [resetSent, setResetSent] = useState(false)

  const modalRef = useRef<HTMLDivElement>(null)
  const handleClose = useCallback(() => {
    onClose?.()
  }, [onClose])

  useFocusTrap(Boolean(onClose), modalRef, handleClose)

  const switchTab = useCallback(
    (next: AuthMode) => {
      setTab(next)
      setView('auth')
      setLocalError('')
      setInfo('')
      setConfirmSent(false)
      setResetSent(false)
      clearBackendError()
    },
    [clearBackendError],
  )

  const openForgot = useCallback(() => {
    setView('forgot')
    setLocalError('')
    setInfo('')
    setResetSent(false)
    clearBackendError()
  }, [clearBackendError])

  const backToSignIn = useCallback(() => {
    setView('auth')
    setTab('signin')
    setLocalError('')
    setInfo('')
    setResetSent(false)
    clearBackendError()
  }, [clearBackendError])

  const oauthRedirectTo =
    typeof window !== 'undefined'
      ? buildAuthCallbackUrl(resolveOAuthRedirectOrigin(window.location.origin), safeNext)
      : buildAuthCallbackUrl('', safeNext)

  async function onGoogle() {
    setGooglePending(true)
    setLocalError('')
    setInfo('')
    clearBackendError()
    try {
      await signInWithGoogle(oauthRedirectTo)
    } catch (err) {
      setLocalError(friendlyAuthError(err instanceof Error ? err.message : 'Google sign-in failed'))
      setGooglePending(false)
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setPending(true)
    setLocalError('')
    setInfo('')
    clearBackendError()
    try {
      if (tab === 'signin') {
        await signIn(email.trim(), password)
      } else {
        const emailRedirectTo =
          typeof window !== 'undefined'
            ? buildAuthCallbackUrl(resolveOAuthRedirectOrigin(window.location.origin), safeNext)
            : undefined
        const result = await signUp(email.trim(), password, {
          emailRedirectTo,
        })
        if (result.needsEmailConfirmation) {
          setConfirmSent(true)
          setInfo('Check your inbox to confirm your email, then sign in to continue.')
        }
      }
    } catch (err) {
      setLocalError(friendlyAuthError(err instanceof Error ? err.message : 'Authentication failed'))
    } finally {
      setPending(false)
    }
  }

  async function onResend() {
    if (!email.trim()) {
      setLocalError('Enter the email you signed up with, then resend.')
      return
    }
    setResendPending(true)
    setLocalError('')
    try {
      await resendSignupConfirmation(email.trim())
      setInfo('Confirmation email resent. Check your inbox.')
    } catch (err) {
      setLocalError(friendlyAuthError(err instanceof Error ? err.message : 'Could not resend'))
    } finally {
      setResendPending(false)
    }
  }

  async function onSendReset(e: FormEvent) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) {
      setLocalError('Enter the email for your account.')
      return
    }
    setResetPending(true)
    setLocalError('')
    setInfo('')
    setResetSent(false)
    clearBackendError()
    try {
      const redirectTo = `${resolveOAuthRedirectOrigin(window.location.origin)}/auth/reset-password`
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, { redirectTo })
      if (error) {
        setLocalError(friendlyAuthError(error.message))
        return
      }
      setResetSent(true)
      setInfo(RESET_SENT_MESSAGE)
    } catch (err) {
      setLocalError(
        friendlyAuthError(err instanceof Error ? err.message : 'Could not send reset link'),
      )
    } finally {
      setResetPending(false)
    }
  }

  const alertError = localError || (backendError ? friendlyAuthError(backendError) : '')
  const titleId = 'auth-modal-title'

  return (
    <AuthModalShell titleId={titleId} modalRef={modalRef} onClose={handleClose}>
      <FormColumn
        titleId={titleId}
        tab={tab}
        view={view}
        switchTab={switchTab}
        openForgot={openForgot}
        backToSignIn={backToSignIn}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        pending={pending}
        googlePending={googlePending}
        resetPending={resetPending}
        onGoogle={onGoogle}
        onSubmit={onSubmit}
        onSendReset={onSendReset}
        alertError={alertError}
        info={info}
        resetSent={resetSent}
        confirmSent={confirmSent}
        onResend={onResend}
        resendPending={resendPending}
        setConfirmSent={setConfirmSent}
        mode={mode}
        safeNext={safeNext}
      />
    </AuthModalShell>
  )
}

function FormColumn(props: {
  titleId: string
  tab: AuthMode
  view: AuthView
  switchTab: (t: AuthMode) => void
  openForgot: () => void
  backToSignIn: () => void
  email: string
  setEmail: (v: string) => void
  password: string
  setPassword: (v: string) => void
  showPassword: boolean
  setShowPassword: (v: boolean | ((b: boolean) => boolean)) => void
  pending: boolean
  googlePending: boolean
  resetPending: boolean
  onGoogle: () => void
  onSubmit: (e: FormEvent) => void
  onSendReset: (e: FormEvent) => void
  alertError: string
  info: string
  resetSent: boolean
  confirmSent: boolean
  onResend: () => void
  resendPending: boolean
  setConfirmSent: (v: boolean) => void
  mode: string
  safeNext: string
}) {
  const {
    titleId,
    tab,
    view,
    switchTab,
    openForgot,
    backToSignIn,
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    pending,
    googlePending,
    resetPending,
    onGoogle,
    onSubmit,
    onSendReset,
    alertError,
    info,
    resetSent,
    confirmSent,
    onResend,
    resendPending,
    setConfirmSent,
    mode,
    safeNext,
  } = props

  if (mode === 'demo') {
    return (
      <div>
        <h1 id={titleId} className="mt-4 font-display text-[28px] font-extrabold leading-[1.15] tracking-[-0.035em] text-[#071330] md:text-[28px]">
          You are in demo mode
        </h1>
        <p className="mt-2 max-w-[36ch] text-[14px] leading-[22px] text-[#4A5568]">
          Local demo skips live sign-in. Continue into HouseCall with sample marketplace data in this
          browser.
        </p>
        {alertError ? (
          <div className="mt-5">
            <ErrorBanner message={alertError} />
          </div>
        ) : null}
        <Link href={safeNext} className="cta-primary mt-8 w-full justify-center">
          Continue to HouseCall
        </Link>
      </div>
    )
  }

  if (mode === 'unconfigured') {
    return (
      <div>
        <h1 id={titleId} className="mt-4 font-display text-[28px] font-extrabold leading-[1.15] tracking-[-0.035em] text-[#071330]">
          HouseCall needs configuration
        </h1>
        <p className="mt-2 max-w-[36ch] text-[14px] leading-[22px] text-[#4A5568]">
          Set Supabase env vars for live auth, or enable demo with{' '}
          <code className="text-[#1D5CE5]">NEXT_PUBLIC_BEAM_DEMO_MODE=1</code>.
        </p>
        {alertError ? (
          <div className="mt-5">
            <ErrorBanner message={alertError} />
          </div>
        ) : null}
        <Link href="/" className="cta-ghost mt-8 w-full justify-center">
          Back to home
        </Link>
      </div>
    )
  }

  if (confirmSent) {
    return (
      <div>
        <h1 id={titleId} className="mt-4 font-display text-[28px] font-extrabold leading-[1.15] tracking-[-0.035em] text-[#071330]">
          Check your inbox
        </h1>
        <div className="mt-5 rounded-lg border border-[#D7E0EC] bg-white px-4 py-3 text-[14px] text-[#071330]">
          We sent a confirmation link to <strong className="text-[#071330]">{email}</strong>.
        </div>
        {info ? <p className="mt-3 text-[14px] text-[#4A5568]">{info}</p> : null}
        {alertError ? <ErrorBanner message={alertError} /> : null}
        <div className="mt-6 flex flex-col gap-3">
          <Button type="button" onClick={onResend} disabled={resendPending} className="h-11 w-full rounded-[10px]">
            {resendPending ? 'Sending…' : 'Resend confirmation email'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-11 w-full rounded-[10px]"
            onClick={() => {
              setConfirmSent(false)
              switchTab('signin')
            }}
          >
            Back to sign in
          </Button>
        </div>
      </div>
    )
  }

  if (view === 'forgot') {
    return (
      <div>
        <h1
          id={titleId}
          className="mt-4 font-display text-[26px] font-extrabold leading-[1.15] tracking-[-0.035em] text-[#071330] md:text-[28px]"
        >
          Reset your password
        </h1>
        <p className="mt-2 max-w-[40ch] text-[14px] leading-[22px] text-[#4A5568]">
          Enter your email and we&apos;ll send you a link to set a new password.
        </p>

        <form className="mt-6 space-y-3" onSubmit={onSendReset} data-testid="auth-forgot-form">
          <Field label="Email">
            <TextInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="h-[42px] rounded-[10px] border-[#E3E8EF] text-[14px]"
            />
          </Field>

          {alertError ? <ErrorBanner message={alertError} /> : null}
          {resetSent || info ? (
            <div
              className="rounded-lg border border-[#D7E0EC] bg-white px-4 py-3 text-[14px] text-[#071330]"
              data-testid="auth-reset-sent"
            >
              {info || RESET_SENT_MESSAGE}
            </div>
          ) : null}

          <Button
            type="submit"
            className="mt-[6px] h-11 w-full rounded-[10px] bg-[#1D5CE5] hover:bg-[#1649BD]"
            disabled={resetPending}
          >
            {resetPending ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>

        <p className="mt-[18px] text-center text-[13px] text-[#4A5568]">
          <button
            type="button"
            className="font-semibold text-[#1649BD] underline-offset-2 hover:underline"
            onClick={backToSignIn}
            data-testid="auth-back-to-signin"
          >
            Back to sign in
          </button>
        </p>
      </div>
    )
  }

  return (
    <div>
      <h1
        id={titleId}
        className="mt-4 font-display text-[26px] font-extrabold leading-[1.15] tracking-[-0.035em] text-[#071330] md:text-[28px]"
      >
        {tab === 'signin' ? 'Welcome back' : 'Join HouseCall'}
      </h1>
      <p className="mt-2 max-w-[36ch] text-[14px] leading-[22px] text-[#4A5568]">
        {tab === 'signin'
          ? 'Sign in to post a task or help neighbors nearby.'
          : 'Join HouseCall to post practical jobs or help neighbors nearby.'}
      </p>

      <AuthMobileVerifyBadge className="mt-3.5" />

      <button
        type="button"
        onClick={onGoogle}
        disabled={pending || googlePending}
        className="mt-[18px] inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-[10px] border border-[#E3E8EF] bg-white text-[14px] font-semibold text-[#071330] transition hover:bg-white disabled:opacity-50 md:mt-6"
      >
        <GoogleMark />
        {googlePending ? 'Redirecting…' : 'Continue with Google'}
      </button>

      <div className="my-[18px] flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-[#E3E8EF]" />
        <span className="text-[13px] text-[#4A5568]">or</span>
        <span className="h-px flex-1 bg-[#E3E8EF]" />
      </div>

      <div className="mb-[18px] flex gap-5 border-b border-[#E3E8EF]" role="tablist">
        {(['signin', 'signup'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => switchTab(t)}
            className={`pb-2.5 text-[14px] font-semibold transition ${
              tab === t
                ? 'border-b-2 border-[#1D5CE5] text-[#1D5CE5]'
                : 'border-b-2 border-transparent text-[#4A5568] hover:text-[#4A5568]'
            }`}
          >
            {t === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        ))}
      </div>

      <form className="space-y-3" onSubmit={onSubmit}>
        <Field label="Email">
          <TextInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="h-[42px] rounded-[10px] border-[#E3E8EF] text-[14px]"
          />
        </Field>

        {tab === 'signin' ? (
          <label className="block space-y-1.5">
            <span className="flex items-center justify-between gap-3">
              <span className="type-meta text-beam-muted">Password</span>
              <button
                type="button"
                onClick={openForgot}
                className="shrink-0 text-[13px] font-medium text-[#1649BD] underline-offset-2 hover:underline"
                data-testid="auth-forgot-password"
              >
                Forgot password?
              </button>
            </span>
            <div className="relative">
              <TextInput
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="current-password"
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
          </label>
        ) : (
          <Field label="Password" hint="At least 6 characters">
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
        )}

        {alertError ? <ErrorBanner message={alertError} /> : null}
        {info ? (
          <div className="rounded-lg border border-[#D7E0EC] bg-white px-4 py-3 text-[14px] text-[#071330]">
            {info}
          </div>
        ) : null}

        <Button
          type="submit"
          className="mt-[6px] h-11 w-full rounded-[10px] bg-[#1D5CE5] hover:bg-[#1649BD]"
          disabled={pending || googlePending}
        >
          {pending ? 'Working…' : tab === 'signin' ? 'Sign in' : 'Create account'}
        </Button>
      </form>

      <p className="mt-[18px] text-center text-[13px] text-[#4A5568]">
        {tab === 'signin' ? (
          <>
            Don't have an account?{' '}
            <button
              type="button"
              className="font-semibold text-[#1D5CE5] underline-offset-2 hover:underline"
              onClick={() => switchTab('signup')}
            >
              Create account
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button
              type="button"
              className="font-semibold text-[#1D5CE5] underline-offset-2 hover:underline"
              onClick={() => switchTab('signin')}
            >
              Sign in
            </button>
          </>
        )}
      </p>

      <p className="mt-5 text-center text-[12px] leading-[18px] text-[#4A5568]">
        By continuing, you agree to HouseCall&apos;s{' '}
        <Link href="/terms" className="text-[#1649BD] underline-offset-2 hover:underline">
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="text-[#1649BD] underline-offset-2 hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-[#D7E0EC] bg-white px-4 py-3 text-[14px] text-[#071330]"
    >
      {message}
    </div>
  )
}
