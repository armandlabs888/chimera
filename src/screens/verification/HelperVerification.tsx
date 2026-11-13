'use client'

import { Check, Clock3, FileText, Upload } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useRef, useState, type FormEvent } from 'react'
import { BeamWordmark } from '@/components/BeamMark'
import { useBeam } from '@/context/BeamContext'
import { createClient } from '@/lib/supabase/client'
import { uploadVerificationDocument } from '@/lib/beam/verificationUpload'
import {
  VERIFY_ADDRESS_HINT,
  VERIFY_BILL_HINT,
  VERIFY_EMAIL_HINT,
  VERIFY_FORM_INTRO,
  VERIFY_FORM_TITLE,
  VERIFY_PRIVACY,
  VERIFY_SUBMIT_HELPER,
  VERIFY_TRUST_LINE,
} from '@/lib/verification/constants'
import { formatVerificationAddress, offerGateKind } from '@/lib/verification/status'

type UploadedDoc = {
  path: string
  name: string
  mime: string | null
  bytes: number
  previewUrl?: string
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function mimeLabel(mime: string | null | undefined, name: string): string {
  if (mime?.includes('pdf') || name.toLowerCase().endsWith('.pdf')) return 'PDF'
  if (mime?.includes('png')) return 'PNG'
  if (mime?.includes('webp')) return 'WebP'
  return 'Photo'
}

export function HelperVerification() {
  const {
    mode,
    authUser,
    currentUser,
    helperVerification,
    submitHelperVerification,
    ready,
  } = useBeam()

  const gate = offerGateKind(helperVerification)
  const isResubmit = gate === 'needs_resubmission'
  const showPending = gate === 'pending'

  const accountEmail =
    authUser?.email?.trim() ||
    helperVerification?.email ||
    (mode === 'demo' ? 'alex.rivera@email.com' : '')

  const [email, setEmail] = useState(accountEmail)
  const [street, setStreet] = useState(helperVerification?.street ?? '')
  const [apt, setApt] = useState(helperVerification?.apt ?? '')
  const [city, setCity] = useState(helperVerification?.city ?? currentUser.city ?? '')
  const [stateCode, setStateCode] = useState(
    helperVerification?.stateCode ?? currentUser.stateCode ?? '',
  )
  const [zip, setZip] = useState(helperVerification?.zip ?? '')
  const [doc, setDoc] = useState<UploadedDoc | null>(() => {
    if (!helperVerification?.documentPath || isResubmit) return null
    if (helperVerification.status === 'pending') {
      return {
        path: helperVerification.documentPath,
        name: helperVerification.documentName,
        mime: helperVerification.documentMime ?? null,
        bytes: helperVerification.documentBytes ?? 0,
        previewUrl: helperVerification.documentPreviewUrl ?? undefined,
      }
    }
    return null
  })
  const [uploading, setUploading] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const backHref = useMemo(() => {
    if (typeof window === 'undefined') return '/browse'
    const from = new URLSearchParams(window.location.search).get('from')
    return from?.startsWith('/') ? from : '/browse'
  }, [])

  async function onPickFile(file: File | null) {
    if (!file) return
    setError('')
    setUploading(true)
    try {
      const supabase = mode === 'live' ? createClient() : null
      const uploaded = await uploadVerificationDocument({
        mode,
        supabase,
        userId: currentUser.id,
        file,
      })
      setDoc(uploaded)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload that file')
      setDoc(null)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (pending || uploading) return
    setError('')
    if (!doc) {
      setError('Upload an electricity or water bill.')
      return
    }
    setPending(true)
    try {
      await submitHelperVerification({
        email,
        street,
        apt: apt || undefined,
        city,
        stateCode,
        zip,
        documentPath: doc.path,
        documentName: doc.name,
        documentMime: doc.mime,
        documentBytes: doc.bytes,
        documentPreviewUrl: doc.previewUrl,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit for review')
    } finally {
      setPending(false)
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white">
        <p className="text-[22px] font-semibold text-[#071330]" aria-busy="true">
          Beam
        </p>
      </div>
    )
  }

  if (showPending && helperVerification) {
    return (
      <div className="min-h-dvh bg-white text-[#071330]" data-testid="verify-pending">
        <header className="mx-auto flex w-full max-w-[640px] items-center justify-between px-5 pb-2 pt-6 sm:px-8">
          <BeamWordmark markWidth={22} markHeight={22} wordClassName="!text-[22px]" />
          <span className="text-[13px] font-medium text-[#5B6575]">Verification</span>
        </header>
        <main className="mx-auto w-full max-w-[560px] px-5 pb-16 pt-10 sm:px-8">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#F5F9FF] text-[#1D5CE5]">
            <Clock3 className="h-7 w-7" strokeWidth={2} aria-hidden />
          </div>
          <h1 className="mt-5 text-center font-display text-[28px] font-bold leading-[1.15] tracking-[-0.03em] text-[#071330] sm:text-[32px]">
            Beam is reviewing your documents
          </h1>
          <p className="mx-auto mt-3 max-w-[46ch] text-center text-[15px] leading-[1.55] text-[#3D4A5F]">
            A person at Beam will check your email, home address, and bill. You can make offers once
            they approve you. We&apos;ll email you at {helperVerification.email} when that&apos;s
            done.
          </p>

          <div
            className="mt-8 rounded-[10px] border border-[#E3E8EF] bg-white"
            data-testid="verify-pending-summary"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[#E3E8EF] px-4 py-3.5 sm:px-5">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#5B6575]">
                  Status
                </p>
                <p className="mt-0.5 text-[15px] font-bold text-[#071330]">Pending review</p>
              </div>
              <span className="inline-flex h-7 items-center rounded-full bg-[#F5F9FF] px-2.5 text-[12px] font-semibold text-[#1D5CE5]">
                In review
              </span>
            </div>
            <SummaryRow label="Email" value={helperVerification.email} />
            <SummaryRow
              label="Home address"
              value={formatVerificationAddress(helperVerification)}
            />
            <SummaryRow label="Document" value={helperVerification.documentName} last />
          </div>

          <Link
            href="/browse"
            data-testid="verify-back-browse"
            className="mt-6 inline-flex h-[52px] w-full items-center justify-center rounded-[10px] bg-[#1D5CE5] text-[15px] font-semibold text-white hover:bg-[#1649BD]"
          >
            Back to Browse
          </Link>
        </main>
      </div>
    )
  }

  if (gate === 'approved') {
    return (
      <div className="min-h-dvh bg-white text-[#071330]" data-testid="verify-approved">
        <header className="mx-auto flex w-full max-w-[640px] items-center justify-between px-5 pb-2 pt-6 sm:px-8">
          <BeamWordmark markWidth={22} markHeight={22} wordClassName="!text-[22px]" />
          <Link href={backHref} className="text-[14px] font-semibold text-[#1D5CE5]">
            Back to job
          </Link>
        </header>
        <main className="mx-auto w-full max-w-[560px] px-5 pb-16 pt-12 sm:px-8">
          <h1 className="font-display text-[28px] font-bold tracking-[-0.03em] text-[#071330]">
            You&apos;re verified
          </h1>
          <p className="mt-3 text-[15px] leading-[1.55] text-[#3D4A5F]">
            Beam already approved your documents. You can make offers on local jobs.
          </p>
          <Link
            href="/browse"
            className="mt-8 inline-flex h-[52px] w-full items-center justify-center rounded-[10px] bg-[#1D5CE5] text-[15px] font-semibold text-white hover:bg-[#1649BD]"
          >
            Back to Browse
          </Link>
        </main>
      </div>
    )
  }

  return (
    <div
      className="min-h-dvh bg-white text-[#071330]"
      data-testid={isResubmit ? 'verify-resubmit' : 'verify-form'}
    >
      <header className="mx-auto flex w-full max-w-[640px] items-center justify-between px-5 pb-2 pt-6 sm:px-8">
        <BeamWordmark markWidth={22} markHeight={22} wordClassName="!text-[22px]" />
        <Link
          href={backHref}
          className="text-[14px] font-semibold text-[#1D5CE5]"
          data-testid="verify-back"
        >
          {isResubmit ? 'Back to Browse' : 'Back to job'}
        </Link>
      </header>

      <main className="mx-auto w-full max-w-[560px] px-5 pb-20 pt-6 sm:px-8 sm:pt-8">
        {isResubmit ? (
          <div
            className="mb-6 rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3.5"
            data-testid="verify-decline-banner"
            role="status"
          >
            <p className="text-[15px] font-bold text-[#991B1B]">Beam needs a new submission</p>
            <p className="mt-1 text-[14px] leading-[1.5] text-[#7F1D1D]">
              {helperVerification?.reviewReason?.trim() ||
                'Please upload a recent electricity or water bill that shows the same name and address.'}
            </p>
          </div>
        ) : null}

        <h1 className="font-display text-[28px] font-bold leading-[1.15] tracking-[-0.03em] text-[#071330] sm:text-[32px]">
          {isResubmit ? 'Resubmit your documents' : VERIFY_FORM_TITLE}
        </h1>
        <p className="mt-3 text-[15px] leading-[1.55] text-[#3D4A5F]">
          {isResubmit
            ? 'Update anything that needs to change, then send it back for review. Offering stays locked until Beam approves you.'
            : VERIFY_FORM_INTRO}
        </p>
        {!isResubmit ? (
          <p className="mt-3 text-[15px] font-semibold leading-[1.45] tracking-[-0.01em] text-[#071330]">
            {VERIFY_TRUST_LINE}
          </p>
        ) : null}

        <form className="mt-8 space-y-7" onSubmit={(e) => void onSubmit(e)} noValidate>
          <Field
            label="Email address"
            hint={isResubmit ? undefined : VERIFY_EMAIL_HINT}
            htmlFor="verify-email"
          >
            <input
              id="verify-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="verify-email"
              className={inputClass}
            />
          </Field>

          <div>
            <Field
              label="Home address"
              hint={
                isResubmit
                  ? undefined
                  : VERIFY_ADDRESS_HINT
              }
              htmlFor="verify-street"
            >
              <input
                id="verify-street"
                required
                autoComplete="street-address"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="Street address"
                data-testid="verify-street"
                className={inputClass}
              />
            </Field>
            {!isResubmit ? (
              <input
                id="verify-apt"
                autoComplete="address-line2"
                value={apt}
                onChange={(e) => setApt(e.target.value)}
                placeholder="Apt or suite, optional"
                data-testid="verify-apt"
                className={`${inputClass} mt-2.5`}
              />
            ) : null}
            <div className="mt-2.5 grid grid-cols-[minmax(0,1.4fr)_72px_96px] gap-2.5">
              <input
                id="verify-city"
                required
                autoComplete="address-level2"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                data-testid="verify-city"
                className={inputClass}
                aria-label="City"
              />
              <input
                id="verify-state"
                required
                autoComplete="address-level1"
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value.toUpperCase().slice(0, 2))}
                placeholder="ST"
                data-testid="verify-state"
                className={inputClass}
                aria-label="State"
              />
              <input
                id="verify-zip"
                required
                autoComplete="postal-code"
                value={zip}
                onChange={(e) => setZip(e.target.value.replace(/[^\d-]/g, '').slice(0, 10))}
                placeholder="ZIP"
                data-testid="verify-zip"
                className={inputClass}
                aria-label="ZIP"
              />
            </div>
          </div>

          <div>
            <p className="text-[14px] font-bold tracking-[-0.01em] text-[#071330]">
              Electricity or water bill
            </p>
            <p className="mt-1.5 text-[13.5px] leading-[1.45] text-[#3D4A5F]">
              {isResubmit
                ? 'Upload a new bill that shows your name and this home address.'
                : VERIFY_BILL_HINT}
            </p>

            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,.pdf,.jpg,.jpeg,.png,.webp,.heic"
              className="sr-only"
              data-testid="verify-file-input"
              onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
            />

            {doc ? (
              <div
                className="mt-3 flex items-center gap-3 rounded-[10px] border border-[#D6E2F5] bg-[#F5F9FF] px-3.5 py-3"
                data-testid="verify-file-card"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-[#1D5CE5]">
                  <FileText className="h-5 w-5" strokeWidth={2} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold text-[#071330]">
                    {doc.name}
                  </span>
                  <span className="block text-[12.5px] text-[#3D4A5F]">
                    {mimeLabel(doc.mime, doc.name)}
                    {doc.bytes > 0 ? ` · ${formatBytes(doc.bytes)}` : ''}
                  </span>
                </span>
                <button
                  type="button"
                  className="shrink-0 text-[14px] font-semibold text-[#1D5CE5]"
                  onClick={() => fileRef.current?.click()}
                  data-testid="verify-file-replace"
                >
                  Replace
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                data-testid="verify-file-dropzone"
                className="mt-3 flex w-full flex-col items-center justify-center rounded-[10px] border border-dashed border-[#1D5CE5]/55 bg-[#F5F9FF] px-4 py-8 text-center hover:bg-[#EAF1FC] disabled:opacity-60"
              >
                <Upload className="h-6 w-6 text-[#1D5CE5]" strokeWidth={2} aria-hidden />
                <span className="mt-2 text-[14px] font-bold text-[#071330]">
                  Electricity or water bill
                </span>
                <span className="mt-1 text-[13px] text-[#3D4A5F]">
                  PDF or a clear photo, up to 10 MB.
                </span>
                <span className="mt-3 inline-flex h-10 items-center justify-center rounded-lg border border-[#1D5CE5] bg-white px-4 text-[14px] font-semibold text-[#1D5CE5]">
                  {uploading ? 'Uploading…' : 'Choose a file'}
                </span>
              </button>
            )}
          </div>

          {!isResubmit ? (
            <div
              className="rounded-[10px] border border-[#D6E2F5] bg-[#F5F9FF] px-4 py-4"
              data-testid="verify-privacy"
            >
              <p className="text-[14px] font-bold text-[#071330]">How Beam uses this</p>
              <ul className="mt-3 flex flex-col gap-2.5">
                {VERIFY_PRIVACY.map((line) => (
                  <li
                    key={line}
                    className="flex items-start gap-2 text-[13.5px] font-medium leading-[1.45] text-[#273449]"
                  >
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-[#1D5CE5]"
                      strokeWidth={2.5}
                      aria-hidden
                    />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {error ? (
            <p className="text-[14px] font-medium text-[#DC2626]" role="alert" data-testid="verify-error">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending || uploading}
            data-testid="verify-submit"
            className="inline-flex h-[52px] w-full items-center justify-center rounded-[10px] bg-[#1D5CE5] text-[15px] font-semibold text-white hover:bg-[#1649BD] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? 'Submitting…' : 'Submit for review'}
          </button>
          {!isResubmit ? (
            <p className="text-center text-[13.5px] text-[#5B6575]">{VERIFY_SUBMIT_HELPER}</p>
          ) : null}
        </form>
      </main>
    </div>
  )
}

function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string
  hint?: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-[14px] font-bold tracking-[-0.01em] text-[#071330]">
        {label}
      </label>
      {hint ? <p className="mt-1.5 text-[13.5px] leading-[1.45] text-[#3D4A5F]">{hint}</p> : null}
      <div className={hint ? 'mt-2.5' : 'mt-2'}>{children}</div>
    </div>
  )
}

function SummaryRow({
  label,
  value,
  last,
}: {
  label: string
  value: string
  last?: boolean
}) {
  return (
    <div className={`px-4 py-3.5 sm:px-5 ${last ? '' : 'border-b border-[#E3E8EF]'}`}>
      <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#5B6575]">{label}</p>
      <p className="mt-0.5 text-[15px] font-bold leading-snug text-[#071330]">{value}</p>
    </div>
  )
}

const inputClass =
  'h-11 w-full rounded-[10px] border border-[#E3E8EF] bg-white px-3.5 text-[15px] text-[#071330] outline-none placeholder:text-[#94A3B8] focus:border-[#1D5CE5] focus:ring-[3px] focus:ring-[#1D5CE5]/15'
