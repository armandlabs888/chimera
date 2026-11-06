'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useMemo, useState, type FormEvent } from 'react'
import { BeamWordmark } from '@/components/BeamMark'
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
}

export function AuthExperience({
  initialMode = 'signin',
  nextPath = '/onboarding',
  initialError = null,
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
  const form = (
    <FormColumn
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
  )

  return (
    <div className="min-h-dvh bg-white text-[#071330] lg:grid lg:min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <AsidePanel />
      <div className="flex flex-col px-6 py-6 lg:px-10">
        <div className="mb-6 lg:hidden">
          <Link href="/">
            <BeamWordmark markWidth={26} markHeight={26} wordClassName="text-[24px]" tone="ink" />
          </Link>
          <div className="relative mt-5 h-[180px] overflow-hidden rounded-xl bg-gradient-to-br from-[#1D5CE5] to-[#7CC9FA]">
            <Image
              src={LIFESTYLE.authShowcase}
              alt=""
              fill
              className="object-cover object-[60%_30%] opacity-90"
              sizes="100vw"
              priority
            />
          </div>
        </div>
        <div className="mx-auto w-full max-w-[400px] flex-1 self-center py-8 lg:py-0">{form}</div>
      </div>
    </div>
  )
}

function AsidePanel() {
  return (
    <aside className="relative hidden min-h-dvh overflow-hidden bg-gradient-to-br from-[#1A54D2] via-[#3E8FF0] to-[#7CC9FA] lg:block">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 50% 40% at 80% 20%, rgba(255,255,255,0.35), transparent 70%), radial-gradient(ellipse 45% 35% at 10% 85%, rgba(255,255,255,0.28), transparent 70%)',
        }}
        aria-hidden
      />
      <Link href="/" className="absolute left-10 top-10 z-10">
        <BeamWordmark markWidth={28} markHeight={28} tone="white" />
      </Link>
      <div className="absolute inset-x-10 top-[28%] z-10">
        <div className="relative mx-auto h-[280px] w-[200px] overflow-hidden rounded-xl border-4 border-white shadow-[0_24px_50px_-12px_rgba(12,42,102,0.35)]">
          <Image
            src={LIFESTYLE.authShowcase}
            alt="Local helper ready to help"
            fill
            className="object-cover"
            sizes="200px"
            priority
          />
        </div>
      </div>
      <div className="absolute inset-x-10 bottom-12 z-10">
        <p className="max-w-[20ch] font-display text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-white">
          Local help, made easy.
        </p>
        <p className="mt-3 text-[14px] text-white/85">
          “Posted a couch move at 1pm — two neighbors showed up the same afternoon.” — Elena R.
        </p>
      </div>
    </aside>
  )
}

