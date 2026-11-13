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
import {
  ONBOARDING_HELPER_PRIVACY,
  ONBOARDING_HELPER_VERIFY_BODY,
  ONBOARDING_HELPER_VERIFY_TITLE,
  VERIFY_TRUST_LINE,
} from '@/lib/verification/constants'
import { loadUsPlacesIndex, searchUsCities, type UsCity } from '@/lib/usPlaces'
import type { AccountRole } from '@/types'
import '@/components/account/account-hc.css'

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

function StepProgress({ step }: { step: 1 | 2 }) {
  return (
    <div className="account-hc-step-meta" aria-label={`Step ${step} of 2`}>
      <p className="n">Step {step} of 2</p>
      <div className="account-hc-step-bars" aria-hidden>
        <i className={step >= 1 ? 'on' : undefined} />
        <i className={step >= 2 ? 'on' : undefined} />
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
        className={`account-hc-card account-hc-benefits flex h-full flex-col ${className}`}
        data-testid="onboarding-benefits"
        data-role="neighbor"
      >
        <p className="account-hc-eyebrow">As a Neighbor</p>
        <h2>Post a job and hire someone nearby</h2>
        <p className="intro">
          Neighbors create job requests. Helpers in your area can then offer to do the work.
        </p>
        <ul className="account-hc-points">
          {NEIGHBOR_POINTS.map((point) => (
            <li key={point}>
              <PointCheck />
              <span>{point}</span>
            </li>
          ))}
        </ul>
        <p className="mt-auto pt-[18px] text-[13px] leading-[1.45] text-[#48556A]">
          You can also help neighbors later if you want. This just sets your starting point.
        </p>
      </aside>
    )
  }

  return (
    <aside
      className={`account-hc-card account-hc-benefits flex h-full flex-col ${className}`}
      data-testid="onboarding-benefits"
      data-role="helper"
    >
      <p className="account-hc-eyebrow">As a Helper</p>
      <h2>Offer on jobs and earn on your schedule</h2>
      <p className="intro">
        Helpers browse nearby requests and offer to do the work. Before you can make an offer, we
        need to confirm you actually live close by.
      </p>
      <ul className="account-hc-points">
        {HELPER_POINTS.map((point) => (
          <li key={point}>
            <PointCheck />
            <span>{point}</span>
          </li>
        ))}
      </ul>

      <div className="account-hc-verify-box mt-auto" data-testid="onboarding-helper-verify">
        <h3>
          <Home className="h-4 w-4 shrink-0 text-[#1D5CE5]" strokeWidth={1.75} aria-hidden />
          {ONBOARDING_HELPER_VERIFY_TITLE}
        </h3>
        <p>{ONBOARDING_HELPER_VERIFY_BODY}</p>
        <p className="trust">{VERIFY_TRUST_LINE}</p>
        <ul>
          {ONBOARDING_HELPER_PRIVACY.map((promise) => (
            <li key={promise}>
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#1D5CE5]" strokeWidth={2.25} aria-hidden />
              <span>{promise}</span>
            </li>
          ))}
        </ul>
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
      <div className="flex min-h-dvh items-center justify-center bg-[#F5F9FF]">
        <p className="text-[22px] font-semibold tracking-tight text-[#071330]">HouseCall</p>
      </div>
    )
  }

  const pageTitle = edit ? 'Change city' : 'Welcome to HouseCall'
  const shellClass = edit
    ? 'account-hc'
    : 'account-hc min-h-dvh'

  return (
    <div className={shellClass} data-testid="onboarding-root" data-step={step} data-edit={edit ? '1' : undefined}>
      {!edit ? (
        <header
          className="sticky top-0 z-30 border-b border-[#E3E8EF] bg-white"
          data-testid="onboarding-header"
        >
          <div
            className={`account-hc-wrap flex h-14 items-center justify-end gap-4 ${
              step === 1 ? '' : 'max-w-[520px]'
            }`}
          >
            <StepProgress step={step} />
          </div>
        </header>
      ) : null}

      <div className={edit ? 'account-hc-wrap account-hc-page' : 'account-hc-wrap pb-10 pt-7 sm:pb-16 sm:pt-10'}>
        {edit ? (
          <div className="account-hc-title-row">
            <h1 className="account-hc-hero-title">{pageTitle}</h1>
            <StepProgress step={step} />
          </div>
        ) : null}

        {step === 1 ? (
          <div
            data-testid="onboarding-step-1"
            className={`account-hc-wizard animate-fade-up ${role ? '' : 'single'}`}
          >
            <div
              className="account-hc-card account-hc-wizard-form min-w-0"
              data-testid="onboarding-form-column"
            >
              {!edit ? (
                <>
                  <h1 className="account-hc-hero-title" style={{ fontSize: 28 }}>
                    Welcome to HouseCall
                  </h1>
                  <p className="account-hc-lede">
                    Choose how you want to use HouseCall and set your city.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="account-hc-hero-title" style={{ fontSize: 22 }}>
                    Welcome to HouseCall
                  </h2>
                  <p className="account-hc-lede">
                    Choose how you want to use HouseCall and set your city.
                  </p>
                </>
              )}

              <p id={`${roleGroupId}-label`} className="account-hc-role-label">
                How you&apos;ll use HouseCall
              </p>
              <div
                role="radiogroup"
                aria-labelledby={`${roleGroupId}-label`}
                className="account-hc-roles"
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
                      className={`account-hc-role ${selected ? 'is-on' : ''}`}
                    >
                      <span className="radio" aria-hidden>
                        {selected ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="t">{item.title}</span>
                        <span className="b">{item.body}</span>
                      </span>
                    </button>
                  )
                })}
              </div>

              {role ? (
                <div className="account-hc-benefits-mobile" data-testid="onboarding-benefits-mobile">
                  <BenefitsPanel role={role} />
                </div>
              ) : null}

              <div className="account-hc-city-field">
                <UsCityCombobox
                  ref={cityRef}
                  value={city}
                  onChange={handleCityChange}
                  error={step1Error && role && !city ? step1Error : undefined}
                />
              </div>

              {step1Error && !role ? (
                <p
                  className="mt-3 text-[13px] font-medium text-[#DC2626]"
                  role="alert"
                  data-testid="onboarding-step1-error"
                >
                  {step1Error}
                </p>
              ) : null}

              <div className="account-hc-continue-wrap">
                <Button
                  type="button"
                  size="lg"
                  aria-disabled={!canNext}
                  onClick={onStep1Continue}
                  data-testid="onboarding-next"
                  className={`account-hc-btn account-hc-btn-lg w-full shadow-none !transition-[background-color] disabled:opacity-100 ${
                    canNext
                      ? 'bg-[#1D5CE5] text-white hover:bg-[#1649BD]'
                      : 'bg-[#E3E8EF] text-[#6B7384] hover:bg-[#D7E0EC]'
                  }`}
                >
                  Continue
                </Button>

                {showAccountEscape ? (
                  <p className="mt-[22px] text-center text-[13px] text-[#48556A]">
                    Not your account?{' '}
                    <button
                      type="button"
                      className="font-medium text-[#48556A] transition hover:text-[#071330]"
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
              <div className="account-hc-benefits-desktop min-h-0" data-testid="onboarding-benefits-desktop">
                <BenefitsPanel role={role} className="flex-1" />
              </div>
            ) : null}
          </div>
        ) : (
          <div
            data-testid="onboarding-step-2"
            className="account-hc-wizard single animate-fade-up"
          >
            <div className="account-hc-card account-hc-rules">
              <h1 className="account-hc-hero-title" style={{ fontSize: 28 }}>
                Our community rules
              </h1>
              <p className="account-hc-lede">
                Before continuing, please agree to keep HouseCall safe for everyone.
              </p>

              <div className="account-hc-rules-callout" data-testid="onboarding-safety-callout">
                <p className="t">
                  Posting illegal content or listing sexual services is strictly prohibited.
                </p>
                <p className="b">
                  Violating listings are removed immediately and accounts are suspended.
                </p>
              </div>

              <p className="account-hc-rules-legal">
                HouseCall is for everyday local help: Home, Auto, Junk Removal, Pets, and Other casual
                tasks. The same safety exclusions apply to custom Other requests.{' '}
                <Link
                  href="/safety"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Community guidelines
                </Link>
              </p>

              {error ? (
                <div
                  role="alert"
                  className="mt-6 rounded-[10px] border border-[#DC2626]/25 bg-[#FEF2F2] px-4 py-3 text-[14px] text-[#DC2626]"
                  data-testid="onboarding-error"
                >
                  {error}
                </div>
              ) : null}

              <div className="account-hc-rules-actions">
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  className="account-hc-btn account-hc-btn-secondary account-hc-btn-lg shadow-none"
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
                  className="account-hc-btn account-hc-btn-lg bg-[#1D5CE5] text-white shadow-none hover:bg-[#1649BD]"
                  loading={pending}
                  onClick={() => void onComplete()}
                  data-testid="onboarding-complete"
                >
                  Agree and continue
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      {!edit ? <LandingFooter /> : null}
    </div>
  )
}
