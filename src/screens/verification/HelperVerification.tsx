'use client'

import { Check, MapPin } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState, type FormEvent } from 'react'
import { BeamWordmark } from '@/components/BeamMark'
import { useBeam } from '@/context/BeamContext'
import {
  VERIFY_ADDRESS_HINT,
  VERIFY_CONFIRM_HINT,
  VERIFY_CTA_CONFIRM,
  VERIFY_CTA_RETRY,
  VERIFY_EMAIL_HINT,
  VERIFY_FORM_INTRO,
  VERIFY_FORM_RETRY_INTRO,
  VERIFY_FORM_TITLE,
  VERIFY_LOC_BOX_BODY,
  VERIFY_LOC_BOX_TITLE,
  VERIFY_NOT_HOME_BODY,
  VERIFY_NOT_HOME_TITLE,
  VERIFY_PERMISSION_HELPER,
  VERIFY_PRIVACY,
  VERIFY_PRIVACY_HEADING,
  VERIFY_SUBMIT_HELPER,
  VERIFY_SUCCESS_BODY,
  VERIFY_SUCCESS_TITLE,
  VERIFY_TRUST_LINE,
} from '@/lib/verification/constants'
import {
  DeviceLocationError,
  readDeviceLocationOnce,
} from '@/lib/verification/deviceLocation'
import { formatVerificationAddress, offerGateKind } from '@/lib/verification/status'

