import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyUrgentJobCreated } from '@/lib/urgent/notify'

export const runtime = 'nodejs'

/** Fire-and-forget entry after an urgent job is created. Auth required (poster). */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { requestId?: string }
    const requestId = body.requestId?.trim()
    if (!requestId) {
      return NextResponse.json({ error: 'Missing requestId' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const { data: job, error } = await supabase
      .from('help_requests')
      .select('id, requester_id, is_urgent')
      .eq('id', requestId)
      .maybeSingle()
    if (error || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }
    if (job.requester_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!job.is_urgent) {
      return NextResponse.json({ ok: true, sent: 0, skipped: 0, reason: 'not_urgent' })
    }

    const admin = createAdminClient()
    if (!admin) {
      console.warn('[urgent-jobs/notify] No service role; skipping SMS')
      return NextResponse.json({ ok: true, sent: 0, skipped: 0, reason: 'no_admin' })
    }

    const result = await notifyUrgentJobCreated(admin, requestId)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[urgent-jobs/notify]', err)
    // Never crash the client post flow.
    return NextResponse.json({ ok: true, sent: 0, skipped: 0, reason: 'error' })
  }
}
