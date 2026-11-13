'use client'

import { Check, ChevronLeft, MapPin } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState, type FormEvent } from 'react'
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
  VERIFY_NEXT_HEADING,
  VERIFY_NEXT_STEPS,
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
import '@/components/account/account-hc.css'
import '@/components/verification/verify-hc.css'

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
      <div className="account-hc" data-testid="verify-loading">
        <div className="account-hc-wrap account-hc-page account-hc-verify flex items-center justify-center py-24">
          <p className="text-[22px] font-semibold text-[#071330]" aria-busy="true">
            HouseCall
          </p>
        </div>
      </div>
    )
  }

  if (gate === 'approved' && helperVerification) {
    return (
      <div className="account-hc" data-testid="verify-approved">
        <div className="account-hc-wrap account-hc-page account-hc-verify">
          <div className="account-hc-verify-success">
            <div className="account-hc-verify-success-mark">
              <Check className="h-7 w-7" strokeWidth={2.25} aria-hidden />
            </div>
            <h1 className="account-hc-verify-success-title">{VERIFY_SUCCESS_TITLE}</h1>
            <p className="account-hc-verify-success-body">{VERIFY_SUCCESS_BODY}</p>

            <div
              className="account-hc-card account-hc-verify-summary"
              data-testid="verify-approved-summary"
            >
              <div className="account-hc-verify-summary-row account-hc-verify-summary-status">
                <div>
                  <p className="lbl">Status</p>
                  <p className="val">Verified</p>
                </div>
                <span className="account-hc-verify-summary-chip">Just now</span>
              </div>
              <SummaryRow label="Email" value={helperVerification.email} />
              <SummaryRow
                label="Home address"
                value={formatVerificationAddress(helperVerification)}
              />
            </div>

            <Link
              href={backHref}
              data-testid="verify-back-job"
              className="account-hc-verify-success-cta"
            >
              Back to job
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const ctaLabel = notHomeBanner || permissionDenied ? VERIFY_CTA_RETRY : VERIFY_CTA_CONFIRM

  return (
    <div className="account-hc" data-testid="verify-form">
      <div className="account-hc-wrap account-hc-page account-hc-verify">
        <Link href={backHref} className="account-hc-verify-back" data-testid="verify-back">
          <ChevronLeft className="chev h-4 w-4" strokeWidth={2.25} aria-hidden />
          Back to job
        </Link>

        {notHomeBanner ? (
          <div
            className="account-hc-verify-banner"
            data-testid="verify-not-home"
            role="status"
          >
            <p className="t">{VERIFY_NOT_HOME_TITLE}</p>
            <p className="b">{notHomeMessage || VERIFY_NOT_HOME_BODY}</p>
          </div>
        ) : null}

        <h1 className="account-hc-hero-title">{VERIFY_FORM_TITLE}</h1>
        <p className="account-hc-hero-sub">
          {notHomeBanner ? VERIFY_FORM_RETRY_INTRO : VERIFY_FORM_INTRO}
        </p>
        <p className="account-hc-verify-trust">{VERIFY_TRUST_LINE}</p>

        <div className="account-hc-verify-layout">
          <form
            className="account-hc-card account-hc-verify-form"
            onSubmit={(e) => void onConfirm(e)}
            noValidate
          >
            <section className="account-hc-verify-section" aria-labelledby="verify-email-heading">
              <h2 className="account-hc-verify-section-title" id="verify-email-heading">
                Email address
              </h2>
              <p className="account-hc-verify-section-hint">{VERIFY_EMAIL_HINT}</p>
              <div className="account-hc-verify-field">
                <label htmlFor="verify-email" className="sr-only">
                  Email address
                </label>
                <input
                  id="verify-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="verify-email"
                  className="account-hc-verify-input"
                />
              </div>
            </section>

            <section className="account-hc-verify-section" aria-labelledby="verify-address-heading">
              <h2 className="account-hc-verify-section-title" id="verify-address-heading">
                Home address
              </h2>
              <p className="account-hc-verify-section-hint">{VERIFY_ADDRESS_HINT}</p>
              <div className="account-hc-verify-field account-hc-verify-addr-stack">
                <input
                  id="verify-street"
                  required
                  autoComplete="street-address"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Street address"
                  data-testid="verify-street"
                  className="account-hc-verify-input"
                  aria-label="Street address"
                />
                <input
                  id="verify-apt"
                  autoComplete="address-line2"
                  value={apt}
                  onChange={(e) => setApt(e.target.value)}
                  placeholder="Apt or suite, optional"
                  data-testid="verify-apt"
                  className="account-hc-verify-input"
                  aria-label="Apt or suite, optional"
                />
                <div className="account-hc-verify-addr-row">
                  <input
                    id="verify-city"
                    required
                    autoComplete="address-level2"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                    data-testid="verify-city"
                    className="account-hc-verify-input"
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
                    className="account-hc-verify-input"
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
                    className="account-hc-verify-input"
                    aria-label="ZIP"
                  />
                </div>
              </div>
            </section>

            <section className="account-hc-verify-section" aria-labelledby="verify-confirm-heading">
              <h2 className="account-hc-verify-section-title" id="verify-confirm-heading">
                Confirm you&apos;re home
              </h2>
              <p className="account-hc-verify-section-hint">{VERIFY_CONFIRM_HINT}</p>
              <div className="account-hc-verify-info-row" data-testid="verify-loc-box">
                <span className="account-hc-verify-info-ico" aria-hidden>
                  <MapPin className="h-4 w-4" strokeWidth={2} />
                </span>
                <div>
                  <p className="t">{VERIFY_LOC_BOX_TITLE}</p>
                  <p className="b">{VERIFY_LOC_BOX_BODY}</p>
                </div>
              </div>

              {error ? (
                <p className="account-hc-verify-error" role="alert" data-testid="verify-error">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={pending}
                data-testid="verify-submit"
                className="account-hc-verify-confirm-btn"
              >
                {pending ? 'Checking…' : ctaLabel}
              </button>
              <p className="account-hc-verify-footnote">
                {permissionDenied || notHomeBanner
                  ? VERIFY_PERMISSION_HELPER
                  : VERIFY_SUBMIT_HELPER}
              </p>
            </section>
          </form>

          <aside className="account-hc-verify-sidebar">
            <div
              className="account-hc-card account-hc-verify-side-card"
              data-testid="verify-privacy"
            >
              <h2>{VERIFY_PRIVACY_HEADING}</h2>
              <ul className="account-hc-verify-uses">
                {VERIFY_PRIVACY.map((line) => (
                  <li key={line}>
                    <Check className="check h-4 w-4" strokeWidth={2.5} aria-hidden />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div
              className="account-hc-card account-hc-verify-side-card"
              data-testid="verify-next"
            >
              <h2>{VERIFY_NEXT_HEADING}</h2>
              <ol className="account-hc-verify-next">
                {VERIFY_NEXT_STEPS.map((step, i) => (
                  <li key={step}>
                    <span className="account-hc-verify-step-num" aria-hidden>
                      {i + 1}
                    </span>
                    <span className="t">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="account-hc-verify-summary-row">
      <p className="lbl">{label}</p>
      <p className="val">{value}</p>
    </div>
  )
}
