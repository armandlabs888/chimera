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
import { ConfirmPhoneStep } from '@/components/onboarding/ConfirmPhoneStep'
import { JobAlertsStep } from '@/components/onboarding/JobAlertsStep'
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
import {
  onboardingRulesStepNumber,
  onboardingStepTotal,
} from '@/lib/phone/onboardingGate'
import {
  collapseNameWhitespace,
  parseRealName,
  REAL_NAME_ERROR,
  splitValidExistingName,
} from '@/lib/realName'
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
  'Create a job request and set your price.',
  'Review offers from people who live nearby.',
  "Coordinate in Messages and hire when you're ready.",
  'No address verification is needed to post a job.',
] as const

const HELPER_POINTS = [
  'Browse job requests in your area.',
  'Make an offer when a job is a good fit.',
  "Coordinate in Messages once you're hired.",
] as const

function StepProgress({
  step,
  total,
}: {
  step: number
  total: number
}) {
  return (
    <div
      className="account-hc-step-meta"
      aria-label={`Step ${step} of ${total}`}
      data-testid="onboarding-step-progress"
    >
      <p className="n">
        Step {step} of {total}
      </p>
      <div className="account-hc-step-bars" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <i key={i} className={step >= i + 1 ? 'on' : undefined} />
        ))}
      </div>
    </div>
  )
}

