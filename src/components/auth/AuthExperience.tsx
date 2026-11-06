'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useMemo, useState, type FormEvent } from 'react'
import { BeamWordmark } from '@/components/BeamMark'
import { useBeam } from '@/context/BeamContext'
import { Button, Field, TextInput } from '@/components/ui'
import { NEIGHBORHOODS } from '@/data/neighborhoods'
import { friendlyAuthError } from '@/lib/auth/errors'
import { sanitizeNext } from '@/lib/auth/safeNext'
import type { NeighborhoodId } from '@/types'
import { GoogleMark } from './GoogleMark'

export type AuthMode = 'signin' | 'signup'

type Props = {
  initialMode?: AuthMode
  nextPath?: string
  initialError?: string | null
  compact?: boolean
}

export function AuthExperience({
  initialMode = 'signin',
  nextPath = '/browse',
  initialError = null,
  compact = false,
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

  const safeNext = useMemo(() => sanitizeNext(nextPath), [nextPath])
  const [tab, setTab] = useState<AuthMode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [name, setName] = useState('')
  const [neighborhood, setNeighborhood] = useState<NeighborhoodId>('east-austin')
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
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`
      : `/auth/callback?next=${encodeURIComponent(safeNext)}`

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
            ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`
            : undefined
        const result = await signUp(email.trim(), password, name.trim().slice(0, 80), {
          neighborhood,
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
      neighborhood={neighborhood}
      setNeighborhood={setNeighborhood}
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
      showBrand={!compact}
    />
  )

  if (compact) {
    return <div className="mx-auto w-full max-w-[400px] px-6 py-10">{form}</div>
  }

  return (
    <div className="min-h-dvh bg-[#0C0C0E] text-[#F6F3EE] lg:grid lg:min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <AsidePanel />
      <div className="flex flex-col px-6 py-6 lg:px-10">
        <div className="mb-6 lg:hidden">
          <Link href="/">
            <BeamWordmark markWidth={44} markHeight={20} wordClassName="text-[26px]" />
          </Link>
          <div className="relative mt-5 h-[180px] overflow-hidden rounded-2xl">
            <Image
              src="/images/beam-hero-gig-work.jpg"
              alt=""
              fill
              className="object-cover object-[60%_40%]"
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
    <aside className="relative hidden min-h-dvh overflow-hidden lg:block">
      <Image
        src="/images/beam-hero-gig-work.jpg"
        alt="Neighbors helping with furniture in a sunlit living room"
        fill
        priority
        className="object-cover object-[60%_40%]"
        sizes="50vw"
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            'radial-gradient(70% 75% at 2% 0%, rgba(214,150,64,0.36) 0%, rgba(170,108,44,0.15) 38%, transparent 68%)',
            'linear-gradient(0deg, rgba(12,12,14,0.85), transparent 45%)',
          ].join(', '),
        }}
        aria-hidden
      />
      <Link href="/" className="absolute left-10 top-10 z-10">
        <BeamWordmark markWidth={48} markHeight={22} />
      </Link>
      <div className="absolute inset-x-10 bottom-12 z-10">
        <p
          className="max-w-[18ch] font-serif text-[32px] font-normal leading-[1.1] tracking-[-0.02em] text-[#F6F3EE]"
          style={{ fontVariationSettings: "'opsz' 72" }}
        >
          Post a job nearby. Get priced offers.
        </p>
        <p className="mt-3 text-[13px] text-[#B7B2AA]">Central Austin · Peer-to-peer</p>
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
  neighborhood: NeighborhoodId
  setNeighborhood: (v: NeighborhoodId) => void
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
  showBrand: boolean
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
    neighborhood,
    setNeighborhood,
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
    showBrand,
  } = props

  if (mode === 'demo') {
    return (
      <div>
        {showBrand ? (
          <Link href="/" className="mb-6 inline-block lg:hidden">
            <BeamWordmark markWidth={40} markHeight={18} wordClassName="text-[24px]" />
          </Link>
        ) : null}
        <h1
          className="font-serif text-[40px] font-normal leading-[1.05] tracking-[-0.02em] text-[#F6F3EE]"
          style={{ fontVariationSettings: "'opsz' 72" }}
        >
          You’re in demo mode
        </h1>
        <p className="mt-3 text-[16px] text-[#B7B2AA]">
          Local demo skips live sign-in. Continue into Beam with Austin seed data in this browser.
        </p>
        <Link
          href={safeNext}
          className="cta-primary mt-8 w-full justify-center"
        >
          Continue to Beam
        </Link>
      </div>
    )
  }

  if (mode === 'unconfigured') {
    return (
      <div>
        <h1
          className="font-serif text-[40px] font-normal leading-[1.05] text-[#F6F3EE]"
          style={{ fontVariationSettings: "'opsz' 72" }}
        >
          Beam needs configuration
        </h1>
        <p className="mt-3 text-[16px] text-[#B7B2AA]">
          Set Supabase env vars for live auth, or enable demo with{' '}
          <code className="text-[#D6B06C]">NEXT_PUBLIC_BEAM_DEMO_MODE=1</code>.
        </p>
        <Link
          href="/"
          className="cta-ghost mt-8 w-full justify-center"
        >
          Back to home
        </Link>
      </div>
    )
  }

  if (confirmSent) {
    return (
      <div>
        <h1
          className="font-serif text-[40px] font-normal leading-[1.05] text-[#F6F3EE]"
          style={{ fontVariationSettings: "'opsz' 72" }}
        >
          Check your inbox
        </h1>
        <div className="mt-5 rounded-[14px] border border-[#D6B06C]/30 bg-[rgba(214,176,108,0.12)] px-4 py-3 text-[14px] text-[#D6B06C]">
          We sent a confirmation link to <strong className="text-[#F6F3EE]">{email}</strong>.
        </div>
        {info ? <p className="mt-3 text-[14px] text-[#B7B2AA]">{info}</p> : null}
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
      <h1
        className="font-serif text-[40px] font-normal leading-[1.05] tracking-[-0.02em] text-[#F6F3EE]"
        style={{ fontVariationSettings: "'opsz' 72" }}
      >
        {tab === 'signin' ? 'Welcome back' : 'Join Beam'}
      </h1>
      <p className="mt-3 text-[16px] text-[#B7B2AA]">
        {tab === 'signin'
          ? 'Sign in to post requests, send offers, and message neighbors nearby.'
          : 'Join Beam to post practical jobs or help neighbors around Austin.'}
      </p>

      <button
        type="button"
        onClick={onGoogle}
        disabled={pending || googlePending}
        className="mt-8 inline-flex h-[52px] w-full items-center justify-center gap-2.5 rounded-[14px] border border-white/[0.14] bg-[#141518] text-[16px] font-medium text-[#F6F3EE] transition hover:border-white/[0.24] disabled:opacity-50"
      >
        <GoogleMark />
        {googlePending ? 'Redirecting…' : 'Continue with Google'}
      </button>

      <div className="my-6 flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-white/[0.1]" />
        <span className="text-[13px] text-[#85817A]">or</span>
        <span className="h-px flex-1 bg-white/[0.1]" />
      </div>

      <div className="flex gap-6 border-b border-white/[0.08]" role="tablist">
        {(['signin', 'signup'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => switchTab(t)}
            className={`pb-3 text-[15px] font-medium transition ${
              tab === t
                ? 'border-b-2 border-[#F6F3EE] text-[#F6F3EE]'
                : 'border-b-2 border-transparent text-[#85817A] hover:text-[#B7B2AA]'
            }`}
          >
            {t === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        ))}
      </div>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        {tab === 'signup' ? (
          <>
            <Field label="Full name">
              <TextInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={80}
                autoComplete="name"
                placeholder="Alex Rivera"
                className="h-[52px] rounded-[14px]"
              />
            </Field>
            <Field label="Austin neighborhood">
              <select
                className="touch-target h-[52px] w-full rounded-[14px] border border-white/[0.14] bg-[#141518] px-3.5 text-[15px] text-[#F6F3EE] outline-none focus:border-[#E2B66A]"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value as NeighborhoodId)}
                required
              >
                {NEIGHBORHOODS.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
              </select>
            </Field>
          </>
        ) : null}

        <Field label="Email">
          <TextInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="h-[52px] rounded-[14px]"
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
              className="h-[52px] rounded-[14px] pr-16"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[8px] px-2.5 py-1.5 text-[13px] font-medium text-[#85817A] hover:text-[#F6F3EE]"
              onClick={() => setShowPassword((v) => !v)}
              aria-pressed={showPassword}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </Field>

        {alertError ? <ErrorBanner message={alertError} /> : null}
        {info ? (
          <div className="rounded-[14px] border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-[14px] text-emerald-300">
            {info}
          </div>
        ) : null}

        <Button type="submit" className="h-[52px] w-full rounded-[14px]" disabled={pending || googlePending}>
          {pending ? 'Working…' : tab === 'signin' ? 'Sign in' : 'Create account'}
        </Button>
      </form>

      <p className="mt-6 text-center text-[14px] text-[#B7B2AA]">
        {tab === 'signin' ? (
          <>
            New to Beam?{' '}
            <button
              type="button"
              className="font-medium text-[#D6B06C] underline-offset-2 hover:underline"
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
              className="font-medium text-[#D6B06C] underline-offset-2 hover:underline"
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
      className="rounded-[14px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-[14px] text-red-300"
    >
      {message}
    </div>
  )
}
