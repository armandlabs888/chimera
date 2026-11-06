'use client'

import { ArrowLeft, Check } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { BeamWordmark } from '@/components/BeamMark'
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
    title: 'Customer',
    body: 'Post tasks and hire local help.',
  },
  {
    id: 'helper',
    title: 'Helper',
    body: 'Browse requests and earn on your schedule.',
  },
]

function StepProgress({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex flex-col items-end gap-2" aria-label={`Step ${step} of 2`}>
      <p className="text-[13px] font-semibold tabular-nums text-[#64748B]">Step {step} of 2</p>
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

  const isPreviewOrDemo = mode === 'demo' || preview
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
      setStep1Error('Choose Customer or Helper to continue.')
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
      <header className="sticky top-0 z-30 border-b border-[rgba(7,19,48,0.08)] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[480px] items-center justify-between gap-4 px-5 sm:h-16 sm:px-6">
          <Link href={isPreviewOrDemo ? '/browse' : '/'} aria-label="Beam home">
            <BeamWordmark markWidth={24} markHeight={24} wordClassName="text-[20px]" tone="ink" />
          </Link>
          <StepProgress step={step} />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col px-5 pb-10 pt-8 sm:px-6 sm:pt-12 lg:pt-16">
        {step === 1 ? (
          <div data-testid="onboarding-step-1" className="animate-fade-up">
            <h1 className="font-display text-[28px] font-bold leading-[1.15] tracking-[-0.025em] text-[#071330] sm:text-[32px]">
              Welcome to Beam
            </h1>
            <p className="mt-3 text-[15px] leading-[1.5] text-[#526077]">
              Choose how you want to use Beam and set your city.
            </p>

            <div className="mt-8">
              <p
                id={`${roleGroupId}-label`}
                className="mb-3 text-[13px] font-semibold text-[#475569]"
              >
                Role
              </p>
              <div
                role="radiogroup"
                aria-labelledby={`${roleGroupId}-label`}
                className="grid gap-3"
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
                      className={`flex items-center gap-3.5 rounded-2xl border px-4 py-4 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1D5CE5]/25 ${
                        selected
                          ? 'border-[#1D5CE5] bg-[#F5F9FF] ring-1 ring-[#1D5CE5]/20'
                          : 'border-[#E2E8F0] bg-white hover:border-[#CBD5E1] hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <span
                        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                          selected
                            ? 'border-[#1D5CE5] bg-[#1D5CE5] text-white'
                            : 'border-[#CBD5E1] bg-white'
                        }`}
                        aria-hidden
                      >
                        {selected ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[16px] font-bold text-[#071330]">{item.title}</span>
                        <span className="mt-0.5 block text-[14px] leading-[1.45] text-[#526077]">
                          {item.body}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-8">
              <UsCityCombobox
                ref={cityRef}
                value={city}
                onChange={handleCityChange}
                error={
                  step1Error && role && !city ? step1Error : undefined
                }
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

            <div className="mt-9">
              <Button
                type="button"
                size="lg"
                aria-disabled={!canNext}
                onClick={onStep1Continue}
                data-testid="onboarding-next"
                className={`h-[52px] w-full rounded-full px-7 text-[15px] shadow-none !transition-[background-color] disabled:opacity-100 ${
                  canNext
                    ? 'bg-[#1D5CE5] text-white hover:bg-[#1649BD]'
                    : 'bg-[#E2E8F0] text-[#64748B] hover:bg-[#CBD5E1]'
                }`}
              >
                Continue
              </Button>
            </div>

            {showAccountEscape ? (
              <p className="mt-6 text-center text-[13px] text-[#64748B]">
                Not your account?{' '}
                <button
                  type="button"
                  className="font-medium text-[#64748B] underline-offset-2 transition hover:text-[#071330] hover:underline"
                  data-testid="onboarding-sign-out"
                  onClick={() => void signOut()}
                >
                  Sign out
                </button>
              </p>
            ) : null}
          </div>
        ) : (
          <div data-testid="onboarding-step-2" className="animate-fade-up">
            <h1 className="font-display text-[28px] font-bold leading-[1.15] tracking-[-0.025em] text-[#071330] sm:text-[32px]">
              Our community rules
            </h1>
            <p className="mt-3 text-[15px] leading-[1.5] text-[#526077]">
              Before continuing, please agree to keep Beam safe for everyone.
            </p>

            <div
              className="mt-8 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-5 py-5"
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
              Beam is strictly for 6 everyday categories — moving &amp; lifting, home cleaning,
              handyman &amp; assembly, pet care, tutoring &amp; tech help, and events &amp; photo.{' '}
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
                className="mt-6 rounded-2xl border border-red-500/25 bg-red-50 px-4 py-3 text-[14px] text-red-700"
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
                className="h-[52px] rounded-full px-5 shadow-none"
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
                className="h-[52px] rounded-full bg-[#1D5CE5] px-7 text-white shadow-none hover:bg-[#1649BD]"
                loading={pending}
                onClick={() => void onComplete()}
                data-testid="onboarding-complete"
              >
                Agree and continue
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
