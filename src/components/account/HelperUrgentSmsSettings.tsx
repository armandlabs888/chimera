'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  URGENT_SMS_OPT_IN_HINT,
  URGENT_SMS_OPT_IN_LABEL,
} from '@/lib/urgent/constants'

type Settings = {
  phone_e164: string | null
  phone_confirmed_at: string | null
  sms_opt_in: boolean
  quiet_hours_start: string | null
  quiet_hours_end: string | null
  daily_text_limit: number
}

const DEFAULTS: Settings = {
  phone_e164: null,
  phone_confirmed_at: null,
  sms_opt_in: false,
  quiet_hours_start: null,
  quiet_hours_end: null,
  daily_text_limit: 5,
}

function timeInputValue(raw: string | null): string {
  if (!raw) return ''
  // Postgres time may arrive as HH:MM:SS
  return raw.slice(0, 5)
}

function toTimeOrNull(raw: string): string | null {
  const v = raw.trim()
  if (!v) return null
  return v.length === 5 ? `${v}:00` : v
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
  const [codeInput, setCodeInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      if (localOnly) {
        setSettings(DEFAULTS)
        setPhoneInput('')
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
        setSettings({
          phone_e164: data.phone_e164,
          phone_confirmed_at: data.phone_confirmed_at,
          sms_opt_in: Boolean(data.sms_opt_in),
          quiet_hours_start: data.quiet_hours_start,
          quiet_hours_end: data.quiet_hours_end,
          daily_text_limit: data.daily_text_limit ?? 5,
        })
        setPhoneInput(data.phone_e164 || '')
      } else {
        // Create empty prefs row with sms_opt_in false (optional).
        await supabase.from('helper_urgent_sms_settings').insert({
          profile_id: userId,
          sms_opt_in: false,
        })
        setSettings(DEFAULTS)
        setPhoneInput('')
      }
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
      setMessage('Saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  async function onSendCode() {
    setSendingCode(true)
    setError('')
    setMessage('')
    try {
      if (localOnly) {
        setMessage('Demo mode: enter any 6-digit code to preview confirm (optional).')
        return
      }
      const res = await fetch('/api/helper-sms/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneInput }),
      })
      const data = (await res.json()) as {
        error?: string
        skipped?: boolean
        reason?: string
        debugCode?: string
      }
      if (!res.ok) throw new Error(data.error || 'Could not send code')
      if (data.skipped) {
        setMessage(
          data.debugCode
            ? `Twilio is not configured yet. Dev code: ${data.debugCode}`
            : 'Twilio is not configured yet. Code was not sent.',
        )
      } else {
        setMessage('Code sent. Check your texts.')
      }
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
        if (codeInput.replace(/\D/g, '').length !== 6) {
          throw new Error('Enter the 6-digit code from your text.')
        }
        setSettings((prev) => ({
          ...prev,
          phone_e164: phoneInput.trim() || '+15555550100',
          phone_confirmed_at: new Date().toISOString(),
          sms_opt_in: false,
        }))
        setCodeInput('')
        setMessage(
          'Phone confirmed. Turn on Text me urgent jobs near me if you want alerts (optional).',
        )
        return
      }
      const res = await fetch('/api/helper-sms/confirm-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneInput, code: codeInput }),
      })
      const data = (await res.json()) as { error?: string; note?: string }
      if (!res.ok) throw new Error(data.error || 'Could not confirm')
      setCodeInput('')
      setMessage(data.note || 'Phone confirmed.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not confirm')
    } finally {
      setConfirming(false)
    }
  }

  const confirmed = Boolean(settings.phone_confirmed_at && settings.phone_e164)
  const canOptIn = confirmed

  if (loading) {
    return (
      <div className="account-hc-card" data-testid="helper-sms-settings-loading">
        <p className="account-hc-lede">Loading SMS settings…</p>
      </div>
    )
  }

  return (
    <section
      className="account-hc-card"
      data-testid="helper-sms-settings"
      aria-labelledby="helper-sms-heading"
    >
      <h2 id="helper-sms-heading" className="account-hc-section-label" style={{ marginBottom: 6 }}>
        Urgent job texts
      </h2>
      <p className="account-hc-lede" style={{ marginTop: 0, marginBottom: 16 }}>
        Optional. HouseCall can text you when a nearby job needs help now. Off by default. Never
        required to help or get verified.
      </p>

      <div className="account-hc-field">
        <label className="account-hc-label" htmlFor="helper-sms-phone">
          Phone number
        </label>
        <input
          id="helper-sms-phone"
          className="account-hc-input"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+1 512 555 0100"
          value={phoneInput}
          onChange={(e) => setPhoneInput(e.target.value)}
          data-testid="helper-sms-phone"
        />
        {confirmed ? (
          <p className="account-hc-hint" style={{ marginTop: 6 }}>
            Confirmed {settings.phone_e164}
          </p>
        ) : (
          <p className="account-hc-hint" style={{ marginTop: 6 }}>
            Confirm your number with a text code before opting in.
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="account-hc-btn account-hc-btn-secondary"
          disabled={sendingCode || !phoneInput.trim()}
          onClick={() => void onSendCode()}
          data-testid="helper-sms-send-code"
        >
          {sendingCode ? 'Sending…' : 'Send code'}
        </button>
        <input
          className="account-hc-input"
          style={{ maxWidth: 140 }}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="6-digit code"
          value={codeInput}
          onChange={(e) => setCodeInput(e.target.value)}
          data-testid="helper-sms-code"
        />
        <button
          type="button"
          className="account-hc-btn"
          disabled={confirming || codeInput.trim().length < 6}
          onClick={() => void onConfirmCode()}
          data-testid="helper-sms-confirm-code"
        >
          {confirming ? 'Checking…' : 'Confirm'}
        </button>
      </div>

      <label
        className="mt-5 flex cursor-pointer items-start gap-3"
        data-testid="helper-sms-opt-in-row"
      >
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 accent-[#1D5CE5]"
          checked={settings.sms_opt_in}
          disabled={!canOptIn || saving}
          onChange={(e) => void savePrefs({ sms_opt_in: e.target.checked })}
          data-testid="helper-sms-opt-in"
        />
        <span>
          <span className="block text-[14px] font-semibold text-[#071330]">
            {URGENT_SMS_OPT_IN_LABEL}
          </span>
          <span className="mt-0.5 block text-[13px] leading-snug text-[#64748B]">
            {URGENT_SMS_OPT_IN_HINT}
          </span>
        </span>
      </label>

      {!canOptIn ? (
        <p className="mt-2 text-[13px] text-[#64748B]" data-testid="helper-sms-opt-in-locked">
          Confirm your phone first. Opt-in stays off until you check the box.
        </p>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="account-hc-field">
          <label className="account-hc-label" htmlFor="helper-sms-quiet-start">
            Quiet hours start
          </label>
          <input
            id="helper-sms-quiet-start"
            className="account-hc-input"
            type="time"
            value={timeInputValue(settings.quiet_hours_start)}
            disabled={saving}
            onChange={(e) =>
              void savePrefs({ quiet_hours_start: toTimeOrNull(e.target.value) })
            }
            data-testid="helper-sms-quiet-start"
          />
        </div>
        <div className="account-hc-field">
          <label className="account-hc-label" htmlFor="helper-sms-quiet-end">
            Quiet hours end
          </label>
          <input
            id="helper-sms-quiet-end"
            className="account-hc-input"
            type="time"
            value={timeInputValue(settings.quiet_hours_end)}
            disabled={saving}
            onChange={(e) =>
              void savePrefs({ quiet_hours_end: toTimeOrNull(e.target.value) })
            }
            data-testid="helper-sms-quiet-end"
          />
        </div>
      </div>

      <div className="account-hc-field mt-3">
        <label className="account-hc-label" htmlFor="helper-sms-daily-limit">
          Daily text limit
        </label>
        <input
          id="helper-sms-daily-limit"
          className="account-hc-input"
          type="number"
          min={0}
          max={50}
          value={settings.daily_text_limit}
          disabled={saving}
          onChange={(e) => {
            const n = Number(e.target.value)
            if (Number.isFinite(n)) void savePrefs({ daily_text_limit: Math.min(50, Math.max(0, n)) })
          }}
          data-testid="helper-sms-daily-limit"
        />
        <p className="account-hc-hint" style={{ marginTop: 6 }}>
          Default 5. Uses America/Los_Angeles for quiet hours and the daily cap.
        </p>
      </div>

      {error ? (
        <p className="mt-3 text-[13px] font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-3 text-[13px] text-[#1D5CE5]" data-testid="helper-sms-message">
          {message}
        </p>
      ) : null}
    </section>
  )
}
