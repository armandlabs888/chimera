import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authorizeUrgentJobActor, hasCronSecret } from '@/lib/urgent/auth'
import { notifyUrgentJobCreated } from '@/lib/urgent/notify'

export const runtime = 'nodejs'

/**
 * Fire after an urgent job is created.
 * Allowed: authenticated poster of that job, or Authorization Bearer CRON_SECRET.
 * Idempotent via unique (request_id, helper_id, kind) notification log rows.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { requestId?: string }
    const requestId = body.requestId?.trim()
    if (!requestId) {
      return NextResponse.json({ error: 'Missing requestId' }, { status: 400 })
    }

    const admin = createAdminClient()
    let job: { id: string; requester_id: string; is_urgent: boolean } | null = null

    if (hasCronSecret(request) && admin) {
      const { data } = await admin
        .from('help_requests')
        .select('id, requester_id, is_urgent')
        .eq('id', requestId)
        .maybeSingle()
      job = data
    } else {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('help_requests')
        .select('id, requester_id, is_urgent')
        .eq('id', requestId)
        .maybeSingle()
      if (error || !data) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 })
      }
      job = data
    }

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const auth = await authorizeUrgentJobActor(request, job)
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.status === 401 ? 'Not signed in' : 'Forbidden' },
        { status: auth.status },
      )
    }

    if (!job.is_urgent) {
      return NextResponse.json({ ok: true, sent: 0, skipped: 0, reason: 'not_urgent' })
    }

    if (!admin) {
      console.warn('[urgent-jobs/notify] No service role; skipping SMS')
      return NextResponse.json({ ok: true, sent: 0, skipped: 0, reason: 'no_admin' })
    }

    const result = await notifyUrgentJobCreated(admin, requestId)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[urgent-jobs/notify]', err)
    return NextResponse.json({ ok: true, sent: 0, skipped: 0, reason: 'error' })
  }
}
