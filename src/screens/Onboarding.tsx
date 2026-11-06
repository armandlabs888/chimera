'use client'

import {
  ArrowLeft,
  Check,
  HandHelping,
  ShoppingBag,
  ShieldAlert,
  ExternalLink,
} from 'lucide-react'
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
  eyebrow: string
  body: string
  icon: typeof ShoppingBag
}[] = [
  {
    id: 'customer',
    title: 'Customer',
    eyebrow: 'I need help with tasks',
    body: 'Post requests, compare offers, and book local help.',
    icon: ShoppingBag,
  },
  {
    id: 'helper',
    title: 'Helper / Tasker',
    eyebrow: 'I want to earn helping others',
    body: 'Browse open requests, send offers, and complete local tasks.',
    icon: HandHelping,
  },
]

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
  } = useBeam()

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
      <div className="flex min-h-dvh items-center justify-center bg-[#F4F8FD]">
        <p className="text-[22px] font-semibold tracking-tight text-[#071330]">Beam</p>
      </div>
    )
  }

  return (
    <div
      className="min-h-dvh bg-[#F4F8FD] text-[#071330]"
      data-testid="onboarding-root"
      data-step={step}
    >
      <header className="border-b border-[rgba(7,19,48,0.08)] bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-[720px] items-center justify-between px-5 sm:px-6">
          <Link href={isPreviewOrDemo ? '/browse' : '/'} aria-label="Beam home">
            <BeamWordmark markWidth={24} markHeight={24} wordClassName="text-[22px]" tone="ink" />
          </Link>
          <p className="text-[13px] font-semibold tabular-nums text-[#64748B]">
            Step {step} of 2
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-[720px] px-5 py-8 sm:px-6 sm:py-10">
        <div
          className="overflow-hidden rounded-[24px] border border-[rgba(7,19,48,0.08)] bg-white shadow-[0_18px_44px_-22px_rgba(12,42,102,0.16)]"
          data-testid="onboarding-card"
        >
          <div className="h-1.5 w-full bg-[#EEF4FF]">
            <div
              className="h-full bg-[#1D5CE5] transition-[width] duration-500 ease-out"
              style={{ width: step === 1 ? '50%' : '100%' }}
            />
          </div>

          <div className="px-5 py-7 sm:px-8 sm:py-9">
            {step === 1 ? (
              <div data-testid="onboarding-step-1" className="animate-fade-up">
                <h1 className="font-display text-[clamp(1.85rem,4vw,2.35rem)] font-bold leading-[1.08] tracking-[-0.03em] text-balance text-[#071330]">
                  Welcome to Beam
                </h1>
                <p className="mt-3 max-w-[42ch] text-[15.5px] leading-[1.55] text-[#64748B]">
                  Choose how you’ll use Beam, then pick your verified US city.
                </p>

                <div className="mt-8">
                  <p
                    id={`${roleGroupId}-label`}
                    className="mb-3 text-[13px] font-semibold text-[#475569]"
                  >
                    I am a…
                  </p>
                  <div
                    role="radiogroup"
                    aria-labelledby={`${roleGroupId}-label`}
                    className="grid gap-3 sm:grid-cols-2"
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
                          className={`rounded-[20px] border px-4 py-4 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1D5CE5]/25 ${
                            selected
                              ? 'border-[#1D5CE5] bg-[#EEF4FF] shadow-[0_0_0_1px_#1D5CE5]'
                              : 'border-[rgba(7,19,48,0.1)] bg-white hover:border-[rgba(7,19,48,0.18)] hover:bg-[#F8FBFF]'
                          }`}
                        >
                          <span className="flex items-start gap-3">
                            <span
                              className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                                selected
                                  ? 'bg-[#1D5CE5] text-white'
                                  : 'bg-[#F4F8FD] text-[#1D5CE5]'
                              }`}
                            >
                              <Icon className="h-5 w-5" aria-hidden />
                            </span>
                            <span className="min-w-0">
                              <span className="flex items-center gap-2">
                                <span className="text-[16px] font-bold text-[#071330]">
                                  {item.title}
                                </span>
                                {selected ? (
                                  <Check className="h-4 w-4 text-[#1D5CE5]" aria-hidden />
                                ) : null}
                              </span>
                              <span className="mt-1 block text-[13.5px] font-semibold text-[#1D5CE5]">
                                {item.eyebrow}
                              </span>
                              <span className="mt-1.5 block text-[13.5px] leading-[1.45] text-[#64748B]">
                                {item.body}
                              </span>
                            </span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="mt-7">
                  <UsCityCombobox value={city} onChange={setCity} />
                </div>

                <div className="mt-8 flex justify-end">
                  <Button
                    type="button"
                    size="lg"
                    className="h-[52px] min-w-[140px] rounded-full px-7"
                    disabled={!canNext}
                    onClick={() => setStep(2)}
                    data-testid="onboarding-next"
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : (
              <div data-testid="onboarding-step-2" className="animate-fade-up">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#FFF8D6] px-3 py-1.5 text-[12px] font-bold uppercase tracking-[0.08em] text-[#071330]">
                  <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
                  Community commitment
                </div>
                <h1 className="mt-4 font-display text-[clamp(1.85rem,4vw,2.35rem)] font-bold leading-[1.08] tracking-[-0.03em] text-balance text-[#071330]">
                  Safety &amp; prohibited content
                </h1>
                <p className="mt-3 max-w-[46ch] text-[15.5px] leading-[1.55] text-[#64748B]">
                  Before you enter Beam, confirm you understand our community rules. Clicking{' '}
                  <span className="font-semibold text-[#071330]">Complete</span> is your commitment —
                  no extra checkbox required.
                </p>

                <div
                  className="mt-7 rounded-[20px] border border-[rgba(7,19,48,0.08)] bg-[#FFF8D6] px-5 py-5"
                  data-testid="onboarding-safety-callout"
                >
                  <p className="text-[16px] font-bold leading-[1.45] text-[#071330]">
                    Posting illegal content or listing sexual services is strictly prohibited.
                  </p>
                  <p className="mt-3 text-[15px] leading-[1.5] text-[#475569]">
                    Violating listings will be removed immediately, and your account is subject to a
                    temporary ban.
                  </p>
                </div>

                <ul className="mt-6 space-y-3 text-[14.5px] leading-[1.5] text-[#475569]">
                  <li className="flex gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#1D5CE5]" aria-hidden />
                    <span>
                      Beam is strictly for everyday local help across our six allowed categories.
                    </span>
                  </li>
                  <li className="flex gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#1D5CE5]" aria-hidden />
                    <span>
                      Zero tolerance for illegal activity, adult or sexual services, or unsafe
                      requests.
                    </span>
                  </li>
                  <li className="flex gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#1D5CE5]" aria-hidden />
                    <span>
                      Read the full policy anytime on{' '}
                      <Link
                        href="/safety"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-[#1D5CE5] underline-offset-2 hover:underline"
                      >
                        /safety
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      </Link>
                      .
                    </span>
                  </li>
                </ul>

                {error ? (
                  <div
                    role="alert"
                    className="mt-6 rounded-2xl border border-red-500/25 bg-red-50 px-4 py-3 text-[14px] text-red-700"
                    data-testid="onboarding-error"
                  >
                    {error}
                  </div>
                ) : null}

                <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    size="lg"
                    className="h-[52px] rounded-full px-5"
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
                    className="h-[52px] min-w-[160px] rounded-full px-7"
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
      </main>

    </div>
  )
}