function FormColumn(props: {
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
        <h1 className="font-display text-[36px] font-bold leading-[1.15] tracking-[-0.02em] text-[#071330]">
          You’re in demo mode
        </h1>
        <p className="mt-3 text-[16px] text-[#64748B]">
          Local demo skips live sign-in. Continue into Beam with sample marketplace data in this
          browser.
        </p>
        {alertError ? <div className="mt-5"><ErrorBanner message={alertError} /></div> : null}
        <Link href={safeNext} className="cta-primary mt-8 w-full justify-center">
          Continue to Beam
        </Link>
      </div>
    )
  }

  if (mode === 'unconfigured') {
    return (
      <div>
        <h1 className="font-display text-[36px] font-bold leading-[1.15] text-[#071330]">
          Beam needs configuration
        </h1>
        <p className="mt-3 text-[16px] text-[#64748B]">
          Set Supabase env vars for live auth, or enable demo with{' '}
          <code className="text-[#1D5CE5]">NEXT_PUBLIC_BEAM_DEMO_MODE=1</code>.
        </p>
        {alertError ? <div className="mt-5"><ErrorBanner message={alertError} /></div> : null}
        <Link href="/" className="cta-ghost mt-8 w-full justify-center">
          Back to home
        </Link>
      </div>
    )
  }

  if (confirmSent) {
    return (
      <div>
        <h1 className="font-display text-[36px] font-bold leading-[1.15] text-[#071330]">
          Check your inbox
        </h1>
        <div className="mt-5 rounded-xl border border-[#FDE68A] bg-[#FFF8D6] px-4 py-3 text-[14px] text-[#92400E]">
          We sent a confirmation link to <strong className="text-[#071330]">{email}</strong>.
        </div>
        {info ? <p className="mt-3 text-[14px] text-[#64748B]">{info}</p> : null}
        {alertError ? <ErrorBanner message={alertError} /> : null}
        <div className="mt-6 flex flex-col gap-3">
          <Button type="button" onClick={onResend} disabled={resendPending} className="h-[52px] w-full">
            {resendPending ? 'Sending…' : 'Resend confirmation email'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-[52px] w-full"
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
      <h1 className="font-display text-[36px] font-bold leading-[1.15] tracking-[-0.02em] text-[#071330]">
        {tab === 'signin' ? 'Welcome back' : 'Join Beam'}
      </h1>
      <p className="mt-3 text-[16px] text-[#64748B]">
        {tab === 'signin'
          ? 'Sign in to post requests, send offers, and message neighbors nearby.'
          : 'Join Beam to post practical jobs or help neighbors nearby.'}
      </p>

      <button
        type="button"
        onClick={onGoogle}
        disabled={pending || googlePending}
        className="mt-8 inline-flex h-[52px] w-full items-center justify-center gap-2.5 rounded-full border border-[rgba(7,19,48,0.12)] bg-white text-[16px] font-semibold text-[#071330] transition hover:bg-[#F4F8FD] disabled:opacity-50"
      >
        <GoogleMark />
        {googlePending ? 'Redirecting…' : 'Continue with Google'}
      </button>

      <div className="my-6 flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-[rgba(7,19,48,0.1)]" />
        <span className="text-[13px] text-[#94A3B8]">or</span>
        <span className="h-px flex-1 bg-[rgba(7,19,48,0.1)]" />
      </div>

      <div className="flex gap-6 border-b border-[rgba(7,19,48,0.08)]" role="tablist">
        {(['signin', 'signup'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => switchTab(t)}
            className={`pb-3 text-[15px] font-semibold transition ${
              tab === t
                ? 'border-b-2 border-[#1D5CE5] text-[#1D5CE5]'
                : 'border-b-2 border-transparent text-[#94A3B8] hover:text-[#475569]'
            }`}
          >
            {t === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        ))}
      </div>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        {tab === 'signup' ? (
          <Field label="Full name">
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={80}
              autoComplete="name"
              placeholder="Alex Rivera"
              className="h-[52px] rounded-xl"
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
            className="h-[52px] rounded-xl"
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
              className="h-[52px] rounded-xl pr-16"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-[#64748B] hover:text-[#071330]"
              onClick={() => setShowPassword((v) => !v)}
              aria-pressed={showPassword}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </Field>

        {alertError ? <ErrorBanner message={alertError} /> : null}
        {info ? (
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-50 px-4 py-3 text-[14px] text-emerald-700">
            {info}
          </div>
        ) : null}

        <Button type="submit" className="h-[52px] w-full rounded-full" disabled={pending || googlePending}>
          {pending ? 'Working…' : tab === 'signin' ? 'Sign in' : 'Create account'}
        </Button>
      </form>

      <p className="mt-6 text-center text-[14px] text-[#64748B]">
        {tab === 'signin' ? (
          <>
            New to Beam?{' '}
            <button
              type="button"
              className="font-semibold text-[#1D5CE5] underline-offset-2 hover:underline"
              onClick={() => switchTab('signup')}
            >
              Create an account
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
      className="rounded-xl border border-red-500/25 bg-red-50 px-4 py-3 text-[14px] text-red-700"
    >
      {message}
    </div>
  )
}
