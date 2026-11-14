import type { SupabaseClient } from '@supabase/supabase-js'
import {
  URGENT_ESCALATION_MINUTES,
  URGENT_ESCALATION_RADIUS_MILES,
  URGENT_MATCH_RADIUS_MILES,
} from '@/lib/urgent/constants'
import { formatUrgentMatchSms, formatUrgentTakenSms } from '@/lib/urgent/messages'
import { sendTwilioSms } from '@/lib/urgent/twilio'
import type { Database } from '@/lib/supabase/database.types'

type Admin = SupabaseClient<Database>
type NotifyKind = 'urgent_match' | 'urgent_escalation'

type MatchRow = {
  helper_id: string
  distance_miles: number
  phone_e164: string
}

async function loadRequest(admin: Admin, requestId: string) {
  const { data, error } = await admin
    .from('help_requests')
    .select(
      'id, title, category, category_custom, budget, budget_type, requester_id, status, is_urgent, urgent_helpers_notified_count, urgent_escalated_at, lat, lng',
    )
    .eq('id', requestId)
    .maybeSingle()
  if (error) throw error
  return data
}

async function matchHelpers(
  admin: Admin,
  requestId: string,
  radiusMiles: number,
): Promise<MatchRow[]> {
  const { data, error } = await admin.rpc('match_urgent_job_helpers', {
    p_request_id: requestId,
    p_radius_miles: radiusMiles,
  })
  if (error) {
    console.error('[urgent-sms] match_urgent_job_helpers failed', error.message)
    return []
  }
  return (data ?? []).map((row) => ({
    helper_id: row.helper_id,
    distance_miles: Number(row.distance_miles),
    phone_e164: row.phone_e164,
  }))
}

async function alreadyNotifiedHelperIds(
  admin: Admin,
  requestId: string,
): Promise<Set<string>> {
  const { data, error } = await admin
    .from('urgent_job_sms_notifications')
    .select('helper_id')
    .eq('request_id', requestId)
    .in('kind', ['urgent_match', 'urgent_escalation'])
    .eq('status', 'sent')
  if (error) {
    console.error('[urgent-sms] log read failed', error.message)
    return new Set()
  }
  return new Set((data ?? []).map((r) => r.helper_id))
}

async function insertLog(
  admin: Admin,
  row: {
    request_id: string
    helper_id: string
    kind: NotifyKind | 'urgent_taken'
    status: 'queued' | 'sent' | 'skipped' | 'failed'
    twilio_sid?: string | null
    distance_miles?: number | null
    error_message?: string | null
  },
): Promise<boolean> {
  const { error } = await admin.from('urgent_job_sms_notifications').insert({
    request_id: row.request_id,
    helper_id: row.helper_id,
    kind: row.kind,
    status: row.status,
    twilio_sid: row.twilio_sid ?? null,
    distance_miles: row.distance_miles ?? null,
    error_message: row.error_message ?? null,
  })
  if (error) {
    // Unique violation = already logged; treat as duplicate skip.
    if (error.code === '23505') return false
    console.error('[urgent-sms] log insert failed', error.message)
    return false
  }
  return true
}

async function bumpNotifiedCount(admin: Admin, requestId: string, delta: number) {
  if (delta <= 0) return
  const req = await loadRequest(admin, requestId)
  if (!req) return
  const next = (req.urgent_helpers_notified_count ?? 0) + delta
  const { error } = await admin
    .from('help_requests')
    .update({ urgent_helpers_notified_count: next })
    .eq('id', requestId)
  if (error) console.error('[urgent-sms] count update failed', error.message)
}

async function sendMatchWave(
  admin: Admin,
  requestId: string,
  kind: NotifyKind,
  radiusMiles: number,
  excludeHelperIds?: Set<string>,
): Promise<{ sent: number; skipped: number }> {
  const req = await loadRequest(admin, requestId)
  if (!req || !req.is_urgent || req.status !== 'open') {
    return { sent: 0, skipped: 0 }
  }

  const matches = await matchHelpers(admin, requestId, radiusMiles)
  let sent = 0
  let skipped = 0

  for (const match of matches) {
    if (excludeHelperIds?.has(match.helper_id)) {
      skipped += 1
      continue
    }

    const body = formatUrgentMatchSms({
      category: req.category,
      categoryCustom: req.category_custom,
      distanceMiles: match.distance_miles,
      budget: Number(req.budget),
      budgetType: req.budget_type,
      requestId: req.id,
    })

    // Reserve the unique log row first to avoid duplicate sends.
    const reserved = await insertLog(admin, {
      request_id: requestId,
      helper_id: match.helper_id,
      kind,
      status: 'queued',
      distance_miles: match.distance_miles,
    })
    if (!reserved) {
      skipped += 1
      continue
    }

    const result = await sendTwilioSms({ to: match.phone_e164, body })
    if (result.ok && result.skipped) {
      await admin
        .from('urgent_job_sms_notifications')
        .update({
          status: 'skipped',
          error_message: result.reason,
        })
        .eq('request_id', requestId)
        .eq('helper_id', match.helper_id)
        .eq('kind', kind)
      skipped += 1
      continue
    }
    if (!result.ok) {
      await admin
        .from('urgent_job_sms_notifications')
        .update({
          status: 'failed',
          error_message: result.error,
        })
        .eq('request_id', requestId)
        .eq('helper_id', match.helper_id)
        .eq('kind', kind)
      skipped += 1
      continue
    }

    await admin
      .from('urgent_job_sms_notifications')
      .update({
        status: 'sent',
        twilio_sid: result.sid,
      })
      .eq('request_id', requestId)
      .eq('helper_id', match.helper_id)
      .eq('kind', kind)
    sent += 1
  }

  if (sent > 0) await bumpNotifiedCount(admin, requestId, sent)
  return { sent, skipped }
}

