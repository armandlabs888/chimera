'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Settings = {
  phone_e164: string | null
  phone_confirmed_at: string | null
  sms_opt_in: boolean
  quiet_hours_start: string | null
  quiet_hours_end: string | null
  daily_text_limit: number
}

type SetupPhase = 'phone' | 'code' | 'confirmed'

const DEFAULTS: Settings = {
  phone_e164: null,
  phone_confirmed_at: null,
  sms_opt_in: false,
  quiet_hours_start: null,
  quiet_hours_end: null,
  daily_text_limit: 5,
}

const DEFAULT_QUIET_START = '21:00:00'
const DEFAULT_QUIET_END = '07:00:00'
const LIMIT_PRESETS = [3, 5, 10] as const

function padTime(raw: string | null, fallback: string): string {
  if (!raw) return fallback
  const trimmed = raw.trim()
  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) return trimmed
  if (/^\d{2}:\d{2}$/.test(trimmed)) return `${trimmed}:00`
  return fallback
}

function formatTimeLabel(hhmmss: string): string {
  const [hStr, mStr] = hhmmss.split(':')
  let h = Number(hStr)
  const m = Number(mStr)
  const suffix = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${String(m).padStart(2, '0')} ${suffix}`
}

function buildHalfHourOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = []
  for (let minutes = 0; minutes < 24 * 60; minutes += 30) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
    options.push({ value, label: formatTimeLabel(value) })
  }
  return options
}

const TIME_OPTIONS = buildHalfHourOptions()

function ensureTimeOption(
  value: string,
  options: { value: string; label: string }[],
): { value: string; label: string }[] {
  if (options.some((o) => o.value === value)) return options
  return [...options, { value, label: formatTimeLabel(value) }].sort((a, b) =>
    a.value.localeCompare(b.value),
  )
}

function limitOptionsFor(current: number): number[] {
  if (LIMIT_PRESETS.includes(current as (typeof LIMIT_PRESETS)[number])) {
    return [...LIMIT_PRESETS]
  }
  return [...LIMIT_PRESETS, current].sort((a, b) => a - b)
}

function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, '')
}

/**
 * Optional urgent-job SMS controls. Opt-in defaults OFF and is never required
 * by onboarding or verification.
 */
export function HelperUrgentSmsSettings({
  userId,
  localOnly = false,
}: {
  userId: string
  /** Demo / preview without hitting Supabase. Still defaults opt-in to false. */
  localOnly?: boolean
}) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS)
  const [phoneInput, setPhoneInput] = useState('')
  const [codeDigits, setCodeDigits] = useState<string[]>(['', '', '', '', '', ''])
  const [phase, setPhase] = useState<SetupPhase>('phone')
  const [sentPhoneDisplay, setSentPhoneDisplay] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [sentHint, setSentHint] = useState('We sent a 6-digit code to this number.')
  const codeRefs = useRef<Array<HTMLInputElement | null>>([])
  const headingId = useId()
  const limitLabelId = useId()

  const codeInput = codeDigits.join('')
  const confirmed = Boolean(settings.phone_confirmed_at && settings.phone_e164)
  const canOptIn = confirmed && phase === 'confirmed'
  const textsOn = Boolean(settings.sms_opt_in && canOptIn)

  const quietStart = padTime(settings.quiet_hours_start, DEFAULT_QUIET_START)
  const quietEnd = padTime(settings.quiet_hours_end, DEFAULT_QUIET_END)
  const quietStartOptions = ensureTimeOption(quietStart, TIME_OPTIONS)
  const quietEndOptions = ensureTimeOption(quietEnd, TIME_OPTIONS)
  const limitChoices = limitOptionsFor(settings.daily_text_limit)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      if (localOnly) {
        setSettings(DEFAULTS)
        setPhoneInput('')
        setPhase('phone')
        setCodeDigits(['', '', '', '', '', ''])
        setSentPhoneDisplay('')
        return
      }
      const supabase = createClient()
      const { data, error: readError } = await supabase
        .from('helper_urgent_sms_settings')
        .select(
          'phone_e164, phone_confirmed_at, sms_opt_in, quiet_hours_start, quiet_hours_end, daily_text_limit',
        )
        .eq('profile_id', userId)
        .maybeSingle()
      if (readError) throw readError
      if (data) {
        const next: Settings = {
          phone_e164: data.phone_e164,
          phone_confirmed_at: data.phone_confirmed_at,
          sms_opt_in: Boolean(data.sms_opt_in),
          quiet_hours_start: data.quiet_hours_start,
          quiet_hours_end: data.quiet_hours_end,
          daily_text_limit: data.daily_text_limit ?? 5,
        }
        setSettings(next)
        setPhoneInput(data.phone_e164 || '')
        if (next.phone_confirmed_at && next.phone_e164) {
          setPhase('confirmed')
        } else {
          setPhase('phone')
        }
      } else {
        await supabase.from('helper_urgent_sms_settings').insert({
          profile_id: userId,
          sms_opt_in: false,
        })
        setSettings(DEFAULTS)
        setPhoneInput('')
        setPhase('phone')
      }
      setCodeDigits(['', '', '', '', '', ''])
      setSentPhoneDisplay('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load SMS settings')
    } finally {
      setLoading(false)
    }
  }, [userId, localOnly])

  useEffect(() => {
    void load()
  }, [load])

  async function savePrefs(patch: Partial<Settings>) {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const next = { ...settings, ...patch }
      if (!localOnly) {
        const supabase = createClient()
        const { error: writeError } = await supabase
          .from('helper_urgent_sms_settings')
          .update({
            sms_opt_in: next.sms_opt_in,
            quiet_hours_start: next.quiet_hours_start,
            quiet_hours_end: next.quiet_hours_end,
            daily_text_limit: next.daily_text_limit,
          })
          .eq('profile_id', userId)
        if (writeError) throw writeError
      }
      setSettings(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  async function onSendCode(resend = false) {
    setSendingCode(true)
    setError('')
    setMessage('')
    try {
      const phone = phoneInput.trim()
      if (!phone) {
        throw new Error('Enter a valid phone number.')
      }
      if (localOnly) {
        setSentPhoneDisplay(phone)
        setPhase('code')
        if (!resend) setCodeDigits(['', '', '', '', '', ''])
        setSentHint(
          resend
            ? `We sent a new code to ${phone}.`
            : 'We sent a 6-digit code to this number.',
        )
        requestAnimationFrame(() => codeRefs.current[0]?.focus())
        return
      }
      const res = await fetch('/api/helper-sms/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const data = (await res.json()) as {
        error?: string
        skipped?: boolean
        debugCode?: string
      }
      if (!res.ok) throw new Error(data.error || 'Could not send code')
      setSentPhoneDisplay(phone)
      setPhase('code')
      if (!resend) setCodeDigits(['', '', '', '', '', ''])
      setSentHint(
        resend
          ? `We sent a new code to ${phone}.`
          : 'We sent a 6-digit code to this number.',
      )
      if (data.skipped) {
        setMessage(
          data.debugCode
            ? `Twilio is not configured yet. Dev code: ${data.debugCode}`
            : 'Twilio is not configured yet. Code was not sent.',
        )
      }
      requestAnimationFrame(() => codeRefs.current[0]?.focus())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send code')
    } finally {
      setSendingCode(false)
    }
  }

  async function onConfirmCode() {
    setConfirming(true)
    setError('')
    setMessage('')
    try {
      if (localOnly) {
        if (digitsOnly(codeInput).length !== 6) {
          throw new Error('Enter the 6-digit code from your text.')
        }
        const phone = phoneInput.trim() || sentPhoneDisplay || '+15555550100'
        setSettings((prev) => ({
          ...prev,
          phone_e164: phone,
          phone_confirmed_at: new Date().toISOString(),
          sms_opt_in: false,
        }))
        setPhoneInput(phone)
        setCodeDigits(['', '', '', '', '', ''])
        setPhase('confirmed')
        return
      }
      const res = await fetch('/api/helper-sms/confirm-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneInput, code: codeInput }),
      })
      const data = (await res.json()) as { error?: string; note?: string }
      if (!res.ok) throw new Error(data.error || 'Could not confirm')
      setCodeDigits(['', '', '', '', '', ''])
      if (data.note) setMessage(data.note)
      await load()
      setPhase('confirmed')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not confirm')
    } finally {
      setConfirming(false)
    }
  }

  function startChangeNumber() {
    setError('')
    setMessage('')
    setCodeDigits(['', '', '', '', '', ''])
    setSentPhoneDisplay('')
    setPhase('phone')
    setPhoneInput('')
    // Lock the toggle until the (possibly new) number is confirmed again.
    // Opt-in never auto-enables; turn it off if it was on.
    setSettings((prev) => ({
      ...prev,
      sms_opt_in: false,
      // Keep phone_e164/confirmed_at in storage until a new confirm overwrites them,
      // but treat the UI as unconfirmed while phase is phone/code.
    }))
    if (settings.sms_opt_in && !localOnly) {
      void (async () => {
        try {
          const supabase = createClient()
          await supabase
            .from('helper_urgent_sms_settings')
            .update({ sms_opt_in: false })
            .eq('profile_id', userId)
        } catch {
          // Non-blocking; UI already shows opt-in off.
        }
      })()
    }
  }

  function onToggle() {
    if (!canOptIn || saving) return
    const turningOn = !settings.sms_opt_in
    const patch: Partial<Settings> = { sms_opt_in: turningOn }
    if (turningOn) {
      // Surface the UI defaults into storage when quiet hours were never set.
      if (!settings.quiet_hours_start) patch.quiet_hours_start = DEFAULT_QUIET_START
      if (!settings.quiet_hours_end) patch.quiet_hours_end = DEFAULT_QUIET_END
    }
    void savePrefs(patch)
  }

  function setDigitAt(index: number, raw: string) {
    const digit = digitsOnly(raw).slice(-1)
    setCodeDigits((prev) => {
      const next = [...prev]
      next[index] = digit
      return next
    })
    if (digit && index < 5) {
      codeRefs.current[index + 1]?.focus()
    }
  }

  function onDigitKeyDown(index: number, key: string) {
    if (key === 'Backspace' && !codeDigits[index] && index > 0) {
      codeRefs.current[index - 1]?.focus()
    }
  }

  function onDigitPaste(text: string) {
    const digits = digitsOnly(text).slice(0, 6).split('')
    if (!digits.length) return
    setCodeDigits((prev) => {
      const next = [...prev]
      for (let i = 0; i < 6; i += 1) next[i] = digits[i] || ''
      return next
    })
    const focusAt = Math.min(digits.length, 5)
    codeRefs.current[focusAt]?.focus()
  }

  if (loading) {
    return (
      <div
        id="helper-urgent-sms"
        className="account-hc-card account-hc-sms-settings"
        data-testid="helper-sms-settings-loading"
      >
        <p className="meta">Loading SMS settings…</p>
      </div>
    )
  }

  return (
    <section
      id="helper-urgent-sms"
      className="account-hc-card account-hc-sms-settings"
      data-testid="helper-sms-settings"
      data-sms-phase={phase}
      data-sms-on={textsOn ? 'true' : 'false'}
      aria-labelledby={headingId}
    >
      <div className="account-hc-sms-head">
        <div className="account-hc-sms-copy">
          <h2 id={headingId}>Urgent job texts</h2>
          <p>Get a text when a neighbor nearby needs help right now.</p>
        </div>
        <div className="account-hc-sms-controls">
          <div className="account-hc-sms-switch-row">
            <span
              className={`account-hc-sms-status-pill${textsOn ? ' is-on' : ''}`}
              data-testid="helper-sms-status-pill"
            >
              {textsOn ? 'On' : 'Off'}
            </span>
            <button
              type="button"
              className={`account-hc-sms-switch${!canOptIn ? ' is-disabled' : ''}`}
              role="switch"
              aria-checked={textsOn}
              aria-disabled={!canOptIn || saving}
              aria-label="Urgent job texts"
              disabled={!canOptIn || saving}
              onClick={onToggle}
              data-testid="helper-sms-opt-in"
            >
              <i aria-hidden="true" />
            </button>
          </div>
          {!canOptIn ? (
            <p className="account-hc-sms-switch-hint" data-testid="helper-sms-opt-in-locked">
              Confirm your number first.
            </p>
          ) : null}
        </div>
      </div>

      <div className="account-hc-sms-body">
        {phase !== 'confirmed' ? (
          <div className="account-hc-sms-setup" data-testid="helper-sms-setup">
            <div
              className={`account-hc-sms-step${phase === 'phone' ? ' is-active' : ''}${
                phase === 'code' ? ' is-done' : ''
              }`}
            >
              <span className="account-hc-sms-step-num" aria-hidden="true">
                1
              </span>
              <div>
                <p className="account-hc-sms-step-label" id="helper-sms-phone-label">
                  Phone number
                </p>
                {phase === 'phone' ? (
                  <div className="account-hc-sms-phone-row">
                    <input
                      id="helper-sms-phone"
                      className="account-hc-sms-input"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="+1 408 555 0100"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      aria-labelledby="helper-sms-phone-label"
                      data-testid="helper-sms-phone"
                    />
                    <button
                      type="button"
                      className="account-hc-btn"
                      disabled={sendingCode}
                      onClick={() => void onSendCode(false)}
                      data-testid="helper-sms-send-code"
                    >
                      {sendingCode ? 'Sending…' : 'Send code'}
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="account-hc-sms-sent-number" data-testid="helper-sms-sent-number">
                      {sentPhoneDisplay || phoneInput}
                    </p>
                    <p className="account-hc-sms-step-hint">{sentHint}</p>
                  </>
                )}
              </div>
            </div>

            {phase === 'code' ? (
              <div className="account-hc-sms-step is-active" data-testid="helper-sms-code-step">
                <span className="account-hc-sms-step-num" aria-hidden="true">
                  2
                </span>
                <div>
                  <p className="account-hc-sms-step-label" id="helper-sms-code-label">
                    Enter the 6-digit code
                  </p>
                  <div className="account-hc-sms-code-row">
                    <div className="account-hc-sms-code-boxes" role="group" aria-labelledby="helper-sms-code-label">
                      {codeDigits.map((digit, index) => (
                        <input
                          key={index}
                          ref={(el) => {
                            codeRefs.current[index] = el
                          }}
                          type="text"
                          inputMode="numeric"
                          autoComplete={index === 0 ? 'one-time-code' : 'off'}
                          maxLength={1}
                          value={digit}
                          aria-label={`Digit ${index + 1}`}
                          data-testid={index === 0 ? 'helper-sms-code' : `helper-sms-code-${index + 1}`}
                          onChange={(e) => setDigitAt(index, e.target.value)}
                          onKeyDown={(e) => onDigitKeyDown(index, e.key)}
                          onPaste={(e) => {
                            const text = e.clipboardData.getData('text')
                            if (!digitsOnly(text)) return
                            e.preventDefault()
                            onDigitPaste(text)
                          }}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      className="account-hc-btn"
                      disabled={confirming || digitsOnly(codeInput).length < 6}
                      onClick={() => void onConfirmCode()}
                      data-testid="helper-sms-confirm-code"
                    >
                      {confirming ? 'Checking…' : 'Confirm'}
                    </button>
                  </div>
                  <div className="account-hc-sms-step-links">
                    <button
                      type="button"
                      className="account-hc-sms-text-link"
                      disabled={sendingCode}
                      onClick={() => void onSendCode(true)}
                      data-testid="helper-sms-resend"
                    >
                      Resend code
                    </button>
                    <button
                      type="button"
                      className="account-hc-sms-text-link"
                      onClick={startChangeNumber}
                      data-testid="helper-sms-change-number"
                    >
                      Change number
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="account-hc-sms-confirmed-row" data-testid="helper-sms-confirmed">
            <span className="account-hc-sms-confirmed-check" aria-hidden="true">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            <div className="account-hc-sms-confirmed-copy">
              <p className="num" data-testid="helper-sms-confirmed-phone">
                {settings.phone_e164}
              </p>
              <p className="ok">Confirmed</p>
            </div>
            <button
              type="button"
              className="account-hc-sms-text-link change"
              onClick={startChangeNumber}
              data-testid="helper-sms-change-confirmed"
            >
              Change
            </button>
          </div>
        )}

        {textsOn ? (
          <div className="account-hc-sms-prefs" data-testid="helper-sms-prefs">
            <div>
              <label className="account-hc-sms-pref-label" htmlFor="helper-sms-quiet-start">
                Quiet hours
              </label>
              <div className="account-hc-sms-hours-row">
                <span className="word">From</span>
                <select
                  id="helper-sms-quiet-start"
                  className="account-hc-sms-select"
                  aria-label="Quiet hours start"
                  value={quietStart}
                  disabled={saving}
                  onChange={(e) => void savePrefs({ quiet_hours_start: e.target.value })}
                  data-testid="helper-sms-quiet-start"
                >
                  {quietStartOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <span className="word">to</span>
                <select
                  id="helper-sms-quiet-end"
                  className="account-hc-sms-select"
                  aria-label="Quiet hours end"
                  value={quietEnd}
                  disabled={saving}
                  onChange={(e) => void savePrefs({ quiet_hours_end: e.target.value })}
                  data-testid="helper-sms-quiet-end"
                >
                  {quietEndOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="account-hc-sms-pref-hint">No texts during this window, Pacific time.</p>
            </div>
            <div>
              <p className="account-hc-sms-pref-label" id={limitLabelId}>
                Daily text limit
              </p>
              <div
                className="account-hc-sms-seg"
                role="group"
                aria-labelledby={limitLabelId}
                data-testid="helper-sms-daily-limit"
              >
                {limitChoices.map((n) => {
                  const selected = settings.daily_text_limit === n
                  return (
                    <button
                      key={n}
                      type="button"
                      className={selected ? 'is-on' : undefined}
                      aria-pressed={selected}
                      disabled={saving}
                      data-limit={n}
                      onClick={() => void savePrefs({ daily_text_limit: n })}
                    >
                      {n}
                    </button>
                  )
                })}
              </div>
              <p className="account-hc-sms-pref-hint">
                Up to {settings.daily_text_limit} texts a day.
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="account-hc-sms-error" role="alert" data-testid="helper-sms-error">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="account-hc-sms-msg" data-testid="helper-sms-message">
          {message}
        </p>
      ) : null}

      <p className="account-hc-sms-fine-print">
        Optional and off by default. Never required to help or get verified. Msg &amp; data rates may
        apply. Reply STOP to opt out.
      </p>
    </section>
  )
}
