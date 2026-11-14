import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { escalateUrgentJobs } from '@/lib/urgent/notify'

export const runtime = 'nodejs'

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) {
    // Allow Vercel Cron without secret in preview; prefer setting CRON_SECRET in prod.
    const ua = request.headers.get('user-agent') || ''
    return ua.includes('vercel-cron')
  }
  const header = request.headers.get('authorization')
  return header === `Bearer ${secret}`
}

/** Escalates urgent jobs with no offers after 10 minutes (5 mi wave). */
export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const admin = createAdminClient()
    if (!admin) {
      console.warn('[cron/urgent-escalate] No service role; skipping')
      return NextResponse.json({ ok: true, jobs: 0, sent: 0, reason: 'no_admin' })
    }
    const result = await escalateUrgentJobs(admin)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[cron/urgent-escalate]', err)
    return NextResponse.json({ ok: true, jobs: 0, sent: 0, reason: 'error' })
  }
}

export async function POST(request: Request) {
  return GET(request)
}
