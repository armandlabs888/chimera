'use client'

import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, FormErrorAlert } from '@/components/ui'
import { humanizeSaveError } from '@/lib/formErrors'
import { maskPhoneE164 } from '@/lib/phone/format'

type Phase = 'default' | 'waiting' | 'verified' | 'fallback'

type SessionPayload = {
  ok?: boolean
  status?: string
  smsUri?: string
  qrDataUrl?: string
  maskedPhone?: string
  phoneE164?: string
  error?: string
  twilioMissing?: boolean
  debugCode?: string
}

function usePreferMobileConfirm(): boolean {
  const [mobile, setMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const touch =
      typeof navigator !== 'undefined' &&
      (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
        (navigator.maxTouchPoints ?? 0) > 1)

    const update = () => setMobile(mq.matches || touch)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return mobile
}

export function ConfirmPhoneStep({
  stepLabel,
  step,
  total,
  onBack,
  onContinue,
  demoMode = false,
}: {
  stepLabel: string
  step: number
  total: number
  onBack: () => void
  onContinue: (info: { maskedPhone: string; phoneE164?: string }) => void
  /** Demo / preview: skip live APIs and allow a simulated confirm. */
  demoMode?: boolean
}) {
  const preferMobile = usePreferMobileConfirm()
  const [phase, setPhase] = useState<Phase>('default')
  const [smsUri, setSmsUri] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [maskedPhone, setMaskedPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [fallbackPhone, setFallbackPhone] = useState('')
  const [fallbackCode, setFallbackCode] = useState('')
  const [sending, setSending] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [hint, setHint] = useState('')
  const [phoneE164, setPhoneE164] = useState('')

  const bars = useMemo(() => Array.from({ length: total }, (_, i) => i + 1), [total])

  const markVerified = useCallback((masked: string, e164?: string) => {
    setMaskedPhone(masked)
    if (e164) setPhoneE164(e164)
    setPhase('verified')
    setError('')
  }, [])

  const startSession = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      if (demoMode) {
        const demoUri = 'sms:+15555550100?&body=Bunk%20code%20482913'
        setSmsUri(demoUri)
        // Minimal inline SVG QR stand-in for demo screenshots (pattern blocks).
        setQrDataUrl(
          'data:image/svg+xml,' +
            encodeURIComponent(
              `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220"><rect width="220" height="220" fill="#fff"/><rect x="16" y="16" width="56" height="56" fill="#071330"/><rect x="148" y="16" width="56" height="56" fill="#071330"/><rect x="16" y="148" width="56" height="56" fill="#071330"/><rect x="80" y="80" width="60" height="60" fill="#071330"/><rect x="28" y="28" width="32" height="32" fill="#fff"/><rect x="160" y="28" width="32" height="32" fill="#fff"/><rect x="28" y="160" width="32" height="32" fill="#fff"/><rect x="36" y="36" width="16" height="16" fill="#071330"/><rect x="168" y="36" width="16" height="16" fill="#071330"/><rect x="36" y="168" width="16" height="16" fill="#071330"/><rect x="100" y="40" width="12" height="12" fill="#071330"/><rect x="124" y="52" width="12" height="12" fill="#071330"/><rect x="40" y="100" width="12" height="12" fill="#071330"/><rect x="160" y="100" width="12" height="12" fill="#071330"/><rect x="100" y="160" width="12" height="12" fill="#071330"/><rect x="148" y="148" width="24" height="24" fill="#071330"/><rect x="180" y="180" width="16" height="16" fill="#071330"/></svg>`,
            ),
        )
        setPhase('default')
        return
      }

      const res = await fetch('/api/phone/session', { method: 'POST' })
      const data = (await res.json()) as SessionPayload
      if (!res.ok) {
        setError(humanizeSaveError(data.error, 'Could not start phone confirmation.'))
        setPhase('fallback')
        return
      }
      if (data.status === 'verified' && (data.maskedPhone || data.phoneE164)) {
        markVerified(
          data.maskedPhone || maskPhoneE164(data.phoneE164 || ''),
          data.phoneE164,
        )
        return
      }
      setSmsUri(data.smsUri || '')
      setQrDataUrl(data.qrDataUrl || '')
      setPhase('default')
      if (data.debugCode) {
        setHint(`Dev code: ${data.debugCode}`)
      }
    } catch {
      setError('Could not start phone confirmation.')
      setPhase('fallback')
    } finally {
      setLoading(false)
    }
  }, [demoMode, markVerified])

  useEffect(() => {
    void startSession()
  }, [startSession])

  useEffect(() => {
    if (phase !== 'waiting' && phase !== 'default') return
    if (demoMode) return
    if (!smsUri && phase === 'default') return

    let cancelled = false
    const tick = async () => {
      try {
        const res = await fetch('/api/phone/session', { method: 'GET' })
        const data = (await res.json()) as SessionPayload
        if (cancelled) return
        if (data.status === 'verified' && (data.maskedPhone || data.phoneE164)) {
          markVerified(
            data.maskedPhone || maskPhoneE164(data.phoneE164 || ''),
            data.phoneE164,
          )
        }
      } catch {
        /* ignore poll errors */
      }
    }

    const id = window.setInterval(() => void tick(), 2500)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [phase, demoMode, smsUri, markVerified])

  function openSmsLink() {
    if (!smsUri) {
      setError('Confirmation link is not ready yet.')
      return
    }
    setPhase('waiting')
    window.location.href = smsUri
  }

  async function onSendFallback() {
    setSending(true)
    setError('')
    setHint('')
    try {
      if (demoMode) {
        setCodeSent(true)
        setHint('Demo mode: enter any 6 digits, then Confirm.')
        return
      }
      const res = await fetch('/api/phone/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fallbackPhone }),
      })
      const data = (await res.json()) as {
        error?: string
        skipped?: boolean
        debugCode?: string
      }
      if (!res.ok) throw new Error(data.error || 'Could not send code')
      setCodeSent(true)
      if (data.skipped) {
        setHint(
          data.debugCode
            ? `Twilio is not configured yet. Dev code: ${data.debugCode}`
            : 'Twilio is not configured yet. Code was not sent.',
        )
      } else {
        setHint('We sent a 6-digit code to this number.')
      }
    } catch (err) {
      setError(humanizeSaveError(err, 'Could not send code.'))
    } finally {
      setSending(false)
    }
  }

  async function onConfirmFallback() {
    setConfirming(true)
    setError('')
    try {
      if (demoMode) {
        if (fallbackCode.replace(/\D/g, '').length !== 6) {
          throw new Error('Enter the 6-digit code from your text.')
        }
        const e164 = fallbackPhone || '+15555550123'
        markVerified(maskPhoneE164(e164), e164)
        return
      }
      const res = await fetch('/api/phone/confirm-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fallbackPhone, code: fallbackCode }),
      })
      const data = (await res.json()) as {
        error?: string
        maskedPhone?: string
        phoneE164?: string
      }
      if (!res.ok) throw new Error(data.error || 'Could not confirm')
      markVerified(
        data.maskedPhone || maskPhoneE164(data.phoneE164 || fallbackPhone),
        data.phoneE164 || fallbackPhone,
      )
    } catch (err) {
      setError(humanizeSaveError(err, 'Could not confirm.'))
    } finally {
      setConfirming(false)
    }
  }

  function simulateDemoWaiting() {
    setPhase('waiting')
    window.setTimeout(() => {
      markVerified('+1•••••1212', '+15555551212')
    }, 1600)
  }

  return (
    <div
      data-testid="onboarding-step-phone"
      data-phase={phase}
      className="account-hc-wizard single animate-fade-up"
    >
      <div className="account-hc-card account-hc-rules" style={{ background: '#fff' }}>
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
          Confirm your phone
        </h1>
        <p className="account-hc-lede" style={{ color: '#4A5568' }}>
          Every account on Bunk belongs to a real person with a real phone. That stops fake and
          duplicate accounts and keeps the community safe.
        </p>
        <p className="mt-2 text-[14px] leading-[1.45] text-[#4A5568]">
          Your number stays private and is not shown on your profile.
        </p>

        {loading ? (
          <div className="mt-8 flex items-center gap-2 text-[14px] text-[#4A5568]" aria-busy="true">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Preparing confirmation…
          </div>
        ) : null}

        {!loading && phase === 'verified' ? (
          <div
            className="mt-8 rounded-[12px] border border-[#E3E8EF] bg-[#F7F9FC] px-4 py-4"
            data-testid="onboarding-phone-verified"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#1E8E3E] text-white">
                <Check className="h-4 w-4" strokeWidth={3} aria-hidden />
              </span>
              <div>
                <p className="text-[15px] font-semibold text-[#071330]">Phone confirmed</p>
                <p className="mt-1 text-[14px] text-[#4A5568]" data-testid="onboarding-phone-masked">
                  {maskedPhone}
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="lg"
              className="account-hc-btn account-hc-btn-lg mt-5 w-full bg-[#1D5CE5] text-white shadow-none hover:bg-[#1649BD]"
              onClick={() => onContinue({ maskedPhone, phoneE164: phoneE164 || undefined })}
              data-testid="onboarding-phone-continue"
            >
              Continue
            </Button>
          </div>
        ) : null}

        {!loading && phase === 'waiting' ? (
          <div
            className="mt-8 flex items-center gap-3 rounded-[12px] border border-[#E3E8EF] bg-[#F7F9FC] px-4 py-4 text-[14px] text-[#071330]"
            data-testid="onboarding-phone-waiting"
          >
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-[#1D5CE5]" aria-hidden />
            <span>Waiting for your text…</span>
          </div>
        ) : null}

        {!loading && (phase === 'default' || phase === 'waiting') && preferMobile ? (
          <div className="mt-8" data-testid="onboarding-phone-mobile">
            <Button
              type="button"
              size="lg"
              className="account-hc-btn account-hc-btn-lg w-full bg-[#1D5CE5] text-white shadow-none hover:bg-[#1649BD]"
              onClick={demoMode ? simulateDemoWaiting : openSmsLink}
              data-testid="onboarding-phone-text-us"
            >
              Text us to verify
            </Button>
            <button
              type="button"
              className="mt-4 text-[14px] font-medium text-[#1649BD]"
              onClick={() => {
                setPhase('fallback')
                setError('')
              }}
              data-testid="onboarding-phone-cant-scan"
            >
              Can&apos;t scan? Get a code by text instead
            </button>
            <p className="mt-3 text-[12px] text-[#4A5568]">Standard message rates may apply.</p>
          </div>
        ) : null}

        {!loading &&
        (phase === 'default' || phase === 'waiting') &&
        !preferMobile ? (
          <div className="mt-8" data-testid="onboarding-phone-desktop">
            <div className="grid gap-6 sm:grid-cols-[220px_1fr] sm:items-start">
              <div className="rounded-[12px] border border-[#E3E8EF] bg-[#F7F9FC] p-4">
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrDataUrl}
                    alt="QR code to confirm your phone by text"
                    width={220}
                    height={220}
                    className="mx-auto h-auto w-full max-w-[220px]"
                    data-testid="onboarding-phone-qr"
                  />
                ) : (
                  <div className="flex h-[220px] items-center justify-center text-[13px] text-[#4A5568]">
                    QR unavailable
                  </div>
                )}
                <p className="mt-3 text-center text-[13px] font-semibold text-[#071330]">
                  Scan with your phone camera
                </p>
                <p className="mt-1 text-center text-[12px] leading-[1.45] text-[#4A5568]">
                  Your Messages app will open with a pre-filled text. Send it to confirm.
                </p>
              </div>

              <div>
                <p className="text-[14px] font-semibold text-[#071330]">How to confirm</p>
                <ol className="mt-3 list-decimal space-y-2 pl-5 text-[14px] leading-[1.45] text-[#4A5568]">
                  <li>Open your phone camera</li>
                  <li>Scan the code</li>
                  <li>Send the text that opens</li>
                </ol>
                {demoMode ? (
                  <Button
                    type="button"
                    size="lg"
                    className="account-hc-btn account-hc-btn-lg mt-5 w-full bg-[#1D5CE5] text-white shadow-none hover:bg-[#1649BD]"
                    onClick={simulateDemoWaiting}
                    data-testid="onboarding-phone-demo-wait"
                  >
                    Simulate send
                  </Button>
                ) : null}
                <button
                  type="button"
                  className="mt-5 text-[14px] font-medium text-[#1649BD]"
                  onClick={() => {
                    setPhase('fallback')
                    setError('')
                  }}
                  data-testid="onboarding-phone-cant-scan"
                >
                  Can&apos;t scan? Get a code by text instead
                </button>
                <p className="mt-3 text-[12px] text-[#4A5568]">Standard message rates may apply.</p>
              </div>
            </div>
          </div>
        ) : null}

        {!loading && phase === 'fallback' ? (
          <div className="mt-8" data-testid="onboarding-phone-fallback">
            <label className="account-hc-label" htmlFor="onboarding-phone-input">
              Phone number
            </label>
            <input
              id="onboarding-phone-input"
              className="account-hc-input mt-2"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+1 408 555 0100"
              value={fallbackPhone}
              onChange={(e) => setFallbackPhone(e.target.value)}
              data-testid="onboarding-phone-input"
            />
            <Button
              type="button"
              size="lg"
              className="account-hc-btn account-hc-btn-lg mt-3 w-full bg-[#1D5CE5] text-white shadow-none hover:bg-[#1649BD]"
              loading={sending}
              onClick={() => void onSendFallback()}
              data-testid="onboarding-phone-send-code"
            >
              {codeSent ? 'Resend code' : 'Send code'}
            </Button>

            {codeSent ? (
              <div className="mt-5">
                <label className="account-hc-label" htmlFor="onboarding-phone-code">
                  6-digit code
                </label>
                <input
                  id="onboarding-phone-code"
                  className="account-hc-input mt-2"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="Enter code"
                  value={fallbackCode}
                  onChange={(e) => setFallbackCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  data-testid="onboarding-phone-code"
                />
                <Button
                  type="button"
                  size="lg"
                  className="account-hc-btn account-hc-btn-lg mt-3 w-full bg-[#1D5CE5] text-white shadow-none hover:bg-[#1649BD]"
                  loading={confirming}
                  onClick={() => void onConfirmFallback()}
                  data-testid="onboarding-phone-confirm-code"
                >
                  Confirm
                </Button>
              </div>
            ) : null}

            <button
              type="button"
              className="mt-5 text-[14px] font-medium text-[#1649BD]"
              onClick={() => {
                setPhase('default')
                setError('')
                void startSession()
              }}
              data-testid="onboarding-phone-back-to-qr"
            >
              Back to scan
            </button>
            <p className="mt-3 text-[12px] text-[#4A5568]">Standard message rates may apply.</p>
          </div>
        ) : null}

        {hint ? (
          <p className="mt-4 text-[13px] text-[#4A5568]" data-testid="onboarding-phone-hint">
            {hint}
          </p>
        ) : null}

        {error ? (
          <FormErrorAlert
            className="mt-4"
            message={error}
            testId="onboarding-phone-error"
          />
        ) : null}

        {phase !== 'verified' ? (
          <div className="account-hc-rules-actions mt-8">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="account-hc-btn account-hc-btn-secondary account-hc-btn-lg shadow-none"
              onClick={onBack}
              data-testid="onboarding-phone-back"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
