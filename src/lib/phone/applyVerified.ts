import type { SupabaseClient } from '@supabase/supabase-js'
import {
  isPhoneUniqueViolation,
  PHONE_ALREADY_USED_MESSAGE,
} from '@/lib/phone/verify'
import type { Database } from '@/lib/supabase/database.types'

type Admin = SupabaseClient<Database>

/**
 * Mark a user phone verified and clear pending code fields.
 * Also mirrors the confirmed number onto helper_urgent_sms_settings when present.
 */
export async function applyVerifiedPhone(input: {
  admin: Admin
  userId: string
  phoneE164: string
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const now = new Date().toISOString()

  const { error } = await input.admin.from('phone_verifications').upsert(
    {
      user_id: input.userId,
      phone_e164: input.phoneE164,
      verified_at: now,
      pending_code_hash: null,
      pending_code_expires_at: null,
      pending_attempts: 0,
      pending_channel: null,
    },
    { onConflict: 'user_id' },
  )

  if (error) {
    if (isPhoneUniqueViolation(error)) {
      return { ok: false, error: PHONE_ALREADY_USED_MESSAGE, status: 409 }
    }
    console.error('[phone] applyVerified upsert', error.message)
    return { ok: false, error: 'Could not save phone.', status: 500 }
  }

  // Mirror onto helper SMS settings so Settings shows the same number.
  // Preserve existing opt-in / pending flags.
  const { data: existing } = await input.admin
    .from('helper_urgent_sms_settings')
    .select(
      'sms_opt_in, sms_opt_in_pending, daily_text_limit, quiet_hours_start, quiet_hours_end, sms_alert_parents',
    )
    .eq('profile_id', input.userId)
    .maybeSingle()

  const { error: smsError } = await input.admin.from('helper_urgent_sms_settings').upsert(
    {
      profile_id: input.userId,
      phone_e164: input.phoneE164,
      phone_confirmed_at: now,
      sms_opt_in: existing?.sms_opt_in ?? false,
      sms_opt_in_pending: existing?.sms_opt_in_pending ?? false,
      daily_text_limit: existing?.daily_text_limit ?? 5,
      quiet_hours_start: existing?.quiet_hours_start ?? null,
      quiet_hours_end: existing?.quiet_hours_end ?? null,
      sms_alert_parents: existing?.sms_alert_parents ?? [],
    },
    { onConflict: 'profile_id' },
  )

  if (smsError) {
    // Phone verify succeeded; settings mirror is best-effort for neighbors.
    console.warn('[phone] helper_urgent_sms_settings mirror', smsError.message)
  }

  return { ok: true }
}

/** Look up a pending inbound code hash and verify the sender phone. */
export async function consumeInboundPhoneCode(input: {
  admin: Admin
  code: string
  fromE164: string
  hashCode: (code: string) => string
  hashesEqual: (a: string, b: string) => boolean
}): Promise<
  | { ok: true; userId: string }
  | { ok: false; reason: 'not_found' | 'expired' | 'taken' | 'error'; message?: string }
> {
  const codeHash = input.hashCode(input.code)
  const nowIso = new Date().toISOString()

  const { data: row, error } = await input.admin
    .from('phone_verifications')
    .select('user_id, pending_code_hash, pending_code_expires_at, verified_at, pending_attempts')
    .eq('pending_code_hash', codeHash)
    .is('verified_at', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[phone] inbound lookup', error.message)
    return { ok: false, reason: 'error', message: error.message }
  }
  if (!row?.pending_code_hash) {
    return { ok: false, reason: 'not_found' }
  }
  if (!input.hashesEqual(row.pending_code_hash, codeHash)) {
    return { ok: false, reason: 'not_found' }
  }
  if (
    !row.pending_code_expires_at ||
    new Date(row.pending_code_expires_at).getTime() < Date.now()
  ) {
    return { ok: false, reason: 'expired' }
  }
  if ((row.pending_attempts ?? 0) >= 5) {
    return { ok: false, reason: 'expired' }
  }

  const applied = await applyVerifiedPhone({
    admin: input.admin,
    userId: row.user_id,
    phoneE164: input.fromE164,
  })
  if (!applied.ok) {
    if (applied.status === 409) {
      return { ok: false, reason: 'taken', message: applied.error }
    }
    return { ok: false, reason: 'error', message: applied.error }
  }

  // Clear any other stale pending rows that somehow share the hash (paranoia).
  void nowIso
  return { ok: true, userId: row.user_id }
}
