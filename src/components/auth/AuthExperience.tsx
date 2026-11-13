'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useMemo, useRef, useState, type FormEvent } from 'react'
import { BeamMark } from '@/components/BeamMark'
import { useFocusTrap } from '@/components/browse/useFocusTrap'
import { useBeam } from '@/context/BeamContext'
import { Button, Field, TextInput } from '@/components/ui'
import { friendlyAuthError } from '@/lib/auth/errors'
import { buildAuthCallbackUrl, sanitizeNext } from '@/lib/auth/safeNext'
import { GoogleMark } from './GoogleMark'
import { LIFESTYLE } from '@/data/media'

export type AuthMode = 'signin' | 'signup'

type Props = {
  initialMode?: AuthMode
  nextPath?: string
  initialError?: string | null
  onClose?: () => void
}

const BULLETS = [
  'Post a task in a minute',
  'Compare offers from people nearby',
  'Pick who fits and message them',
] as const

export function AuthExperience({
  initialMode = 'signin',
  nextPath = '/onboarding',
  initialError = null,
  onClose,
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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [name, setName] = useState('')
  const [pending, setPending] = useState(false)
  const [googlePending, setGooglePending] = useState(false)
  const [localError, setLocalError] = useState(() =>
    initialError ? friendlyAuthError(initialError) : '',
  )
  const [confirmSent, setConfirmSent] = useState(false)
  const [resendPending, setResendPending] = useState(false)
  const [info, setInfo] = useState('')

  const modalRef = useRef<HTMLDivElement>(null)
  const handleClose = useCallback(() => {
    onClose?.()
  }, [onClose])

  useFocusTrap(Boolean(onClose), modalRef, handleClose)

  const switchTab = useCallback(
    (next: AuthMode) => {
      setTab(next)
      setLocalError('')
      setInfo('')
      setConfirmSent(false)
      clearBackendError()
    },
    [clearBackendError],
  )

  const oauthRedirectTo =
    typeof window !== 'undefined'
      ? buildAuthCallbackUrl(window.location.origin, safeNext)
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
            ? buildAuthCallbackUrl(window.location.origin, safeNext)
            : undefined
        const result = await signUp(email.trim(), password, name.trim().slice(0, 80), {
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

  const alertError = localError || (backendError ? friendlyAuthError(backendError) : '')
  const titleId = 'auth-modal-title'

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-3.5 md:p-8"
      data-testid="auth-modal-overlay"
    >
      <div
        className="absolute inset-0 bg-[rgba(7,19,48,0.5)] backdrop-blur-[8px]"
        data-testid="auth-modal-scrim"
        onClick={handleClose}
        aria-hidden
      />

      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-testid="auth-modal"
        className="relative z-[1] grid h-auto max-h-[calc(100vh-28px)] w-[min(100%,362px)] grid-cols-1 overflow-hidden rounded-2xl bg-white shadow-[0_24px_64px_rgba(7,19,48,0.28),0_2px_8px_rgba(7,19,48,0.08)] outline-none md:h-[736px] md:max-h-[calc(100vh-64px)] md:w-[1000px] md:max-w-[calc(100vw-64px)] md:grid-cols-2"
      >
        <div className="flex min-h-0 min-w-0 flex-col justify-start overflow-y-auto bg-white px-[22px] py-7 md:justify-center md:px-11 md:py-9">
          <div
            className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#E3E8EF] bg-[#F5F9FF] text-[#1D5CE5]"
            aria-hidden
          >
            <BeamMark width={18} height={18} color="currentColor" />
          </div>

          <FormColumn
            titleId={titleId}
            tab={tab}
            switchTab={switchTab}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            name={name}
            setName={setName}
            pending={pending}
            googlePending={googlePending}
            onGoogle={onGoogle}
            onSubmit={onSubmit}
            alertError={alertError}
            info={info}
            confirmSent={confirmSent}
            onResend={onResend}
            resendPending={resendPending}
            setConfirmSent={setConfirmSent}
            mode={mode}
            safeNext={safeNext}
          />
        </div>

        <AsidePanel />

        {/* Close last in DOM so initial focus lands on the form, not the X. */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          data-testid="auth-modal-close"
          className="absolute right-2.5 top-2.5 z-[3] inline-flex h-9 w-9 items-center justify-center rounded-full text-[#64748B] transition hover:bg-[rgba(7,19,48,0.06)] hover:text-[#071330] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/focus-visible:ring-offset-2 md:right-3.5 md:top-3.5"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </div>
    </div>
  )
}

function VerifyBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 self-start rounded-[10px] border border-[#D7E0EC] bg-white px-3 py-2 text-[13px] font-semibold leading-tight text-[#071330] shadow-[0_1px_2px_rgba(7,19,48,0.04)] ${className}`}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#1D5CE5"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="shrink-0"
      >
        <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
        <path d="M9.5 12.2l1.7 1.7 3.4-3.6" />
      </svg>
      Helpers verify they live nearby
    </span>
  )
}

function AsidePanel() {
  return (
    <aside
      className="relative hidden min-w-0 flex-col items-center justify-center border-l border-[#E3E8EF] bg-[#F5F9FF] px-6 md:flex"
      data-testid="auth-aside-panel"
    >
      {/* Content group width matches the photo (360px); centered in the panel. */}
      <div className="flex w-[360px] max-w-full flex-col text-left">
        <p className="font-display text-[36px] font-extrabold leading-[1.15] tracking-[-0.045em] text-[#071330]">
          Trusted help,
          <br />
          <span className="whitespace-nowrap">
            right <span className="text-[#1D5CE5]">next door.</span>
          </span>
        </p>

        <VerifyBadge className="mt-5" />

        <div className="relative mt-[22px] h-[328px] w-full shrink-0 overflow-hidden rounded-xl border border-[#E3E8EF] bg-[#E8EEF6] shadow-[0_8px_20px_rgba(7,19,48,0.08)]">
          <Image
            src={LIFESTYLE.authCarpet}
            alt="A HouseCall helper cleaning a carpet"
            fill
            className="object-cover object-[50%_30%]"
            sizes="360px"
            priority
          />
        </div>

        <ul className="mt-7 flex flex-col gap-3.5">
          {BULLETS.map((text) => (
            <li key={text} className="flex items-start gap-2.5 text-[15px] font-medium leading-[22px] text-[#071330]">
              <svg className="mt-0.5 h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="none" aria-hidden>
                <circle cx="10" cy="10" r="9" fill="#EEF4FF" stroke="#1D5CE5" strokeWidth="1.2" />
                <path
                  d="M6.2 10.2l2.3 2.3 5.3-5.4"
                  stroke="#1D5CE5"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {text}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}

function FormColumn(props: {
  titleId: string
  tab: AuthMode
  switchTab: (t: AuthMode) => void
  email: string
  setEmail: (v: string) => void
  password: string
  setPassword: (v: string) => void
  showPassword: boolean
  setShowPassword: (v: boolean | ((b: boolean) => boolean)) => void
  name: string
  setName: (v: string) => void
  pending: boolean
  googlePending: boolean
  onGoogle: () => void
  onSubmit: (e: FormEvent) => void
  alertError: string
  info: string
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
    switchTab,
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    name,
    setName,
    pending,
    googlePending,
    onGoogle,
    onSubmit,
    alertError,
    info,
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
        <p className="mt-2 max-w-[36ch] text-[14px] leading-[22px] text-[#475569]">
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
        <p className="mt-2 max-w-[36ch] text-[14px] leading-[22px] text-[#475569]">
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
        <div className="mt-5 rounded-lg border border-[#FDE68A] bg-[#FFF8D6] px-4 py-3 text-[14px] text-[#92400E]">
          We sent a confirmation link to <strong className="text-[#071330]">{email}</strong>.
        </div>
        {info ? <p className="mt-3 text-[14px] text-[#64748B]">{info}</p> : null}
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

  return (
    <div>
      <h1
        id={titleId}
        className="mt-4 font-display text-[26px] font-extrabold leading-[1.15] tracking-[-0.035em] text-[#071330] md:text-[28px]"
      >
        {tab === 'signin' ? 'Welcome back' : 'Join HouseCall'}
      </h1>
      <p className="mt-2 max-w-[36ch] text-[14px] leading-[22px] text-[#475569]">
        {tab === 'signin'
          ? 'Sign in to post a task or help neighbors nearby.'
          : 'Join HouseCall to post practical jobs or help neighbors nearby.'}
      </p>

      <VerifyBadge className="mt-3.5 md:hidden" />

      <button
        type="button"
        onClick={onGoogle}
        disabled={pending || googlePending}
        className="mt-[18px] inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-[10px] border border-[#E3E8EF] bg-white text-[14px] font-semibold text-[#071330] transition hover:bg-[#F8FAFC] disabled:opacity-50 md:mt-6"
      >
        <GoogleMark />
        {googlePending ? 'Redirecting…' : 'Continue with Google'}
      </button>

      <div className="my-[18px] flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-[#E3E8EF]" />
        <span className="text-[13px] text-[#94A3B8]">or</span>
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
                : 'border-b-2 border-transparent text-[#94A3B8] hover:text-[#475569]'
            }`}
          >
            {t === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        ))}
      </div>

      <form className="space-y-3" onSubmit={onSubmit}>
        {tab === 'signup' ? (
          <Field label="Full name">
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={80}
              autoComplete="name"
              placeholder="Alex Rivera"
              className="h-[42px] rounded-[10px] border-[#E3E8EF] text-[14px]"
            />
          </Field>
        ) : null}

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

        <Field label="Password" hint={tab === 'signup' ? 'At least 6 characters' : undefined}>
          <div className="relative">
            <TextInput
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
              className="h-[42px] rounded-[10px] border-[#E3E8EF] pr-16 text-[14px]"
            />
            <button
              type="button"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg px-1.5 py-1 text-[13px] font-semibold text-[#64748B] hover:text-[#071330]"
              onClick={() => setShowPassword((v) => !v)}
              aria-pressed={showPassword}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </Field>

        {alertError ? <ErrorBanner message={alertError} /> : null}
        {info ? (
          <div className="rounded-lg border border-emerald-500/25 bg-emerald-50 px-4 py-3 text-[14px] text-emerald-700">
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

      <p className="mt-[18px] text-center text-[13px] text-[#64748B]">
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
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-500/25 bg-red-50 px-4 py-3 text-[14px] text-red-700"
    >
      {message}
    </div>
  )
}
