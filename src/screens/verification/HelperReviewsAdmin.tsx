'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { BeamWordmark } from '@/components/BeamMark'
import { useBeam } from '@/context/BeamContext'
import { formatVerificationAddress, isStaffReviewable } from '@/lib/verification/status'
import type { HelperVerification } from '@/types'
import { PRODUCT_NAME } from '@/lib/brand'

function formatSubmitted(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

function resultLabel(result: string | null | undefined): string {
  switch (result) {
    case 'matched':
      return 'Matched'
    case 'not_at_home':
      return 'Not at home'
    case 'weak_signal':
      return 'Weak GPS signal'
    case 'geocode_imprecise':
      return 'Address not precise enough'
    case 'geocode_failed':
      return 'Geocode failed'
    case 'rate_limited':
      return 'Rate limited'
    case 'permission_denied':
      return 'Location permission denied'
    default:
      return 'No location check yet'
  }
}

export function HelperReviewsAdmin() {
  const { ready, isBeamStaff, state, getPerson, reviewHelperVerification } = useBeam()
  const queue = useMemo(
    () =>
      (state.helperVerifications ?? [])
        .filter((v) => isStaffReviewable(v.status))
        .sort((a, b) =>
          (b.lastCheckedAt || b.submittedAt).localeCompare(a.lastCheckedAt || a.submittedAt),
        ),
    [state.helperVerifications],
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = queue.find((v) => v.id === selectedId) ?? queue[0] ?? null
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white">
        <p className="text-[22px] font-semibold text-[#071330]" aria-busy="true">
          {PRODUCT_NAME}
        </p>
      </div>
    )
  }

  if (!isBeamStaff) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-white px-6 text-center">
        <BeamWordmark markWidth={22} markHeight={22} wordClassName="!text-[22px]" />
        <h1 className="mt-8 font-display text-[24px] font-bold text-[#071330]">Staff only</h1>
        <p className="mt-2 max-w-md text-[15px] text-[#3D4A5F]">
          Helper reviews are limited to {PRODUCT_NAME} staff accounts.
        </p>
        <Link
          href="/browse"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-[#1D5CE5] px-5 text-[14px] font-semibold text-white"
        >
          Back to Browse
        </Link>
      </div>
    )
  }

  async function onApprove() {
    if (!selected || busy) return
    setBusy(true)
    setError('')
    try {
      await reviewHelperVerification({ profileId: selected.profileId, approve: true })
      setReason('')
      setSelectedId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not approve')
    } finally {
      setBusy(false)
    }
  }

  async function onRequestRetry() {
    if (!selected || busy) return
    if (!reason.trim()) {
      setError('Tell the Helper why they should try again')
      return
    }
    setBusy(true)
    setError('')
    try {
      await reviewHelperVerification({
        profileId: selected.profileId,
        approve: false,
        reason: reason.trim(),
      })
      setReason('')
      setSelectedId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send retry note')
    } finally {
      setBusy(false)
    }
  }

  const person = selected ? getPerson(selected.profileId) : undefined
  const name = person?.name || selected?.email.split('@')[0] || 'Helper'
  const onboardingCity =
    person?.city && person?.stateCode
      ? `${person.city}, ${person.stateCode}`
      : selected
        ? `${selected.city}, ${selected.stateCode}`
        : ''

  return (
    <div className="flex min-h-dvh flex-col bg-white text-[#071330]" data-testid="helper-reviews-admin">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[#E3E8EF] px-5">
        <BeamWordmark markWidth={20} markHeight={20} wordClassName="!text-[20px]" />
        <h1 className="text-[14px] font-semibold text-[#3D4A5F]">Helper reviews</h1>
      </header>

      <div className="mx-auto grid min-h-0 w-full max-w-[1200px] flex-1 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b border-[#E3E8EF] lg:border-b-0 lg:border-r">
          <p className="px-4 pb-2 pt-4 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#5B6575]">
            Needs review · {queue.length}
          </p>
          <ul className="pb-4" data-testid="helper-reviews-queue">
            {queue.length === 0 ? (
              <li className="px-4 py-6 text-[14px] text-[#5B6575]">No helpers need a backup review.</li>
            ) : (
              queue.map((row) => {
                const p = getPerson(row.profileId)
                const label = p?.name || row.email
                const place = `${row.city}, ${row.stateCode}`
                const active = selected?.id === row.id
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(row.id)
                        setReason('')
                        setError('')
                      }}
                      data-testid={`helper-review-row-${row.profileId}`}
                      className={`relative w-full px-4 py-3.5 text-left ${
                        active ? 'bg-[#F5F9FF]' : 'hover:bg-[#F8FAFC]'
                      }`}
                    >
                      {active ? (
                        <span className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r bg-[#1D5CE5]" />
                      ) : null}
                      <span className="block text-[15px] font-bold text-[#071330]">{label}</span>
                      <span className="mt-0.5 block text-[12.5px] text-[#5B6575]">
                        {place} · {resultLabel(row.lastCheckResult)}
                      </span>
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </aside>

        {!selected ? (
          <section className="px-5 py-6 sm:px-8 sm:py-8" data-testid="helper-review-detail">
            <p className="text-[15px] text-[#5B6575]">
              Select a Helper whose GPS could not get a clean match.
            </p>
          </section>
        ) : (
          <Detail
            key={selected.id}
            selected={selected}
            name={name}
            onboardingCity={onboardingCity}
            reason={reason}
            setReason={setReason}
            busy={busy}
            error={error}
            onApprove={() => void onApprove()}
            onRequestRetry={() => void onRequestRetry()}
          />
        )}
      </div>
    </div>
  )
}

function Detail({
  selected,
  name,
  onboardingCity,
  reason,
  setReason,
  busy,
  error,
  onApprove,
  onRequestRetry,
}: {
  selected: HelperVerification
  name: string
  onboardingCity: string
  reason: string
  setReason: (v: string) => void
  busy: boolean
  error: string
  onApprove: () => void
  onRequestRetry: () => void
}) {
  return (
    <section className="px-5 py-6 sm:px-8 sm:py-8" data-testid="helper-review-detail">
      <h2 className="font-display text-[24px] font-bold tracking-[-0.02em] text-[#071330]">{name}</h2>
      <p className="mt-1 text-[14px] text-[#5B6575]">
        Last check {formatSubmitted(selected.lastCheckedAt || selected.submittedAt)}
        {onboardingCity ? ` · Onboarding city ${onboardingCity}` : ''}
      </p>

      <div className="mt-6 space-y-4 rounded-[10px] border border-[#E3E8EF] p-4 sm:p-5">
        <Row label="Email" value={selected.email} />
        <Row label="Home address" value={formatVerificationAddress(selected)} />
        <Row label="Last check result" value={resultLabel(selected.lastCheckResult)} />
        <Row
          label="Distance"
          value={
            selected.lastDistanceM != null
              ? `${Math.round(selected.lastDistanceM)} m`
              : 'Not available'
          }
        />
        <Row
          label="GPS accuracy"
          value={
            selected.lastDeviceAccuracyM != null
              ? `${Math.round(selected.lastDeviceAccuracyM)} m`
              : 'Not available'
          }
        />
        <Row
          label="Geocode quality"
          value={selected.geocodeQuality?.replace('_', ' ') || 'Not available'}
        />
        <p className="text-[13px] leading-[1.45] text-[#5B6575]">
          Exact map pins are hidden for privacy. Approve only when you trust this Helper lives at
          the typed address (apartment GPS, rural coverage, etc.).
        </p>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-[#D7E0EC] bg-[#F5F9FF] px-3 py-2 text-[14px] font-medium text-[#071330]" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onApprove}
          disabled={busy}
          data-testid="helper-review-approve"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-[#1D5CE5] px-5 text-[14px] font-semibold text-white hover:bg-[#1649BD] disabled:opacity-60"
        >
          Approve Helper
        </button>
      </div>

      <div className="mt-8 border-t border-[#E3E8EF] pt-6">
        <label htmlFor="helper-review-reason" className="text-[14px] font-bold text-[#071330]">
          Ask them to try again
        </label>
        <textarea
          id="helper-review-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Example: Try again when you are home, preferably on your phone."
          data-testid="helper-review-reason"
          className="mt-2 w-full rounded-[10px] border border-[#E3E8EF] px-3.5 py-3 text-[14px] text-[#071330] outline-none focus:border-[#1D5CE5]"
        />
        <button
          type="button"
          onClick={onRequestRetry}
          disabled={busy}
          data-testid="helper-review-request-new"
          className="mt-3 inline-flex h-11 items-center justify-center rounded-lg border border-[#E3E8EF] bg-white px-5 text-[14px] font-semibold text-[#071330] hover:bg-[#F8FAFC] disabled:opacity-60"
        >
          Send retry note
        </button>
      </div>
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#5B6575]">{label}</p>
      <p className="mt-0.5 text-[15px] font-semibold text-[#071330]">{value}</p>
    </div>
  )
}
