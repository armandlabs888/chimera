'use client'

import { ArrowLeft, Check, Home } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { LandingFooter } from '@/components/landing/LandingFooter'
import {
  UsCityCombobox,
  type UsCityComboboxHandle,
} from '@/components/onboarding/UsCityCombobox'
import { Button } from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import { loadUsPlacesIndex, searchUsCities, type UsCity } from '@/lib/usPlaces'
import type { AccountRole } from '@/types'

const SAFETY_VERSION = 'v1'

const ROLES: {
  id: AccountRole
  title: string
  body: string
}[] = [
  {
    id: 'customer',
    title: 'Neighbor',
    body: 'Post a job request and hire local help.',
  },
  {
    id: 'helper',
    title: 'Helper',
    body: 'Offer on nearby jobs and earn on your schedule.',
  },
]

const NEIGHBOR_POINTS = [
  'Create a job request and set your budget.',
  'Review offers from people who live nearby.',
  "Coordinate in Messages and hire when you're ready.",
  'No address verification is needed to post a job.',
] as const

const HELPER_POINTS = [
  'Browse job requests in your area.',
  'Make an offer when a job is a good fit.',
  "Coordinate in Messages once you're hired.",
] as const

const HELPER_PRIVACY = [
  'Your exact address is never displayed to other users.',
  'We will never sell your address.',
  "It's only used to match you with jobs nearby.",
] as const

function StepProgress({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex flex-col items-end gap-2" aria-label={`Step ${step} of 2`}>
      <p className="text-[13px] font-semibold tabular-nums text-[#5B6575]">Step {step} of 2</p>
      <div className="flex gap-1.5" aria-hidden>
        <span
          className={`h-1 w-10 rounded-full sm:w-12 ${
            step >= 1 ? 'bg-[#1D5CE5]' : 'bg-[#E2E8F0]'
          }`}
        />
        <span
          className={`h-1 w-10 rounded-full sm:w-12 ${
            step >= 2 ? 'bg-[#1D5CE5]' : 'bg-[#E2E8F0]'
          }`}
        />
      </div>
    </div>
  )
}

function PointCheck({ size = 18 }: { size?: number }) {
  return (
    <span
      className="mt-0.5 inline-flex shrink-0 items-center justify-center rounded-full bg-[#1D5CE5] text-white"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Check className={size <= 16 ? 'h-2.5 w-2.5' : 'h-3 w-3'} strokeWidth={3} />
    </span>
  )
}