/** Initial urgent wave (default 3 mi). Safe to call when Twilio is unset. */
export async function notifyUrgentJobCreated(
  admin: Admin,
  requestId: string,
): Promise<{ sent: number; skipped: number }> {
  try {
    return await sendMatchWave(
      admin,
      requestId,
      'urgent_match',
      URGENT_MATCH_RADIUS_MILES,
    )
  } catch (err) {
    console.error('[urgent-sms] notifyUrgentJobCreated', err)
    return { sent: 0, skipped: 0 }
  }
}

/** Escalation wave for jobs still open with no offers after 10 minutes. */
export async function escalateUrgentJobs(admin: Admin): Promise<{
  jobs: number
  sent: number
}> {
  try {
    const { data, error } = await admin.rpc('list_urgent_jobs_due_for_escalation', {
      p_after_minutes: URGENT_ESCALATION_MINUTES,
    })
    if (error) {
      console.error('[urgent-sms] list escalation failed', error.message)
      return { jobs: 0, sent: 0 }
    }

    let jobs = 0
    let sent = 0
    for (const row of data ?? []) {
      const requestId = row.request_id
      const prior = await alreadyNotifiedHelperIds(admin, requestId)
      const result = await sendMatchWave(
        admin,
        requestId,
        'urgent_escalation',
        URGENT_ESCALATION_RADIUS_MILES,
        prior,
      )
      sent += result.sent
      jobs += 1
      await admin
        .from('help_requests')
        .update({ urgent_escalated_at: new Date().toISOString() })
        .eq('id', requestId)
        .is('urgent_escalated_at', null)
    }
    return { jobs, sent }
  } catch (err) {
    console.error('[urgent-sms] escalateUrgentJobs', err)
    return { jobs: 0, sent: 0 }
  }
}

/** After poster accepts a helper, text other notified helpers once. */
export async function notifyUrgentJobTaken(
  admin: Admin,
  requestId: string,
  acceptedHelperId: string,
): Promise<{ sent: number }> {
  try {
    const req = await loadRequest(admin, requestId)
    if (!req || !req.is_urgent) return { sent: 0 }

    const { data: rows, error } = await admin
      .from('urgent_job_sms_notifications')
      .select('helper_id')
      .eq('request_id', requestId)
      .in('kind', ['urgent_match', 'urgent_escalation'])
      .eq('status', 'sent')
    if (error) {
      console.error('[urgent-sms] taken log read failed', error.message)
      return { sent: 0 }
    }

    const helperIds = [
      ...new Set(
        (rows ?? [])
          .map((r) => r.helper_id)
          .filter((id) => id !== acceptedHelperId),
      ),
    ]
    if (helperIds.length === 0) return { sent: 0 }

    const { data: settings } = await admin
      .from('helper_urgent_sms_settings')
      .select('profile_id, phone_e164')
      .in('profile_id', helperIds)
      .not('phone_e164', 'is', null)

    const phoneById = new Map(
      (settings ?? []).map((s) => [s.profile_id, s.phone_e164 as string]),
    )

    const body = formatUrgentTakenSms({
      category: req.category,
      categoryCustom: req.category_custom,
    })

    let sent = 0
    for (const helperId of helperIds) {
      const phone = phoneById.get(helperId)
      if (!phone) continue
      const reserved = await insertLog(admin, {
        request_id: requestId,
        helper_id: helperId,
        kind: 'urgent_taken',
        status: 'queued',
      })
      if (!reserved) continue

      const result = await sendTwilioSms({ to: phone, body })
      if (result.ok && !result.skipped) {
        await admin
          .from('urgent_job_sms_notifications')
          .update({ status: 'sent', twilio_sid: result.sid })
          .eq('request_id', requestId)
          .eq('helper_id', helperId)
          .eq('kind', 'urgent_taken')
        sent += 1
      } else if (result.ok && result.skipped) {
        await admin
          .from('urgent_job_sms_notifications')
          .update({ status: 'skipped', error_message: result.reason })
          .eq('request_id', requestId)
          .eq('helper_id', helperId)
          .eq('kind', 'urgent_taken')
      } else if (!result.ok) {
        await admin
          .from('urgent_job_sms_notifications')
          .update({ status: 'failed', error_message: result.error })
          .eq('request_id', requestId)
          .eq('helper_id', helperId)
          .eq('kind', 'urgent_taken')
      }
    }
    return { sent }
  } catch (err) {
    console.error('[urgent-sms] notifyUrgentJobTaken', err)
    return { sent: 0 }
  }
}
