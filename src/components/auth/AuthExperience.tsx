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
  /** When true, hide the side panel (e.g. embedded gate). */
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

  if (mode === 'demo') {
    return (
      <Shell compact={compact}>
        <Card>
          <BrandLink />
          <h1 className="mt-5 font-serif type-h2 text-[#FAF8F4]">You’re in demo mode</h1>
          <p className="mt-2 type-sec text-[#A7A39C]">
            Local demo skips live sign-in. Continue into Beam with the Austin seed data in this
            browser only.
          </p>
          <ButtonLinkSafe href={safeNext} className="mt-6 w-full">
            Continue to Beam
          </ButtonLinkSafe>
        </Card>
      </Shell>
    )
  }

  if (mode === 'unconfigured') {
    return (
      <Shell compact={compact}>
        <Card>
          <BrandLink />
          <h1 className="mt-5 font-serif type-h2 text-[#FAF8F4]">Beam needs configuration</h1>
          <p className="mt-2 type-sec text-[#A7A39C]">
            Set Supabase env vars for live auth, or enable demo mode with{' '}
            <code className="text-[13px] text-[#E7B567]">NEXT_PUBLIC_BEAM_DEMO_MODE=1</code>.
          </p>
          <ButtonLinkSafe href="/" className="mt-6 w-full" variant="secondary">
            Back to home
          </ButtonLinkSafe>
        </Card>
      </Shell>
    )
  }

  if (confirmSent) {
    return (
      <Shell compact={compact}>
        <Card>
          <BrandLink />
          <h1 className="mt-5 font-serif type-h2 text-[#FAF8F4]">Check your inbox</h1>
          <div className="mt-4 rounded-[10px] border border-[#DDA352]/30 bg-[rgba(221,163,82,0.12)] px-3.5 py-3 text-[14px] leading-5 text-[#E7B567]">
            We sent a confirmation link to <strong className="text-[#FAF8F4]">{email}</strong>. Confirm
            your email, then sign in to continue.
          </div>
          {info ? <p className="mt-3 type-sec text-[#A7A39C]">{info}</p> : null}
          {alertError ? <ErrorBanner message={alertError} /> : null}
          <div className="mt-6 flex flex-col gap-2.5">
            <Button type="button" onClick={onResend} disabled={resendPending} className="w-full">
              {resendPending ? 'Sending…' : 'Resend confirmation email'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => {
                setConfirmSent(false)
                switchTab('signin')
              }}
            >
              Back to sign in
            </Button>
          </div>
        </Card>
        {!compact ? <AsidePanel /> : null}
      </Shell>
    )
  }

  return (
    <Shell compact={compact}>
      <Card>
        <BrandLink />
        <h1 className="mt-5 font-serif type-h2 text-[#FAF8F4]">
          {tab === 'signin' ? 'Welcome back' : 'Create your Beam account'}
        </h1>
        <p className="mt-2 type-sec text-[#A7A39C]">
          {tab === 'signin'
            ? 'Sign in to post requests, send offers, and message neighbors nearby.'
            : 'Join Beam to post practical jobs or help neighbors around Austin.'}
        </p>

        <button
          type="button"
          onClick={onGoogle}
          disabled={pending || googlePending}
          className="touch-target mt-6 inline-flex w-full items-center justify-center gap-2.5 rounded-[12px] border border-white/[0.14] bg-[#131416]/90 px-4 text-[15px] font-medium text-[#F7F4EE] transition hover:border-white/[0.24] hover:bg-white/[0.06] disabled:opacity-50"
        >
          <GoogleMark />
          {googlePending ? 'Redirecting…' : 'Continue with Google'}
        </button>

        <div className="my-5 flex items-center gap-3" aria-hidden>
          <span className="h-px flex-1 bg-white/[0.1]" />
          <span className="type-meta text-[#7E7A73]">or continue with email</span>
          <span className="h-px flex-1 bg-white/[0.1]" />
        </div>

        <div
          className="flex rounded-[12px] border border-white/[0.1] bg-[#121317] p-0.5"
          role="tablist"
        >
          {(['signin', 'signup'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => switchTab(t)}
              className={`btn-compact flex-1 rounded-[9px] px-3 text-[13px] font-medium transition ${
                tab === t
                  ? 'bg-[#1D2026] text-[#FAF8F4] shadow-[inset_0_0_0_1px_rgba(221,163,82,0.35)]'
                  : 'text-[#A7A39C] hover:text-[#F7F4EE]'
              }`}
            >
              {t === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        <form className="mt-5 space-y-3.5" onSubmit={onSubmit}>
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
                />
              </Field>
              <Field label="Austin neighborhood">
                <select
                  className="touch-target w-full rounded-[12px] border border-white/[0.12] bg-[#212225]/90 px-3 text-[15px] text-[#F5F2EC] outline-none focus:border-[#DDA352]/65"
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
                className="pr-16"
              />
              <button
                type="button"
                className="btn-compact absolute right-1.5 top-1/2 -translate-y-1/2 rounded-[8px] px-2.5 text-[13px] font-medium text-[#A7A39C] hover:text-[#F7F4EE]"
                onClick={() => setShowPassword((v) => !v)}
                aria-pressed={showPassword}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </Field>

          {alertError ? <ErrorBanner message={alertError} /> : null}
          {info ? (
            <div className="rounded-[10px] border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-3 text-[14px] leading-5 text-emerald-300">
              {info}
            </div>
          ) : null}

          <Button type="submit" className="w-full" disabled={pending || googlePending}>
            {pending ? 'Working…' : tab === 'signin' ? 'Sign in' : 'Create account'}
          </Button>
        </form>

        <p className="mt-5 text-center type-sec text-[#A7A39C]">
          {tab === 'signin' ? (
            <>
              New to Beam?{' '}
              <button
                type="button"
                className="font-medium text-[#DDA352] underline-offset-2 hover:underline"
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
                className="font-medium text-[#DDA352] underline-offset-2 hover:underline"
                onClick={() => switchTab('signin')}
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </Card>
      {!compact ? <AsidePanel /> : null}
    </Shell>
  )
}

function Shell({ children, compact }: { children: React.ReactNode; compact?: boolean }) {
  return (
    <div className="min-h-dvh bg-[#0E0F12] text-[#F7F4EE]">
      <div
        className={`mx-auto grid min-h-dvh max-w-[72rem] items-center gap-8 px-4 py-10 sm:px-6 ${
          compact ? 'max-w-md' : 'lg:grid-cols-2 lg:gap-12'
        }`}
      >
        {children}
      </div>
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="elevated-md w-full max-w-md justify-self-center p-6 sm:p-8 lg:justify-self-end">
      {children}
    </div>
  )
}

function BrandLink() {
  return (
    <Link href="/" className="inline-flex items-center gap-3">
      <BeamWordmark markSize={28} />
      <span className="type-meta text-[#7E7A73]">Back to home</span>
    </Link>
  )
}

function AsidePanel() {
  return (
    <aside className="hidden max-w-md justify-self-start lg:block">
      <div className="elevated overflow-hidden">
        <Image
          src="/images/beam-hero-moving-bg.jpg"
          alt="Neighbor carrying a moving box through a warmly lit interior"
          width={1810}
          height={1216}
          className="h-auto w-full object-cover"
          sizes="28rem"
          priority
        />
      </div>
      <p className="mt-3 type-meta text-[#7E7A73]">
        Example — Austin neighbors helping with moving &amp; light handyman tasks
      </p>
      <p className="mt-4 font-serif text-[22px] leading-snug text-[#FAF8F4]">
        Post a practical job nearby. Get priced offers. Coordinate in thread.
      </p>
    </aside>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-[10px] border border-red-500/30 bg-red-500/10 px-3.5 py-3 text-[14px] leading-5 text-red-300"
    >
      {message}
    </div>
  )
}

function ButtonLinkSafe({
  href,
  children,
  className = '',
  variant = 'primary',
}: {
  href: string
  children: React.ReactNode
  className?: string
  variant?: 'primary' | 'secondary'
}) {
  return (
    <Link
      href={href}
      className={`touch-target inline-flex items-center justify-center rounded-[12px] px-4 text-[15px] font-semibold transition ${
        variant === 'primary'
          ? 'bg-gradient-to-b from-[#D5A455] via-[#C6944B] to-[#B88842] text-[#FDFBF7] shadow-[0_8px_20px_rgba(198,148,75,0.22)]'
          : 'border border-white/[0.15] bg-[#131416]/90 text-[#ECE8E1] hover:bg-white/[0.06]'
      } ${className}`}
    >
      {children}
    </Link>
  )
}
