'use client'

import { ArrowLeft, Check } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Button, FormErrorAlert } from '@/components/ui'
import { humanizeSaveError } from '@/lib/formErrors'
import { BROWSE_PARENTS, type BrowseParentId } from '@/lib/taxonomy'
import { maskPhoneE164 } from '@/lib/phone/format'

const ALERT_PILLS: { id: 'all' | BrowseParentId; label: string }[] = [
  { id: 'all', label: 'All urgent jobs' },
  ...BROWSE_PARENTS.map((p) => ({
    id: p.id,
    label: p.id === 'junk-removal' ? 'Junk removal' : p.label,
  })),
]

export function JobAlertsStep({
  stepLabel,
  step,
  total,
  maskedPhone,
  phoneE164,
  locationVerified,
  onBack,
  onSkip,
  onEnabled,
  demoMode = false,
}: {
  stepLabel: string
  step: number
  total: number
  maskedPhone: string
  phoneE164?: string
  locationVerified: boolean
  onBack: () => void
  onSkip: () => void
  onEnabled: () => void
  demoMode?: boolean
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(['all']))
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  const bars = useMemo(() => Array.from({ length: total }, (_, i) => i + 1), [total])

  const displayPhone = maskedPhone || (phoneE164 ? maskPhoneE164(phoneE164) : 'Verified number')

  function togglePill(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (id === 'all') {
        return new Set(['all'])
      }
      next.delete('all')
      if (next.has(id)) next.delete(id)
      else next.add(id)
      if (next.size === 0) return new Set(['all'])
      // If every parent is selected, collapse to All.
      const parentIds = BROWSE_PARENTS.map((p) => p.id)
      if (parentIds.every((p) => next.has(p))) return new Set(['all'])
      return next
    })
  }

  async function onTurnOn() {
    setPending(true)
    setError('')
    try {
      const parents = selected.has('all')
        ? []
        : [...selected].filter((id): id is BrowseParentId => id !== 'all')

      if (demoMode) {
        onEnabled()
        return
      }

      const res = await fetch('/api/phone/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enable: true, parents }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error || 'Could not save alerts')
      onEnabled()
    } catch (err) {
      setError(humanizeSaveError(err, 'Could not save alerts.'))
      setPending(false)
    }
  }

  return (
    <div
      data-testid="onboarding-step-alerts"
      className="account-hc-wizard single animate-fade-up"
    >
      <div className="account-hc-card account-hc-rules">
        <div
          className="account-hc-step-meta"
          aria-label={stepLabel}
          data-testid="onboarding-step-progress"
        >
          <p className="n">{stepLabel}</p>
          <div className="account-hc-step-bars" aria-hidden>
            {bars.map((n) => (
              <i key={n} className={step >= n ? 'on' : undefined} />
            ))}
          </div>
        </div>

        <h1 className="account-hc-hero-title" style={{ fontSize: 28 }}>
          Get instant job alerts by text?
        </h1>
        <p className="account-hc-lede" style={{ color: '#4A5568' }}>
          When an urgent job is posted nearby, we text you so you can offer first.
        </p>

        <div
          className="mt-6 flex items-center gap-3 rounded-[12px] border border-[#E3E8EF] bg-[#F7F9FC] px-4 py-3"
          data-testid="onboarding-alerts-phone-card"
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#1E8E3E] text-white">
            <Check className="h-4 w-4" strokeWidth={3} aria-hidden />
          </span>
          <div>
            <p className="text-[13px] font-semibold text-[#1E8E3E]">Verified number</p>
            <p className="text-[14px] text-[#071330]" data-testid="onboarding-alerts-phone">
              {displayPhone}
            </p>
          </div>
        </div>

        <p className="mt-6 text-[14px] font-semibold text-[#071330]">
          What to hear about (optional)
        </p>
        <div className="mt-3 flex flex-wrap gap-2" data-testid="onboarding-alerts-pills">
          {ALERT_PILLS.map((pill) => {
            const on = selected.has(pill.id)
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => togglePill(pill.id)}
                data-testid={`onboarding-alerts-pill-${pill.id}`}
                className={`rounded-full border px-3 py-1.5 text-[13px] font-medium transition ${
                  on
                    ? 'border-[#1D5CE5] bg-[#EEF2F7] text-[#071330]'
                    : 'border-[#D7E0EC] bg-white text-[#4A5568]'
                }`}
              >
                {pill.label}
              </button>
            )
          })}
        </div>

        {!locationVerified ? (
          <p
            className="mt-5 rounded-[10px] border border-[#E3E8EF] bg-[#F7F9FC] px-3 py-2 text-[13px] leading-[1.45] text-[#4A5568]"
            data-testid="onboarding-alerts-verify-note"
          >
            Alerts start once you get verified.{' '}
            <Link href="/verify" className="font-medium text-[#1649BD]">
              Get verified
            </Link>
          </p>
        ) : null}

        {error ? (
          <FormErrorAlert
            className="mt-4"
            message={error}
            testId="onboarding-alerts-error"
          />
        ) : null}

        <div className="mt-7 flex flex-col gap-3">
          <Button
            type="button"
            size="lg"
            className="account-hc-btn account-hc-btn-lg w-full bg-[#1D5CE5] text-white shadow-none hover:bg-[#1649BD]"
            loading={pending}
            onClick={() => void onTurnOn()}
            data-testid="onboarding-alerts-enable"
          >
            Turn on text alerts
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="account-hc-btn account-hc-btn-secondary account-hc-btn-lg w-full border border-[#D7E0EC] bg-white text-[#071330] shadow-none"
            disabled={pending}
            onClick={onSkip}
            data-testid="onboarding-alerts-skip"
          >
            Skip for now
          </Button>
        </div>

        <p className="mt-4 text-[12px] leading-[1.45] text-[#4A5568]">
          You can turn this on later in Settings. Standard message rates may apply.
        </p>

        <div className="account-hc-rules-actions mt-6">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="account-hc-btn account-hc-btn-secondary account-hc-btn-lg shadow-none"
            onClick={onBack}
            disabled={pending}
            data-testid="onboarding-alerts-back"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back
          </Button>
        </div>
      </div>
    </div>
  )
}
