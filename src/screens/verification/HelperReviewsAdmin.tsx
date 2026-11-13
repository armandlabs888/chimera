'use client'

import { ExternalLink } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { BeamWordmark } from '@/components/BeamMark'
import { useBeam } from '@/context/BeamContext'
import { createClient } from '@/lib/supabase/client'
import { createVerificationDocumentUrl } from '@/lib/beam/verificationUpload'
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

function formatBytes(n: number | null | undefined): string {
  if (!n || n <= 0) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function isPdfDocument(mime: string | null | undefined, name: string): boolean {
  const m = (mime || '').toLowerCase()
  if (m.includes('pdf')) return true
  return name.toLowerCase().endsWith('.pdf')
}

function isImageDocument(mime: string | null | undefined, name: string): boolean {
  const m = (mime || '').toLowerCase()
  if (m.startsWith('image/')) return true
  return /\.(jpe?g|png|webp|gif)$/i.test(name)
}

function documentKindLabel(mime: string | null | undefined, name: string): string {
  if (isPdfDocument(mime, name)) return 'PDF'
  if (isImageDocument(mime, name)) return 'Photo'
  return 'File'
}

export function HelperReviewsAdmin() {
  const { ready, isBeamStaff, mode, state, getPerson, reviewHelperVerification } = useBeam()
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
    <div className="flex min-h-dvh flex-col bg-white text-[#071330]" data-testid="helper-reviews-admin">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[#E3E8EF] px-5">
        <BeamWordmark markWidth={20} markHeight={20} wordClassName="!text-[20px]" />
        <span className="text-[14px] font-semibold text-[#3D4A5F]">Helper reviews</span>
      </header>

      <div className="mx-auto grid min-h-0 w-full max-w-[1200px] flex-1 lg:grid-cols-[280px_minmax(0,1fr)]">
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

        {!selected ? (
          <section className="px-5 py-6 sm:px-8 sm:py-8" data-testid="helper-review-detail">
            <p className="text-[15px] text-[#5B6575]">Select a Helper to review.</p>
          </section>
        ) : (
          <Detail
            key={selected.id}
            mode={mode}
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
      </div>
    </div>
  )
}

function Detail({
  mode,
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
  mode: 'live' | 'demo' | 'unconfigured'
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
  const [docUrl, setDocUrl] = useState<string | null>(null)
  const [docLoading, setDocLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setDocLoading(true)
    setDocUrl(null)
    ;(async () => {
      try {
        const supabase = mode === 'live' ? createClient() : null
        const url = await createVerificationDocumentUrl({
          mode,
          supabase,
          path: selected.documentPath,
          previewUrl: selected.documentPreviewUrl,
        })
        if (!cancelled) setDocUrl(url)
      } catch {
        if (!cancelled) setDocUrl(null)
      } finally {
        if (!cancelled) setDocLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [mode, selected.documentPath, selected.documentPreviewUrl, selected.id])

  const kind = documentKindLabel(selected.documentMime, selected.documentName)
  const sizeLabel = formatBytes(selected.documentBytes)
  const documentMeta = [kind, sizeLabel].filter(Boolean).join(' · ')
  const pdf = Boolean(docUrl) && isPdfDocument(selected.documentMime, selected.documentName)
  const image = Boolean(docUrl) && isImageDocument(selected.documentMime, selected.documentName)

  return (
    <section
      className="relative flex min-h-0 flex-col lg:h-[calc(100dvh-56px)]"
      data-testid="helper-review-detail"
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-28 pt-6 sm:px-8 sm:pt-8">
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
            value={
              documentMeta
                ? `${selected.documentName}\n${documentMeta}`
                : selected.documentName
            }
          />
          <InfoCell label="Onboarding city" value={onboardingCity} />
        </div>

        <div
          className="mt-5 overflow-hidden rounded-[10px] border border-[#E3E8EF]"
          data-testid="helper-review-document"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E3E8EF] bg-[#FAFBFC] px-4 py-3">
            <p className="min-w-0 truncate text-[14px] font-semibold text-[#071330]">
              {selected.documentName}
            </p>
            {docUrl ? (
              <a
                href={docUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="helper-review-open-document"
                className="inline-flex shrink-0 items-center gap-1.5 text-[13px] font-semibold text-[#1D5CE5] hover:text-[#1649BD]"
              >
                Open document
                <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              </a>
            ) : (
              <p className="shrink-0 text-[12px] italic text-[#5B6575]">
                {docLoading ? 'Loading document…' : 'Sample preview only'}
              </p>
            )}
          </div>

          <div className="bg-[#F8FAFC] px-4 py-5 sm:px-5 sm:py-6">
            {docLoading ? (
              <p className="py-10 text-center text-[14px] text-[#5B6575]" data-testid="helper-review-doc-loading">
                Loading document…
              </p>
            ) : docUrl && image ? (
              // Private signed URL / demo data URL; plain img matches listing photo pattern.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={docUrl}
                alt={`Uploaded bill: ${selected.documentName}`}
                data-testid="helper-review-doc-image"
                className="mx-auto max-h-[min(70vh,720px)] w-auto max-w-full rounded-md border border-[#E3E8EF] bg-white object-contain shadow-sm"
              />
            ) : docUrl && pdf ? (
              <iframe
                title={`PDF preview: ${selected.documentName}`}
                src={docUrl}
                data-testid="helper-review-doc-pdf"
                className="h-[min(70vh,720px)] w-full rounded-md border border-[#E3E8EF] bg-white"
              />
            ) : docUrl ? (
              <div
                className="rounded-[10px] border border-[#E3E8EF] bg-white px-5 py-8 text-center"
                data-testid="helper-review-doc-link-only"
              >
                <p className="text-[15px] font-semibold text-[#071330]">
                  Preview is not available for this file type in the browser.
                </p>
                <p className="mt-2 text-[14px] text-[#3D4A5F]">
                  Use Open document to review the electricity or water bill.
                </p>
                <a
                  href={docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-[#1D5CE5] px-4 text-[14px] font-semibold text-white hover:bg-[#1649BD]"
                >
                  Open document
                  <ExternalLink className="h-4 w-4" strokeWidth={2} aria-hidden />
                </a>
              </div>
            ) : (
              <SampleDocumentFallback
                name={name}
                selected={selected}
                kind={kind}
              />
            )}
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
      </div>

      <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-2.5 border-t border-[#E3E8EF] bg-white px-5 py-4 sm:px-8">
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
    </section>
  )
}

function SampleDocumentFallback({
  name,
  selected,
  kind,
}: {
  name: string
  selected: HelperVerification
  kind: string
}) {
  return (
    <div
      className="mx-auto max-w-md rounded-md border border-dashed border-[#CDD5E0] bg-white p-5 shadow-sm"
      data-testid="helper-review-doc-sample"
    >
      <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#B45309]">
        Sample document preview
      </p>
      <p className="mt-2 text-[13px] leading-snug text-[#3D4A5F]">
        The uploaded file is not available to preview here. In live mode, staff see the real
        electricity or water bill via a short-lived signed link.
      </p>
      <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.08em] text-[#5B6575]">
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
            {kind}
            {selected.documentBytes
              ? ` · ${Math.max(1, Math.round(selected.documentBytes / 1024))} KB`
              : ''}
          </p>
        </div>
      </div>
    </div>
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
