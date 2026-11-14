import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyUrgentJobTaken } from '@/lib/urgent/notify'

export const runtime = 'nodejs'

/** Notify other SMS helpers when the poster accepts an offer on an urgent job. */
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

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const { data: job } = await supabase
      .from('help_requests')
      .select('id, requester_id, is_urgent, helper_id')
      .eq('id', requestId)
      .maybeSingle()
    if (!job || job.requester_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!job.is_urgent) {
      return NextResponse.json({ ok: true, sent: 0 })
    }

    const admin = createAdminClient()
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
