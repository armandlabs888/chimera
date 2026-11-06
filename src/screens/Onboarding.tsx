'use client'

import Image from 'next/image'
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  BookOpen,
  Check,
  HandHelping,
  Layers,
  LogOut,
  Pencil,
  ShieldAlert,
  ShoppingBag,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  useEffect,
  useId,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { BeamWordmark } from '@/components/BeamMark'
import { UsCityCombobox } from '@/components/onboarding/UsCityCombobox'
import { Button } from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import { HERO_HELPERS, LIFESTYLE } from '@/data/media'
import type { UsCity } from '@/lib/usPlaces'
import type { AccountRole } from '@/types'

const SAFETY_VERSION = 'v1'

const ROLES: {
  id: AccountRole
  title: string
  body: string
  footer: string
  icon: typeof ShoppingBag
}[] = [
  {
    id: 'customer',
    title: 'Customer',
    body: 'Post tasks, compare local offers, and book same-day help.',
    footer: 'Free to post · Compare offers',
    icon: ShoppingBag,
  },
  {
    id: 'helper',
    title: 'Helper / Tasker',
    body: 'Browse nearby requests, send offers, and earn on your schedule.',
    footer: 'Keep 100% of your rate · Flexible hours',
    icon: HandHelping,
  },
]

const STEP_LABELS = [
  { n: '01', title: 'Role & location' },
  { n: '02', title: 'Community pledge' },
] as const

