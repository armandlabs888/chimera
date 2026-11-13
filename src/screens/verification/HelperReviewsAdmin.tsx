'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { BeamWordmark } from '@/components/BeamMark'
import { useBeam } from '@/context/BeamContext'
import { formatVerificationAddress } from '@/lib/verification/status'
import type { HelperVerification } from '@/types'

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

export function HelperReviewsAdmin() {
  const { ready, isBeamStaff, state, getPerson, reviewHelperVerification } = useBeam()
  const pending = useMemo(
    () =>
      (state.helperVerifications ?? [])
        .filter((v) => v.status === 'pending')
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
    [state.helperVerifications],
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected =
    pending.find((v) => v.id === selectedId) ?? pending[0] ?? null
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white">
        <p className="text-[22px] font-semibold text-[#071330]" aria-busy="true">
          Beam
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
          Helper reviews are limited to Beam staff accounts.
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

  async function onRequestNew() {
    if (!selected || busy) return
    if (!reason.trim()) {
      setError('Tell the Helper why a new submission is needed')
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
      setError(err instanceof Error ? err.message : 'Could not request a new submission')
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
    <div className="min-h-dvh bg-white text-[#071330]" data-testid="helper-reviews-admin">
      <header className="flex h-14 items-center gap-3 border-b border-[#E3E8EF] px-5">
        <BeamWordmark markWidth={20} markHeight={20} wordClassName="!text-[20px]" />
        <span className="text-[14px] font-semibold text-[#3D4A5F]">Helper reviews</span>
      </header>

      <div className="mx-auto grid min-h-[calc(100dvh-56px)] w-full max-w-[1200px] lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b border-[#E3E8EF] lg:border-b-0 lg:border-r">
          <p className="px-4 pb-2 pt-4 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#5B6575]">
            Pending · {pending.length}
          </p>
          <ul className="pb-4" data-testid="helper-reviews-queue">
            {pending.length === 0 ? (
              <li className="px-4 py-6 text-[14px] text-[#5B6575]">No pending reviews.</li>
            ) : (
              pending.map((row) => {
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
                        {place} · Submitted {formatSubmitted(row.submittedAt)}
                      </span>
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </aside>

        <section className="px-5 py-6 sm:px-8 sm:py-8" data-testid="helper-review-detail">
          {!selected ? (
            <p className="text-[15px] text-[#5B6575]">Select a Helper to review.</p>
          ) : (
            <Detail
              selected={selected}
              name={name}
              onboardingCity={onboardingCity}
              reason={reason}
              setReason={setReason}
              error={error}
              busy={busy}
              onApprove={() => void onApprove()}
              onRequestNew={() => void onRequestNew()}
            />
          )}
        </section>
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
  error,
  busy,
  onApprove,
  onRequestNew,
}: {
  selected: HelperVerification
  name: string
  onboardingCity: string
  reason: string
  setReason: (v: string) => void
  error: string
  busy: boolean
  onApprove: () => void
  onRequestNew: () => void
}) {
  return (
    <>
      <span className="inline-flex h-7 items-center rounded-full bg-[#F5F9FF] px-2.5 text-[12px] font-semibold text-[#1D5CE5]">
        Pending review
      </span>
      <h1 className="mt-3 font-display text-[28px] font-bold tracking-[-0.03em] text-[#071330]">
        {name}
      </h1>
      <p className="mt-1 text-[14px] text-[#3D4A5F]">
        Helper · Submitted {formatSubmitted(selected.submittedAt)}
      </p>

      <div className="mt-6 grid gap-4 rounded-[10px] border border-[#E3E8EF] p-4 sm:grid-cols-2 sm:p-5">
        <InfoCell label="Email" value={selected.email} />
        <InfoCell label="Home address" value={formatVerificationAddress(selected)} />
        <InfoCell
          label="Document"
          value={`Water bill · ${selected.documentName.replace(/\.[^.]+$/, '')}`}
        />
        <InfoCell label="Onboarding city" value={onboardingCity} />
      </div>

      <div className="mt-5 overflow-hidden rounded-[10px] border border-[#E3E8EF]">
        <div className="flex items-center justify-between gap-3 border-b border-[#E3E8EF] bg-[#FAFBFC] px-4 py-3">
          <p className="truncate text-[14px] font-semibold text-[#071330]">{selected.documentName}</p>
          <p className="shrink-0 text-[12px] italic text-[#5B6575]">Document on file</p>
        </div>
        <div className="bg-[#F8FAFC] px-5 py-8">
          <div className="mx-auto max-w-md rounded-md border border-[#E3E8EF] bg-white p-5 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#5B6575]">
              Municipal water service
            </p>
            <p className="mt-2 text-[16px] font-bold text-[#071330]">Account statement</p>
            <p className="mt-1 text-[13px] text-[#3D4A5F]">{selected.documentName}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#E3E8EF] pt-4 text-[13px]">
              <div>
                <p className="font-semibold text-[#5B6575]">Service for</p>
                <p className="mt-1 font-medium text-[#071330]">{name}</p>
                <p className="text-[#273449]">{formatVerificationAddress(selected)}</p>
              </div>
              <div>
                <p className="font-semibold text-[#5B6575]">File</p>
                <p className="mt-1 font-medium text-[#071330]">
                  {selected.documentMime?.includes('pdf') ? 'PDF' : 'Photo'}
                  {selected.documentBytes
                    ? ` · ${Math.max(1, Math.round(selected.documentBytes / 1024))} KB`
                    : ''}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <label className="mt-6 block text-[14px] font-semibold text-[#273449]" htmlFor="review-reason">
        If you need a new submission, tell the Helper why
      </label>
      <textarea
        id="review-reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        placeholder="The address on the bill didn't match the home address you entered."
        data-testid="helper-review-reason"
        className="mt-2 w-full rounded-[10px] border border-[#E3E8EF] px-3.5 py-3 text-[15px] text-[#071330] outline-none placeholder:text-[#94A3B8] focus:border-[#1D5CE5] focus:ring-[3px] focus:ring-[#1D5CE5]/15"
      />

      {error ? (
        <p className="mt-3 text-[14px] font-medium text-[#DC2626]" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-end gap-2.5 border-t border-[#E3E8EF] pt-5">
        <button
          type="button"
          disabled={busy}
          onClick={onRequestNew}
          data-testid="helper-review-request-new"
          className="inline-flex h-11 items-center justify-center rounded-lg border border-[#CDD5E0] bg-white px-4 text-[14px] font-semibold text-[#071330] hover:bg-[#F8FAFC] disabled:opacity-60"
        >
          Request a new submission
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onApprove}
          data-testid="helper-review-approve"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-[#1D5CE5] px-4 text-[14px] font-semibold text-white hover:bg-[#1649BD] disabled:opacity-60"
        >
          Approve Helper
        </button>
      </div>
    </>
  )
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#5B6575]">{label}</p>
      <p className="mt-1 whitespace-pre-line text-[15px] font-semibold leading-snug text-[#071330]">
        {value}
      </p>
    </div>
  )
}