function BenefitsPanel({
  role,
  className = '',
}: {
  role: AccountRole
  className?: string
}) {
  if (role === 'customer') {
    return (
      <aside
        className={`flex h-full flex-col rounded-[14px] border border-[#E3E8EF] bg-[#F4F8FD] px-5 py-5 sm:px-8 sm:py-8 ${className}`}
        data-testid="onboarding-benefits"
        data-role="neighbor"
      >
        <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-[#1D5CE5]">
          As a Neighbor
        </p>
        <h2 className="mt-2 font-display text-[20px] font-bold leading-[1.22] tracking-[-0.028em] text-[#071330] sm:text-[24px] text-balance">
          Post a job and hire someone nearby
        </h2>
        <p className="mt-2.5 text-[15px] leading-[1.5] text-[#273449]">
          Neighbors create job requests. Helpers in your area can then offer to do the work.
        </p>
        <ul className="mt-5 flex flex-col gap-3.5 sm:mt-[22px]">
          {NEIGHBOR_POINTS.map((point) => (
            <li
              key={point}
              className="flex items-start gap-3 text-[15px] font-medium leading-[1.45] text-[#273449]"
            >
              <PointCheck />
              <span>{point}</span>
            </li>
          ))}
        </ul>
        <p className="mt-auto pt-[18px] text-[13px] leading-[1.45] text-[#5B6575]">
          You can also help neighbors later if you want. This just sets your starting point.
        </p>
      </aside>
    )
  }

  return (
    <aside
      className={`flex h-full flex-col rounded-[14px] border border-[#E3E8EF] bg-[#F4F8FD] px-5 py-5 sm:px-8 sm:py-8 ${className}`}
      data-testid="onboarding-benefits"
      data-role="helper"
    >
      <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-[#1D5CE5]">
        As a Helper
      </p>
      <h2 className="mt-2 font-display text-[20px] font-bold leading-[1.22] tracking-[-0.028em] text-[#071330] sm:text-[24px] text-balance">
        Offer on jobs and earn on your schedule
      </h2>
      <p className="mt-2.5 text-[15px] leading-[1.5] text-[#273449]">
        Helpers browse nearby requests and offer to do the work. To perform a job, we need to
        confirm you actually live close by.
      </p>
      <ul className="mt-5 flex flex-col gap-3.5 sm:mt-[22px]">
        {HELPER_POINTS.map((point) => (
          <li
            key={point}
            className="flex items-start gap-3 text-[15px] font-medium leading-[1.45] text-[#273449]"
          >
            <PointCheck />
            <span>{point}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-[22px]" data-testid="onboarding-helper-verify">
        <div className="rounded-xl border-[1.5px] border-[#D5DEEA] bg-white px-[18px] pb-4 pt-[18px]">
          <h3 className="flex items-center gap-2 text-[14.5px] font-bold tracking-[-0.015em] text-[#071330]">
            <Home className="h-4 w-4 shrink-0 text-[#1D5CE5]" strokeWidth={1.75} aria-hidden />
            Address verification is required to perform a job
          </h3>
          <p className="mt-2 text-[13.5px] leading-[1.5] text-[#273449]">
            You'll need your home address and a document that proves you live there, such as a
            recent utility bill, lease, or official mail. You'll be asked for this before you start
            a job, not on this step.
          </p>
          <p className="mt-2.5 text-[13.5px] font-semibold leading-[1.45] tracking-[-0.01em] text-[#071330]">
            This helps ensure trust and safety for everyone involved.
          </p>
          <ul className="mt-3.5 flex flex-col gap-2 border-t border-[#E3E8EF] pt-3.5">
            {HELPER_PRIVACY.map((promise) => (
              <li
                key={promise}
                className="flex items-start gap-2 text-[13px] font-medium leading-[1.45] text-[#273449]"
              >
                <Check
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#1D5CE5]"
                  strokeWidth={2.25}
                  aria-hidden
                />
                <span>{promise}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  )
}

export function Onboarding() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preview = searchParams.get('preview') === '1'
  const edit = searchParams.get('edit') === '1'
  const { mode, ready, authUser, currentUser, completeOnboarding, signOut } = useBeam()

  const roleGroupId = useId()
  const cityRef = useRef<UsCityComboboxHandle>(null)
  const hydratedRef = useRef(false)
  const [step, setStep] = useState<1 | 2>(1)
  const [role, setRole] = useState<AccountRole | null>(null)
  const [city, setCity] = useState<UsCity | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [step1Error, setStep1Error] = useState('')

  const alreadyOnboarded = Boolean(currentUser.onboardingCompletedAt)
  const showAccountEscape =
    mode === 'live' && Boolean(authUser) && !edit && !alreadyOnboarded

  useEffect(() => {
    if (!ready) return
    // Live users who finished onboarding leave /onboarding unless previewing or editing.
    if (mode === 'live' && authUser && alreadyOnboarded && !preview && !edit) {
      router.replace('/browse')
    }
  }, [ready, mode, authUser, alreadyOnboarded, preview, edit, router])

  useEffect(() => {
    if (!ready) return
    // Live guests cannot start onboarding — send them to sign up.
    if (mode === 'live' && !authUser && !preview) {
      router.replace('/auth?mode=signup&next=%2Fonboarding')
    }
  }, [ready, mode, authUser, preview, router])

  useEffect(() => {
    if (!ready || hydratedRef.current) return
    const savedRole = currentUser.accountRole
    const savedCity = currentUser.city
    const savedState = currentUser.stateCode
    if (!savedRole && !savedCity) return
    hydratedRef.current = true

    if (savedRole === 'customer' || savedRole === 'helper') {
      setRole(savedRole)
    }

    if (savedCity && savedState) {
      void loadUsPlacesIndex()
        .then(() => {
          const q = `${savedCity}, ${savedState}`
          const results = searchUsCities(q, 8)
          const match =
            results.find(
              (c) =>
                c.name.toLowerCase() === savedCity.toLowerCase() &&
                c.stateCode.toUpperCase() === savedState.toUpperCase(),
            ) ??
            results.find((c) => c.label.toLowerCase() === q.toLowerCase()) ??
            null
          if (match) setCity(match)
        })
        .catch(() => {
          /* city index optional for hydrate */
        })
    }
  }, [ready, currentUser.accountRole, currentUser.city, currentUser.stateCode])

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

  function onStep1Continue() {
    if (!role) {
      setStep1Error('Choose Neighbor or Helper to continue.')
      return
    }

    const resolvedCity = city ?? cityRef.current?.tryCommitQuery() ?? null
    if (!resolvedCity) {
      setStep1Error('Select your US city to continue.')
      cityRef.current?.focusAndOpen()
      return
    }

    setCity(resolvedCity)
    setStep1Error('')
    setStep(2)
  }

  function handleCityChange(next: UsCity | null) {
    setCity(next)
    if (next) setStep1Error('')
  }

  function handleRoleSelect(next: AccountRole) {
    setRole(next)
    setStep1Error('')
  }

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
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' &&
              err !== null &&
              'message' in err &&
              typeof (err as { message: unknown }).message === 'string'
            ? (err as { message: string }).message
            : 'Could not finish onboarding'
      setError(message)
      setPending(false)
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
    <div className="min-h-dvh bg-white text-[#071330]" data-testid="onboarding-root" data-step={step}>
      <header
        className="sticky top-0 z-30 border-b border-[rgba(7,19,48,0.08)] bg-white/95 backdrop-blur-md"
        data-testid="onboarding-header"
      >
        <div
          className={`mx-auto flex h-12 items-center justify-end gap-4 px-5 sm:h-14 ${
            step === 1
              ? 'max-w-[1080px] sm:px-10'
              : 'max-w-[480px] sm:px-6'
          }`}
        >
          <StepProgress step={step} />
        </div>
      </header>

      {step === 1 ? (
        <main className="mx-auto w-full max-w-[1080px] flex-1 px-5 pb-10 pt-7 sm:px-10 sm:pb-16 sm:pt-14">
          {/*
            Two column wrappers (matches approved mockup):
            - Desktop: left form column + right benefits column (items-stretch).
            - Mobile: benefits render inside the form between roles and City.
            Avoid per-field grid + row-end:-1 (that only spanned the first row).
          */}
          <div
            data-testid="onboarding-step-1"
            className="animate-fade-up lg:grid lg:grid-cols-2 lg:items-stretch lg:gap-14"
          >
            <div className="min-w-0" data-testid="onboarding-form-column">
              <h1 className="font-display text-[26px] font-bold leading-[1.15] tracking-[-0.028em] text-[#071330] text-balance sm:text-[32px]">
                Welcome to Beam
              </h1>
              <p className="mt-2.5 max-w-[42ch] text-[15px] leading-[1.5] text-[#3D4A5F] sm:mt-3 sm:text-[15.5px]">
                Choose how you want to use Beam and set your city.
              </p>

              <div className="mt-6 sm:mt-8">
                <p
                  id={`${roleGroupId}-label`}
                  className="mb-2.5 text-[13px] font-semibold text-[#273449]"
                >
                  How you'll use Beam
                </p>
                <div
                  role="radiogroup"
                  aria-labelledby={`${roleGroupId}-label`}
                  className="grid gap-2.5"
                  data-testid="onboarding-role-group"
                >
                  {ROLES.map((item) => {
                    const selected = role === item.id
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        tabIndex={role === null ? 0 : selected ? 0 : -1}
                        onClick={() => handleRoleSelect(item.id)}
                        onKeyDown={(e) => {
                          if (role) onRoleKeyDown(e, role)
                          else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                            e.preventDefault()
                            handleRoleSelect(item.id === 'customer' ? 'helper' : 'customer')
                          }
                        }}
                        data-testid={`onboarding-role-${item.id}`}
                        className={`flex items-start gap-3.5 rounded-[10px] border-[1.5px] px-4 py-4 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1D5CE5]/25 ${
                          selected
                            ? 'border-[#1D5CE5] bg-[#F5F9FF] shadow-[0_0_0_1px_rgba(29,92,229,0.18)]'
                            : 'border-[#E3E8EF] bg-white hover:border-[#C5CDD8] hover:bg-[#F8FAFC]'
                        }`}
                      >
                        <span
                          className={`mt-px inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                            selected
                              ? 'border-[#1D5CE5] bg-[#1D5CE5] text-white'
                              : 'border-[#CBD5E1] bg-white'
                          }`}
                          aria-hidden
                        >
                          {selected ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[16px] font-bold tracking-[-0.015em] text-[#071330]">
                            {item.title}
                          </span>
                          <span className="mt-[3px] block text-[13.5px] leading-[1.45] text-[#3D4A5F]">
                            {item.body}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {role ? (
                <div className="mt-[18px] mb-1.5 lg:hidden" data-testid="onboarding-benefits-mobile">
                  <BenefitsPanel role={role} />
                </div>
              ) : null}

              <div className="mt-[22px] sm:mt-7">
                <UsCityCombobox
                  ref={cityRef}
                  value={city}
                  onChange={handleCityChange}
                  error={step1Error && role && !city ? step1Error : undefined}
                />
              </div>

              {step1Error && !role ? (
                <p
                  className="mt-3 text-[13px] font-medium text-red-600"
                  role="alert"
                  data-testid="onboarding-step1-error"
                >
                  {step1Error}
                </p>
              ) : null}

              <div className="mt-7">
                <Button
                  type="button"
                  size="lg"
                  aria-disabled={!canNext}
                  onClick={onStep1Continue}
                  data-testid="onboarding-next"
                  className={`h-[52px] w-full rounded-[10px] px-7 text-[15px] font-semibold tracking-[-0.01em] shadow-none !transition-[background-color] disabled:opacity-100 ${
                    canNext
                      ? 'bg-[#1D5CE5] text-white hover:bg-[#1649BD]'
                      : 'bg-[#E2E8F0] text-[#64748B] hover:bg-[#CBD5E1]'
                  }`}
                >
                  Continue
                </Button>

                {showAccountEscape ? (
                  <p className="mt-[22px] text-center text-[13px] text-[#5B6575]">
                    Not your account?{' '}
                    <button
                      type="button"
                      className="font-medium text-[#5B6575] transition hover:text-[#071330]"
                      data-testid="onboarding-sign-out"
                      onClick={() => void signOut()}
                    >
                      Sign out
                    </button>
                  </p>
                ) : null}
              </div>
            </div>

            {role ? (
              <div className="hidden min-h-0 lg:flex lg:flex-col" data-testid="onboarding-benefits-desktop">
                <BenefitsPanel role={role} className="flex-1" />
              </div>
            ) : null}
          </div>
        </main>
      ) : (
        <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col px-5 pb-10 pt-8 sm:px-6 sm:pt-12 lg:pt-16">
          <div data-testid="onboarding-step-2" className="animate-fade-up">
            <h1 className="font-display text-[28px] font-bold leading-[1.15] tracking-[-0.025em] text-[#071330] sm:text-[32px]">
              Our community rules
            </h1>
            <p className="mt-3 text-[15px] leading-[1.5] text-[#526077]">
              Before continuing, please agree to keep Beam safe for everyone.
            </p>

            <div
              className="mt-8 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-5 py-5"
              data-testid="onboarding-safety-callout"
            >
              <p className="text-[16px] font-bold leading-[1.4] text-[#071330]">
                Posting illegal content or listing sexual services is strictly prohibited.
              </p>
              <p className="mt-2.5 text-[15px] leading-[1.5] text-[#526077]">
                Violating listings are removed immediately and accounts are suspended.
              </p>
            </div>

            <p className="mt-5 text-[14px] leading-[1.55] text-[#64748B]">
              Beam is for everyday local help — Home, Auto, Junk Removal, Pets, and Other casual
              tasks. The same safety exclusions apply to custom Other requests.{' '}
              <Link
                href="/safety"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#1D5CE5] underline-offset-2 hover:underline"
              >
                Community guidelines
              </Link>
            </p>

            {error ? (
              <div
                role="alert"
                className="mt-6 rounded-lg border border-red-500/25 bg-red-50 px-4 py-3 text-[14px] text-red-700"
                data-testid="onboarding-error"
              >
                {error}
              </div>
            ) : null}

            <div className="mt-9 grid gap-3 sm:grid-cols-[1fr_1.4fr]">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                className="h-[52px] rounded-lg px-5 shadow-none"
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
                className="h-[52px] rounded-lg bg-[#1D5CE5] px-7 text-white shadow-none hover:bg-[#1649BD]"
                loading={pending}
                onClick={() => void onComplete()}
                data-testid="onboarding-complete"
              >
                Agree and continue
              </Button>
            </div>
          </div>
        </main>
      )}
      <LandingFooter />
    </div>
  )
}