export function Onboarding() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preview = searchParams.get('preview') === '1'
  const {
    mode,
    ready,
    authUser,
    currentUser,
    completeOnboarding,
    signOut,
  } = useBeam()

  const roleGroupId = useId()
  const [step, setStep] = useState<1 | 2>(1)
  const [role, setRole] = useState<AccountRole | null>(null)
  const [city, setCity] = useState<UsCity | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  const isPreviewOrDemo = mode === 'demo' || preview
  const alreadyOnboarded = Boolean(currentUser.onboardingCompletedAt)
  const showAccountChrome = mode === 'live' && Boolean(authUser)

  useEffect(() => {
    if (!ready) return
    // Live users who finished onboarding leave /onboarding unless previewing.
    if (mode === 'live' && authUser && alreadyOnboarded && !preview) {
      router.replace('/browse')
    }
  }, [ready, mode, authUser, alreadyOnboarded, preview, router])

  useEffect(() => {
    if (!ready) return
    // Live guests cannot start onboarding — send them to sign up.
    if (mode === 'live' && !authUser && !preview) {
      router.replace('/auth?mode=signup&next=%2Fonboarding')
    }
  }, [ready, mode, authUser, preview, router])

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [step])

  function onRoleKeyDown(e: ReactKeyboardEvent, current: AccountRole) {
    const idx = ROLES.findIndex((r) => r.id === current)
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      setRole(ROLES[(idx + 1) % ROLES.length].id)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      setRole(ROLES[(idx - 1 + ROLES.length) % ROLES.length].id)
    }
  }

  const canNext = Boolean(role && city)

  const previewCopy = useMemo(() => {
    if (step === 2) {
      return 'Protected marketplace · 6 everyday categories with active moderation.'
    }
    if (role === 'customer') {
      return 'Post a task in 60 seconds and compare offers from vetted local helpers.'
    }
    if (role === 'helper') {
      return 'Browse nearby requests, set your own rate, and get hired the same day.'
    }
    return 'Join a daylight marketplace for everyday local help across all 50 US states.'
  }, [role, step])

  const roleBadge =
    role === 'customer'
      ? 'Customer account'
      : role === 'helper'
        ? 'Helper / Tasker account'
        : 'New member'

  const cityPill = city ? city.label : 'All 50 US states'

  const previewImage =
    step === 2
      ? LIFESTYLE.authShowcase
      : role === 'helper'
        ? HERO_HELPERS[2]?.src ?? LIFESTYLE.moving
        : role === 'customer'
          ? LIFESTYLE.moving
          : LIFESTYLE.authShowcase

  async function onComplete() {
    if (!role || !city) return
    setPending(true)
    setError('')
    try {
      // Preview guest walkthrough skips the live RPC; demo + signed-in live persist.
      if (mode === 'demo' || (mode === 'live' && authUser)) {
        await completeOnboarding({
          role,
          city: city.name,
          stateCode: city.stateCode,
          safetyVersion: SAFETY_VERSION,
        })
      }
      router.replace('/browse')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not finish onboarding')
      setPending(false)
    }
  }

  async function onSignOut() {
    try {
      // signOut hard-navigates through /auth/signout → /auth (no prior-route linger).
      await signOut()
    } catch {
      // BeamContext already surfaces auth errors; redirect still proceeds.
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white">
        <p className="text-[22px] font-semibold tracking-tight text-[#071330]">Beam</p>
      </div>
    )
  }

  return (
    <div
      className="min-h-dvh bg-white text-[#071330] lg:grid lg:grid-cols-[440px_1fr] xl:grid-cols-[480px_1fr]"
      data-testid="onboarding-root"
      data-step={step}
    >
      {/* Left brand & live context showcase */}
      <aside className="relative hidden min-h-dvh flex-col justify-between overflow-x-hidden bg-gradient-to-br from-[#1649BD] via-[#2568E8] to-[#6BC2FA] px-9 py-10 lg:flex xl:px-10">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 50% 40% at 80% 18%, rgba(255,255,255,0.38), transparent 70%), radial-gradient(ellipse 45% 35% at 12% 88%, rgba(255,255,255,0.26), transparent 70%)',
          }}
          aria-hidden
        />

        <div className="relative z-10">
          <Link href={isPreviewOrDemo ? '/browse' : '/'} aria-label="Beam home">
            <BeamWordmark markWidth={28} markHeight={28} tone="white" />
          </Link>

          <ol className="mt-12 space-y-3" aria-label="Onboarding steps">
            {STEP_LABELS.map((item, idx) => {
              const active = step === idx + 1
              const done = step > idx + 1
              return (
                <li
                  key={item.n}
                  className={`flex items-center gap-3 text-[13.5px] font-semibold transition ${
                    active ? 'text-white' : done ? 'text-white/85' : 'text-white/55'
                  }`}
                >
                  <span
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-[12px] tabular-nums ${
                      active
                        ? 'bg-white text-[#1D5CE5] shadow-[0_8px_18px_-8px_rgba(7,19,48,0.35)]'
                        : done
                          ? 'bg-white/25 text-white'
                          : 'bg-white/10 text-white/70'
                    }`}
                  >
                    {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : item.n}
                  </span>
                  <span>
                    {item.n} · {item.title}
                  </span>
                </li>
              )
            })}
          </ol>
        </div>

        <div className="relative z-10 my-8 pb-2">
          <div className="relative mx-auto w-full max-w-[320px]">
            <div className="relative h-[200px] overflow-hidden rounded-[28px] border-4 border-white/90 shadow-[0_28px_56px_-18px_rgba(7,19,48,0.4)]">
              <Image
                key={previewImage}
                src={previewImage}
                alt=""
                fill
                className="object-cover transition-opacity duration-500"
                sizes="(min-width: 1024px) 320px, 0px"
                priority
              />
            </div>

            <div
              key={`${role ?? 'none'}-${city?.label ?? 'none'}-${step}`}
              className="relative z-10 mx-3 -mt-10 animate-fade-up rounded-[20px] border border-white/70 bg-white p-4 shadow-[0_18px_40px_-16px_rgba(7,19,48,0.35)]"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#EEF4FF] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-[#1D5CE5]">
                  {roleBadge}
                </span>
                <span className="rounded-full bg-[#F4F8FD] px-2.5 py-1 text-[11px] font-semibold text-[#475569]">
                  {cityPill}
                </span>
              </div>
              <p className="mt-2.5 text-[13.5px] font-medium leading-[1.45] text-[#071330]">
                {previewCopy}
              </p>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-[12.5px] font-semibold tracking-wide text-white/85">
          6 everyday categories · Direct local offers · US-wide coverage
        </p>
      </aside>

      {/* Right interactive workspace */}
      <div className="flex min-h-dvh flex-col bg-white">
        {/* Mobile / tablet header */}
        <header className="sticky top-0 z-30 border-b border-[rgba(7,19,48,0.08)] bg-white/95 backdrop-blur-md lg:hidden">
          <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-5">
            <Link href={isPreviewOrDemo ? '/browse' : '/'} aria-label="Beam home">
              <BeamWordmark markWidth={24} markHeight={24} wordClassName="text-[20px]" tone="ink" />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-2 rounded-full bg-[#F4F8FD] px-2.5 py-1.5">
                <span className="text-[12px] font-semibold tabular-nums text-[#475569]">
                  Step {step} of 2
                </span>
                <span className="flex gap-1" aria-hidden>
                  <span
                    className={`h-1 w-5 rounded-full ${step >= 1 ? 'bg-[#1D5CE5]' : 'bg-[#D5DEEA]'}`}
                  />
                  <span
                    className={`h-1 w-5 rounded-full ${step >= 2 ? 'bg-[#1D5CE5]' : 'bg-[#D5DEEA]'}`}
                  />
                </span>
              </div>
              {showAccountChrome ? (
                <button
                  type="button"
                  data-testid="onboarding-sign-out"
                  onClick={() => void onSignOut()}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[12.5px] font-semibold text-[#64748B] transition hover:bg-[#F4F8FD] hover:text-[#071330]"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden />
                  Sign out
                </button>
              ) : null}
            </div>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-[540px] flex-1 flex-col px-5 py-7 sm:px-6 sm:py-9 lg:px-8 lg:py-10">
          {/* Desktop top bar */}
          <div className="mb-8 hidden items-start justify-between gap-4 lg:flex">
            <div>
              <p className="text-[13px] font-semibold tabular-nums text-[#64748B]">
                {step === 1 ? 'Step 1 of 2 · Role & Location' : 'Step 2 of 2 · Community Standards'}
              </p>
              <div className="mt-2.5 flex gap-2" aria-hidden>
                <span
                  className={`h-1 w-16 rounded-full transition-colors ${
                    step >= 1 ? 'bg-[#1D5CE5]' : 'bg-[#E2E8F0]'
                  }`}
                />
                <span
                  className={`h-1 w-16 rounded-full transition-colors ${
                    step >= 2 ? 'bg-[#1D5CE5]' : 'bg-[#E2E8F0]'
                  }`}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              {showAccountChrome ? (
                <>
                  <span className="max-w-[180px] truncate rounded-full border border-[rgba(7,19,48,0.08)] bg-[#F8FAFC] px-3 py-1.5 text-[12.5px] font-medium text-[#475569]">
                    {authUser?.email}
                  </span>
                  <button
                    type="button"
                    data-testid="onboarding-sign-out"
                    onClick={() => void onSignOut()}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold text-[#64748B] transition hover:bg-[#F4F8FD] hover:text-[#071330]"
                  >
                    <LogOut className="h-3.5 w-3.5" aria-hidden />
                    Sign out
                  </button>
                </>
              ) : preview ? (
                <span className="rounded-full bg-[#FFF8D6] px-3 py-1.5 text-[12px] font-bold uppercase tracking-[0.06em] text-[#071330]">
                  Preview mode
                </span>
              ) : null}
            </div>
          </div>

          {step === 1 ? (
            <div data-testid="onboarding-step-1" className="animate-fade-up">
              <p className="inline-flex items-center rounded-full bg-[#F4F8FD] px-3 py-1 text-[12px] font-bold uppercase tracking-[0.08em] text-[#1D5CE5]">
                Account setup
              </p>
              <h1 className="mt-4 font-display text-[clamp(1.9rem,4vw,2.45rem)] font-bold leading-[1.15] tracking-[-0.02em] text-balance text-[#071330]">
                Welcome to Beam
              </h1>
              <p className="mt-3 max-w-[44ch] text-[15.5px] leading-[1.55] text-[#64748B]">
                Tell us how you’d like to participate and set your home city.
              </p>

              <div className="mt-8">
                <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                  <p
                    id={`${roleGroupId}-label`}
                    className="text-[13px] font-semibold text-[#475569]"
                  >
                    Choose your primary role
                  </p>
                  <p className="text-[12.5px] font-medium text-[#94A3B8]">You can do both anytime</p>
                </div>
                <div
                  role="radiogroup"
                  aria-labelledby={`${roleGroupId}-label`}
                  className="grid gap-3.5 sm:grid-cols-2"
                  data-testid="onboarding-role-group"
                >
                  {ROLES.map((item) => {
                    const selected = role === item.id
                    const Icon = item.icon
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        tabIndex={role === null ? 0 : selected ? 0 : -1}
                        onClick={() => setRole(item.id)}
                        onKeyDown={(e) => {
                          if (role) onRoleKeyDown(e, role)
                          else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                            e.preventDefault()
                            setRole(item.id === 'customer' ? 'helper' : 'customer')
                          }
                        }}
                        data-testid={`onboarding-role-${item.id}`}
                        className={`rounded-[22px] border p-5 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1D5CE5]/25 ${
                          selected
                            ? 'border-[#1D5CE5] bg-[#F5F9FF] shadow-[0_12px_28px_-14px_rgba(29,92,229,0.22)] ring-2 ring-[#1D5CE5]/15'
                            : 'border-[rgba(7,19,48,0.1)] bg-white hover:border-[rgba(7,19,48,0.22)] hover:bg-[#FAFBFD]'
                        }`}
                      >
                        <span className="flex items-start justify-between gap-3">
                          <span
                            className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition ${
                              selected
                                ? 'bg-[#1D5CE5] text-white shadow-[0_8px_18px_-6px_rgba(29,92,229,0.45)]'
                                : 'bg-[#F4F8FD] text-[#1D5CE5]'
                            }`}
                          >
                            <Icon className="h-5 w-5" aria-hidden />
                          </span>
                          <span
                            className={`inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 transition ${
                              selected
                                ? 'border-[#1D5CE5] bg-[#1D5CE5] text-white'
                                : 'border-[#CBD5E1] bg-white'
                            }`}
                            aria-hidden
                          >
                            {selected ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                          </span>
                        </span>
                        <span className="mt-4 block text-[17px] font-bold text-[#071330]">
                          {item.title}
                        </span>
                        <span className="mt-1.5 block text-[13.5px] leading-[1.5] text-[#475569]">
                          {item.body}
                        </span>
                        <span className="mt-4 block border-t border-[rgba(7,19,48,0.06)] pt-3 text-[12px] font-semibold text-[#64748B]">
                          {item.footer}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="mt-8">
                <UsCityCombobox value={city} onChange={setCity} />
              </div>

              <div className="mt-9">
                <Button
                  type="button"
                  size="lg"
                  disabled={!canNext}
                  onClick={() => setStep(2)}
                  data-testid="onboarding-next"
                  className="h-[54px] w-full rounded-full bg-[#1D5CE5] px-7 text-[15.5px] text-white shadow-[0_10px_24px_-8px_rgba(29,92,229,0.4)] !transition-[transform,box-shadow] hover:bg-[#1649BD] disabled:cursor-not-allowed disabled:bg-[#E2E8F0] disabled:text-[#94A3B8] disabled:shadow-none disabled:!opacity-100 disabled:hover:bg-[#E2E8F0]"
                >
                  Next
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </div>
          ) : (
            <div data-testid="onboarding-step-2" className="animate-fade-up">
              <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-[rgba(7,19,48,0.08)] bg-[#F8FAFC] py-1.5 pl-3 pr-1.5">
                <span className="text-[13px] font-semibold text-[#071330]">
                  {role === 'helper' ? 'Helper / Tasker' : 'Customer'}
                  {city ? ` · ${city.label}` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setError('')
                    setStep(1)
                  }}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[12px] font-semibold text-[#1D5CE5] shadow-[0_0_0_1px_rgba(7,19,48,0.08)] transition hover:bg-[#EEF4FF]"
                >
                  <Pencil className="h-3 w-3" aria-hidden />
                  Edit
                </button>
              </div>

              <h1 className="mt-5 font-display text-[clamp(1.85rem,4vw,2.35rem)] font-bold leading-[1.15] tracking-[-0.02em] text-balance text-[#071330]">
                Community safety &amp; content rules
              </h1>
              <p className="mt-3 max-w-[46ch] text-[15.5px] leading-[1.55] text-[#64748B]">
                Review and accept Beam’s marketplace standards before browsing local listings.
              </p>

              <div
                className="mt-7 rounded-[22px] border border-[#F59E0B]/35 bg-[#FFF8D6] p-5 sm:p-6"
                data-testid="onboarding-safety-callout"
              >
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/90 text-[#B45309] shadow-[0_1px_2px_rgba(7,19,48,0.06)]">
                    <ShieldAlert className="h-5 w-5" aria-hidden />
                  </span>
                  <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#B45309]">
                    Mandatory marketplace policy
                  </p>
                </div>
                <p className="mt-4 text-[16px] font-bold leading-[1.45] text-[#071330]">
                  Posting illegal content or listing sexual services is strictly prohibited.
                </p>
                <p className="mt-3 text-[15px] leading-[1.5] text-[#475569]">
                  Violating listings will be removed immediately, and your account is subject to a
                  temporary ban.
                </p>
              </div>

              <div className="mt-5 rounded-[20px] border border-[rgba(7,19,48,0.08)] bg-[#F8FAFC] p-5">
                <ul className="space-y-4">
                  <li className="flex gap-3">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#1D5CE5] shadow-[0_0_0_1px_rgba(7,19,48,0.06)]">
                      <Layers className="h-4 w-4" aria-hidden />
                    </span>
                    <span>
                      <span className="block text-[14px] font-bold text-[#071330]">
                        Six everyday categories only
                      </span>
                      <span className="mt-0.5 block text-[13.5px] leading-[1.5] text-[#475569]">
                        Moving &amp; lifting, home cleaning, handyman &amp; assembly, pet care,
                        tutoring &amp; tech help, and events &amp; photo.
                      </span>
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#B45309] shadow-[0_0_0_1px_rgba(7,19,48,0.06)]">
                      <Ban className="h-4 w-4" aria-hidden />
                    </span>
                    <span>
                      <span className="block text-[14px] font-bold text-[#071330]">
                        Zero tolerance enforcement
                      </span>
                      <span className="mt-0.5 block text-[13.5px] leading-[1.5] text-[#475569]">
                        Illegal goods/tasks, adult or sexual services, and unsafe requests are
                        automatically removed and trigger account suspension.
                      </span>
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#1D5CE5] shadow-[0_0_0_1px_rgba(7,19,48,0.06)]">
                      <BookOpen className="h-4 w-4" aria-hidden />
                    </span>
                    <span>
                      <span className="block text-[14px] font-bold text-[#071330]">
                        Transparent safety standards
                      </span>
                      <span className="mt-0.5 block text-[13.5px] leading-[1.5] text-[#475569]">
                        Read our full community guidelines anytime at{' '}
                        <Link
                          href="/safety"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-[#1D5CE5] underline-offset-2 hover:underline"
                        >
                          /safety
                        </Link>
                        .
                      </span>
                    </span>
                  </li>
                </ul>
              </div>

              {error ? (
                <div
                  role="alert"
                  className="mt-6 rounded-2xl border border-red-500/25 bg-red-50 px-4 py-3 text-[14px] text-red-700"
                  data-testid="onboarding-error"
                >
                  {error}
                </div>
              ) : null}

              <div className="mt-9 grid gap-3 sm:grid-cols-[1fr_1.35fr]">
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  className="h-[54px] rounded-full px-5"
                  onClick={() => {
                    setError('')
                    setStep(1)
                  }}
                  disabled={pending}
                  data-testid="onboarding-back"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  Back
                </Button>
                <Button
                  type="button"
                  size="lg"
                  className="h-[54px] rounded-full px-7"
                  loading={pending}
                  onClick={() => void onComplete()}
                  data-testid="onboarding-complete"
                >
                  Complete
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