type OnboardingStep = 'welcome' | 'phone' | 'alerts' | 'rules'

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
  const {
    mode,
    ready,
    authUser,
    currentUser,
    completeOnboarding,
    signOut,
    helperVerification,
  } = useBeam()

  const roleGroupId = useId()
  const firstNameId = useId()
  const lastNameId = useId()
  const cityRef = useRef<UsCityComboboxHandle>(null)
  const hydratedRef = useRef(false)
  const nameHydratedRef = useRef(false)
  const [step, setStep] = useState<OnboardingStep>('welcome')
  const [role, setRole] = useState<AccountRole | null>(null)
  const [city, setCity] = useState<UsCity | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [nameError, setNameError] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [step1Error, setStep1Error] = useState('')
  const [maskedPhone, setMaskedPhone] = useState('')
  const [phoneE164, setPhoneE164] = useState('')
  // null = still probing session API; default off so missing Twilio never blocks signup.
  const [phoneConfirmEnabled, setPhoneConfirmEnabled] = useState<boolean | null>(null)

  const alreadyOnboarded = Boolean(currentUser.onboardingCompletedAt)
  const showAccountEscape =
    mode === 'live' && Boolean(authUser) && !edit && !alreadyOnboarded
  const demoMode = mode === 'demo' || preview
  const isHelper = role === 'helper'
  const phoneStepsOn = Boolean(phoneConfirmEnabled)
  // Without Twilio, keep the original 2-step flow (welcome + rules).
  const totalSteps = onboardingStepTotal({
    edit,
    isHelper,
    phoneConfirmEnabled: phoneStepsOn,
  })
  const rulesStepNumber = onboardingRulesStepNumber({
    edit,
    isHelper,
    phoneConfirmEnabled: phoneStepsOn,
  })
  const locationVerified = helperVerification?.status === 'approved'

  useEffect(() => {
    let cancelled = false
    void fetch('/api/phone/session')
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          phoneConfirmEnabled?: boolean
          twilioMissing?: boolean
          status?: string
        }
        if (cancelled) return
        if (typeof data.phoneConfirmEnabled === 'boolean') {
          setPhoneConfirmEnabled(data.phoneConfirmEnabled)
          return
        }
        if (data.twilioMissing || data.status === 'disabled') {
          setPhoneConfirmEnabled(false)
          return
        }
        // Auth errors without a flag: treat as disabled so signup stays open.
        setPhoneConfirmEnabled(res.ok)
      })
      .catch(() => {
        if (!cancelled) setPhoneConfirmEnabled(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    // If Twilio is off mid-flow, drop phone/alerts and land on rules or welcome.
    if (phoneConfirmEnabled !== false) return
    if (step === 'phone' || step === 'alerts') setStep('rules')
  }, [phoneConfirmEnabled, step])

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
    if (!ready || nameHydratedRef.current) return
    // Prefill from an existing real profile name, or Google OAuth metadata.
    // Email signup no longer collects a name, so those fields stay empty.
    const md = (authUser?.user_metadata ?? {}) as Record<string, unknown>
    const metaFull =
      (typeof md.full_name === 'string' && md.full_name) ||
      (typeof md.name === 'string' && md.name) ||
      ''
    const fromProfile = splitValidExistingName(currentUser.name)
    const fromMeta = splitValidExistingName(metaFull)
    const prefill = fromProfile ?? fromMeta
    if (prefill) {
      setFirstName(prefill.firstName)
      setLastName(prefill.lastName)
    }
    nameHydratedRef.current = true
  }, [ready, currentUser.name, authUser])

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

  const nameParsed = parseRealName(firstName, lastName)
  const nameReady = nameParsed.ok
  const canNext = Boolean(role && city && nameReady)

  function onStep1Continue() {
    if (!role) {
      setStep1Error('Choose Neighbor or Helper to continue.')
      return
    }

    const parsed = parseRealName(firstName, lastName)
    if (!parsed.ok) {
      setNameError(REAL_NAME_ERROR)
      setStep1Error('')
      return
    }

    const resolvedCity = city ?? cityRef.current?.tryCommitQuery() ?? null
    if (!resolvedCity) {
      setStep1Error('Select your US city to continue.')
      cityRef.current?.focusAndOpen()
      return
    }

    setCity(resolvedCity)
    setFirstName(parsed.value.firstName)
    setLastName(parsed.value.lastName)
    setNameError('')
    setStep1Error('')
    // Edit city, or Twilio not configured: skip phone/alerts.
    if (edit || !phoneStepsOn) {
      setStep('rules')
      return
    }
    setStep('phone')
  }

  function handleCityChange(next: UsCity | null) {
    setCity(next)
    if (next) setStep1Error('')
  }

  function handleRoleSelect(next: AccountRole) {
    setRole(next)
    setStep1Error('')
  }

  function handleNameChange(which: 'first' | 'last', value: string) {
    if (which === 'first') setFirstName(value)
    else setLastName(value)
    if (nameError) setNameError('')
  }

  function handleNameBlur() {
    const first = collapseNameWhitespace(firstName)
    const last = collapseNameWhitespace(lastName)
    // Wait until both parts are present so tabbing first -> last is not noisy.
    if (!first || !last) return
    const parsed = parseRealName(firstName, lastName)
    if (!parsed.ok) setNameError(REAL_NAME_ERROR)
    else setNameError('')
  }

  async function onComplete() {
    if (!role || !city) return
    const parsed = parseRealName(firstName, lastName)
    if (!parsed.ok) {
      setNameError(REAL_NAME_ERROR)
      setStep('welcome')
      return
    }
    setPending(true)
    setError('')
    try {
      // Preview guest walkthrough skips the live RPC; demo + signed-in live persist.
      if (mode === 'demo' || (mode === 'live' && authUser)) {
        await completeOnboarding({
          role,
          city: city.name,
          stateCode: city.stateCode,
          firstName: parsed.value.firstName,
          lastName: parsed.value.lastName,
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
      if (message === REAL_NAME_ERROR) {
        setNameError(REAL_NAME_ERROR)
        setStep('welcome')
        setPending(false)
        return
      }
      setError(message)
      setPending(false)
    }
  }

  if (!ready) {
    return (
      <div className="account-hc min-h-dvh" data-testid="onboarding-loading" aria-busy="true">
        <div className="account-hc-wrap account-hc-onboarding-page">
          <div className="h-8 w-48 animate-pulse rounded-md bg-[#E8EEF7]" />
          <div className="mt-3 h-4 w-72 max-w-full animate-pulse rounded-md bg-[#E8EEF7]" />
          <div className="mt-8 h-40 w-full animate-pulse rounded-lg bg-[#E8EEF7]" />
        </div>
      </div>
    )
  }

  const pageTitle = edit ? 'Change city' : 'Welcome to BlockSide'
  const shellClass = edit
    ? 'account-hc'
    : 'account-hc min-h-dvh'

  return (
    <div
      className={shellClass}
      data-testid="onboarding-root"
      data-step={step}
      data-edit={edit ? '1' : undefined}
    >
      <div className={edit ? 'account-hc-wrap account-hc-page' : 'account-hc-wrap account-hc-onboarding-page'}>
        {edit ? (
          <div className="account-hc-title-row">
            <h1 className="account-hc-hero-title">{pageTitle}</h1>
            <StepProgress step={step === 'welcome' ? 1 : 2} total={2} />
          </div>
        ) : null}

        {step === 'welcome' ? (
          <div
            data-testid="onboarding-step-1"
            className={`account-hc-wizard animate-fade-up ${role ? '' : 'single'}`}
          >
            <div
              className="account-hc-card account-hc-wizard-form min-w-0"
              data-testid="onboarding-form-column"
            >
              {!edit ? <StepProgress step={1} total={totalSteps} /> : null}

              {!edit ? (
                <>
                  <h1 className="account-hc-hero-title" style={{ fontSize: 28 }}>
                    Welcome to BlockSide
                  </h1>
                  <p className="account-hc-lede">
                    Choose how you want to use BlockSide and set your city.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="account-hc-hero-title" style={{ fontSize: 22 }}>
                    Welcome to BlockSide
                  </h2>
                  <p className="account-hc-lede">
                    Choose how you want to use BlockSide and set your city.
                  </p>
                </>
              )}

              <p id={`${roleGroupId}-label`} className="account-hc-role-label">
                How you&apos;ll use BlockSide
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

              <div className="account-hc-name-field" data-testid="onboarding-name-field">
                <p className="account-hc-label" id={`${firstNameId}-label`}>
                  Your full name
                </p>
                <div className="account-hc-name-grid">
                  <div>
                    <label htmlFor={firstNameId} className="sr-only">
                      First name
                    </label>
                    <input
                      id={firstNameId}
                      type="text"
                      name="given-name"
                      autoComplete="given-name"
                      placeholder="First name"
                      value={firstName}
                      onChange={(e) => handleNameChange('first', e.target.value)}
                      onBlur={handleNameBlur}
                      aria-invalid={nameError ? true : undefined}
                      aria-describedby={
                        nameError
                          ? `${firstNameId}-error`
                          : `${firstNameId}-hint`
                      }
                      data-testid="onboarding-first-name"
                      className={`account-hc-input ${nameError ? 'is-error' : ''}`}
                    />
                  </div>
                  <div>
                    <label htmlFor={lastNameId} className="sr-only">
                      Last name
                    </label>
                    <input
                      id={lastNameId}
                      type="text"
                      name="family-name"
                      autoComplete="family-name"
                      placeholder="Last name"
                      value={lastName}
                      onChange={(e) => handleNameChange('last', e.target.value)}
                      onBlur={handleNameBlur}
                      aria-invalid={nameError ? true : undefined}
                      aria-describedby={
                        nameError
                          ? `${firstNameId}-error`
                          : `${firstNameId}-hint`
                      }
                      data-testid="onboarding-last-name"
                      className={`account-hc-input ${nameError ? 'is-error' : ''}`}
                    />
                  </div>
                </div>
                {nameError ? (
                  <p
                    id={`${firstNameId}-error`}
                    className="account-hc-name-error"
                    role="alert"
                    data-testid="onboarding-name-error"
                  >
                    {nameError}
                  </p>
                ) : (
                  <p
                    id={`${firstNameId}-hint`}
                    className="account-hc-name-hint"
                    data-testid="onboarding-name-hint"
                  >
                    Use your real first and last name. Aliases and nicknames are not allowed.
                  </p>
                )}
              </div>

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
                  className="mt-3 rounded-lg border border-[#D7E0EC] bg-white px-3 py-2 text-[13px] font-medium text-[#071330]"
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
                  variant={canNext ? 'primary' : 'secondary'}
                  aria-disabled={!canNext}
                  onClick={onStep1Continue}
                  data-testid="onboarding-next"
                  className={`account-hc-btn account-hc-btn-lg w-full shadow-none !transition-[background-color] disabled:opacity-100 ${
                    canNext
                      ? '!bg-[#1D5CE5] !text-white hover:!bg-[#1649BD]'
                      : '!bg-[#E3E8EF] !text-[#4A5568] hover:!bg-[#D7E0EC]'
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
        ) : null}

        {step === 'phone' && !edit && phoneStepsOn ? (
          <ConfirmPhoneStep
            stepLabel={`Step 2 of ${totalSteps}`}
            step={2}
            total={totalSteps}
            demoMode={demoMode}
            onBack={() => setStep('welcome')}
            onContinue={(info) => {
              setMaskedPhone(info.maskedPhone)
              setPhoneE164(info.phoneE164 || '')
              if (isHelper) setStep('alerts')
              else setStep('rules')
            }}
          />
        ) : null}

        {step === 'alerts' && !edit && isHelper && phoneStepsOn ? (
          <JobAlertsStep
            stepLabel={`Step 3 of ${totalSteps}`}
            step={3}
            total={totalSteps}
            maskedPhone={maskedPhone || '+1•••••0000'}
            phoneE164={phoneE164}
            locationVerified={locationVerified}
            demoMode={demoMode}
            onBack={() => setStep('phone')}
            onSkip={() => setStep('rules')}
            onEnabled={() => setStep('rules')}
          />
        ) : null}

        {step === 'rules' ? (
          <div
            data-testid="onboarding-step-2"
            className="account-hc-wizard single animate-fade-up"
          >
            <div className="account-hc-card account-hc-rules">
              {!edit ? (
                <StepProgress step={rulesStepNumber} total={totalSteps} />
              ) : null}
              <h1 className="account-hc-hero-title" style={{ fontSize: 28 }}>
                Our community rules
              </h1>
              <p className="account-hc-lede">
                Before continuing, please agree to keep BlockSide safe for everyone.
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
                BlockSide is for everyday local help: Home, Auto, Junk Removal, Pets, and Other casual
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
                  className="mt-6 rounded-[10px] border border-[#D7E0EC] bg-white px-4 py-3 text-[14px] text-[#071330]"
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
                    if (edit || !phoneStepsOn) {
                      setStep('welcome')
                      return
                    }
                    if (isHelper) setStep('alerts')
                    else setStep('phone')
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
        ) : null}
      </div>
      {!edit ? <LandingFooter /> : null}
    </div>
  )
}
