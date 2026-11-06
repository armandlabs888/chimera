'use client'

import { ArrowLeft, Check } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  useEffect,
  useId,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { BeamWordmark } from '@/components/BeamMark'
import { UsCityCombobox } from '@/components/onboarding/UsCityCombobox'
import { Button } from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import type { UsCity } from '@/lib/usPlaces'
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
  const { mode, ready, authUser, currentUser, completeOnboarding } = useBeam()

  const roleGroupId = useId()
  const [step, setStep] = useState<1 | 2>(1)
  const [role, setRole] = useState<AccountRole | null>(null)
  const [city, setCity] = useState<UsCity | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  const isPreviewOrDemo = mode === 'demo' || preview
  const alreadyOnboarded = Boolean(currentUser.onboardingCompletedAt)

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
                      onClick={() => setRole(item.id)}
                      onKeyDown={(e) => {
                        if (role) onRoleKeyDown(e, role)
                        else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                          e.preventDefault()
                          setRole(item.id === 'customer' ? 'helper' : 'customer')
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
              <UsCityCombobox value={city} onChange={setCity} />
            </div>

            <div className="mt-9">
              <Button
                type="button"
                size="lg"
                disabled={!canNext}
                onClick={() => setStep(2)}
                data-testid="onboarding-next"
                className="h-[52px] w-full rounded-full bg-[#1D5CE5] px-7 text-[15px] text-white shadow-none !transition-[background-color] hover:bg-[#1649BD] disabled:cursor-not-allowed disabled:bg-[#E2E8F0] disabled:text-[#94A3B8] disabled:shadow-none disabled:!opacity-100 disabled:hover:bg-[#E2E8F0]"
              >
                Continue
              </Button>
            </div>
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
