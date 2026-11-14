import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authorizeUrgentJobActor, hasCronSecret } from '@/lib/urgent/auth'
import { notifyUrgentJobTaken } from '@/lib/urgent/notify'

export const runtime = 'nodejs'

/**
 * Notify other SMS helpers when the poster accepts an offer on an urgent job.
 * Allowed: authenticated poster of that job, or Authorization Bearer CRON_SECRET.
 * Idempotent via unique (request_id, helper_id, 'urgent_taken') log rows.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      requestId?: string
      acceptedHelperId?: string
    }
    const requestId = body.requestId?.trim()
    const acceptedHelperId = body.acceptedHelperId?.trim()
    if (!requestId || !acceptedHelperId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const admin = createAdminClient()
    let job: {
      id: string
      requester_id: string
      is_urgent: boolean
      helper_id: string | null
      status: string
    } | null = null

    if (hasCronSecret(request) && admin) {
      const { data } = await admin
        .from('help_requests')
        .select('id, requester_id, is_urgent, helper_id, status')
        .eq('id', requestId)
        .maybeSingle()
      job = data
    } else {
      const supabase = await createClient()
      const { data } = await supabase
        .from('help_requests')
        .select('id, requester_id, is_urgent, helper_id, status')
        .eq('id', requestId)
        .maybeSingle()
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
      return NextResponse.json({ ok: true, sent: 0, reason: 'not_urgent' })
    }

    // Prefer a fresh admin read so we only text after accept_offer committed.
    if (admin) {
      const { data: fresh } = await admin
        .from('help_requests')
        .select('status, helper_id, is_urgent')
        .eq('id', requestId)
        .maybeSingle()
      if (!fresh?.is_urgent) {
        return NextResponse.json({ ok: true, sent: 0, reason: 'not_urgent' })
      }
      if (fresh.status !== 'accepted' || fresh.helper_id !== acceptedHelperId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (job.status !== 'accepted' || job.helper_id !== acceptedHelperId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!admin) {
      return NextResponse.json({ ok: true, sent: 0, reason: 'no_admin' })
    }

    const result = await notifyUrgentJobTaken(admin, requestId, acceptedHelperId)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[urgent-jobs/taken]', err)
    return NextResponse.json({ ok: true, sent: 0, reason: 'error' })
  }
}