export function HelperVerification() {
  const {
    authUser,
    currentUser,
    helperVerification,
    confirmHelperHomeLocation,
    ready,
  } = useBeam()

  const gate = offerGateKind(helperVerification)
  const showNotHome =
    helperVerification?.lastCheckResult === 'not_at_home' ||
    helperVerification?.lastCheckResult === 'weak_signal' ||
    helperVerification?.lastCheckResult === 'geocode_imprecise'

  const accountEmail =
    authUser?.email?.trim() ||
    helperVerification?.email ||
    ''

  const [email, setEmail] = useState(
    helperVerification?.email || accountEmail || (currentUser ? '' : ''),
  )
  const [street, setStreet] = useState(helperVerification?.street ?? '')
  const [apt, setApt] = useState(helperVerification?.apt ?? '')
  const [city, setCity] = useState(helperVerification?.city ?? currentUser.city ?? '')
  const [stateCode, setStateCode] = useState(
    helperVerification?.stateCode ?? currentUser.stateCode ?? '',
  )
  const [zip, setZip] = useState(helperVerification?.zip ?? '')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [permissionDenied, setPermissionDenied] = useState(
    helperVerification?.lastCheckResult === 'permission_denied',
  )
  const [notHomeBanner, setNotHomeBanner] = useState(showNotHome)
  const [notHomeMessage, setNotHomeMessage] = useState('')

  const backHref = useMemo(() => {
    if (typeof window === 'undefined') return '/browse'
    const from = new URLSearchParams(window.location.search).get('from')
    return from?.startsWith('/') ? from : '/browse'
  }, [])

  async function onConfirm(e: FormEvent) {
    e.preventDefault()
    if (pending) return
    setError('')
    setNotHomeMessage('')
    setPermissionDenied(false)
    setPending(true)
    try {
      const reading = await readDeviceLocationOnce()
      const result = await confirmHelperHomeLocation({
        email,
        street,
        apt: apt || undefined,
        city,
        stateCode,
        zip,
        deviceLat: reading.lat,
        deviceLng: reading.lng,
        deviceAccuracyM: reading.accuracyM,
      })
      if (result.ok) {
        setNotHomeBanner(false)
        setPermissionDenied(false)
        setNotHomeMessage('')
        setError('')
        return
      }

      const isPermission = result.result === 'permission_denied'
      const isLocationMiss =
        result.result === 'not_at_home' ||
        result.result === 'weak_signal' ||
        result.result === 'geocode_imprecise'
      const serverMessage =
        result.message?.trim() ||
        (isPermission
          ? 'Location access was denied. Turn it on in your browser settings, then try again.'
          : 'We could not confirm you are home. Try again when you are at this address.')

      setPermissionDenied(isPermission)
      // Permission issues are not "not at home"; location misses get the calm banner.
      setNotHomeBanner(isLocationMiss)
      if (isLocationMiss) {
        setNotHomeMessage(serverMessage)
        setError('')
      } else {
        setNotHomeMessage('')
        setError(serverMessage)
      }
    } catch (err) {
      if (err instanceof DeviceLocationError && err.code === 'permission_denied') {
        setPermissionDenied(true)
        setNotHomeBanner(false)
        setNotHomeMessage('')
        setError(err.message)
      } else {
        setNotHomeBanner(false)
        setNotHomeMessage('')
        setError(err instanceof Error ? err.message : 'Could not confirm your location')
      }
    } finally {
      setPending(false)
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white">
        <p className="text-[22px] font-semibold text-[#071330]" aria-busy="true">
          HouseCall
        </p>
      </div>
    )
  }

  if (gate === 'approved' && helperVerification) {
    return (
      <div className="min-h-dvh bg-white text-[#071330]" data-testid="verify-approved">
        <header className="mx-auto flex w-full max-w-[640px] items-center justify-between px-5 pb-2 pt-6 sm:px-8">
          <BeamWordmark markWidth={22} markHeight={22} wordClassName="!text-[22px]" />
          <span className="sm:hidden" />
        </header>
        <main className="mx-auto w-full max-w-[560px] px-5 pb-16 pt-10 sm:px-8">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border-[1.8px] border-[#1D5CE5] text-[#1D5CE5]">
            <Check className="h-7 w-7" strokeWidth={2.25} aria-hidden />
          </div>
          <h1 className="mt-5 text-center font-display text-[28px] font-bold leading-[1.15] tracking-[-0.03em] text-[#071330] sm:text-[32px]">
            {VERIFY_SUCCESS_TITLE}
          </h1>
          <p className="mx-auto mt-3 max-w-[46ch] text-center text-[15px] leading-[1.55] text-[#3D4A5F]">
            {VERIFY_SUCCESS_BODY}
          </p>

          <div
            className="mt-8 rounded-[10px] border border-[#E3E8EF] bg-white"
            data-testid="verify-approved-summary"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[#E3E8EF] px-4 py-3.5 sm:px-5">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#5B6575]">
                  Status
                </p>
                <p className="mt-0.5 text-[15px] font-bold text-[#071330]">Verified</p>
              </div>
              <span className="inline-flex h-7 items-center rounded-full bg-[#F5F9FF] px-2.5 text-[12px] font-semibold text-[#1D5CE5]">
                Just now
              </span>
            </div>
            <SummaryRow label="Email" value={helperVerification.email} />
            <SummaryRow
              label="Home address"
              value={formatVerificationAddress(helperVerification)}
              last
            />
          </div>

          <Link
            href={backHref}
            data-testid="verify-back-job"
            className="mt-6 inline-flex h-[52px] w-full items-center justify-center rounded-[10px] bg-[#1D5CE5] text-[15px] font-semibold text-white hover:bg-[#1649BD]"
          >
            Back to job
          </Link>
        </main>
      </div>
    )
  }

  const ctaLabel = notHomeBanner || permissionDenied ? VERIFY_CTA_RETRY : VERIFY_CTA_CONFIRM

  return (
    <div className="min-h-dvh bg-white text-[#071330]" data-testid="verify-form">
      <header className="mx-auto flex w-full max-w-[640px] items-center justify-between px-5 pb-2 pt-6 sm:px-8">
        <BeamWordmark markWidth={22} markHeight={22} wordClassName="!text-[22px]" />
        <Link
          href={backHref}
          className="text-[14px] font-semibold text-[#1D5CE5]"
          data-testid="verify-back"
        >
          <span className="sm:hidden">Back</span>
          <span className="hidden sm:inline">
            {notHomeBanner ? 'Back to Browse' : 'Back to job'}
          </span>
        </Link>
      </header>

      <main className="mx-auto w-full max-w-[560px] px-5 pb-20 pt-6 sm:px-8 sm:pt-8">
        {notHomeBanner ? (
          <div
            className="mb-6 rounded-[10px] border border-[#D6E2F5] bg-[#F5F9FF] px-4 py-3.5"
            data-testid="verify-not-home"
            role="status"
          >
            <p className="text-[15px] font-bold text-[#071330]">{VERIFY_NOT_HOME_TITLE}</p>
            <p className="mt-1 text-[14px] leading-[1.5] text-[#273449]">
              {notHomeMessage || VERIFY_NOT_HOME_BODY}
            </p>
          </div>
        ) : null}

        <h1 className="font-display text-[28px] font-bold leading-[1.15] tracking-[-0.03em] text-[#071330] sm:text-[32px]">
          {VERIFY_FORM_TITLE}
        </h1>
        <p className="mt-3 text-[15px] leading-[1.55] text-[#3D4A5F]">
          {notHomeBanner ? VERIFY_FORM_RETRY_INTRO : VERIFY_FORM_INTRO}
        </p>
        <p className="mt-3 text-[15px] font-semibold leading-[1.45] tracking-[-0.01em] text-[#071330]">
          {VERIFY_TRUST_LINE}
        </p>

        <form className="mt-8 space-y-7" onSubmit={(e) => void onConfirm(e)} noValidate>
          <Field label="Email address" hint={VERIFY_EMAIL_HINT} htmlFor="verify-email">
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
            <Field label="Home address" hint={VERIFY_ADDRESS_HINT} htmlFor="verify-street">
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
            <input
              id="verify-apt"
              autoComplete="address-line2"
              value={apt}
              onChange={(e) => setApt(e.target.value)}
              placeholder="Apt or suite, optional"
              data-testid="verify-apt"
              className={`${inputClass} mt-2.5`}
            />
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
              Confirm you&apos;re home
            </p>
            <p className="mt-1.5 text-[13.5px] leading-[1.45] text-[#3D4A5F]">
              {VERIFY_CONFIRM_HINT}
            </p>
            <div
              className="mt-3 flex items-start gap-3 rounded-[10px] border border-[#E3E8EF] bg-white px-3.5 py-3.5"
              data-testid="verify-loc-box"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#F5F9FF] text-[#1D5CE5]">
                <MapPin className="h-5 w-5" strokeWidth={2} aria-hidden />
              </span>
              <div>
                <p className="text-[14px] font-bold text-[#071330]">{VERIFY_LOC_BOX_TITLE}</p>
                <p className="mt-1 text-[13.5px] leading-[1.45] text-[#3D4A5F]">
                  {VERIFY_LOC_BOX_BODY}
                </p>
              </div>
            </div>
          </div>

          {!notHomeBanner ? (
            <div
              className="rounded-[10px] border border-[#D6E2F5] bg-[#F5F9FF] px-4 py-4"
              data-testid="verify-privacy"
            >
              <p className="text-[14px] font-bold text-[#071330]">{VERIFY_PRIVACY_HEADING}</p>
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
            disabled={pending}
            data-testid="verify-submit"
            className="inline-flex h-[52px] w-full items-center justify-center rounded-[10px] bg-[#1D5CE5] text-[15px] font-semibold text-white hover:bg-[#1649BD] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? 'Checking…' : ctaLabel}
          </button>
          <p className="text-center text-[13.5px] text-[#5B6575]">
            {permissionDenied || notHomeBanner
              ? VERIFY_PERMISSION_HELPER
              : VERIFY_SUBMIT_HELPER}
          </p>
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
