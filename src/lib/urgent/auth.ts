import { createClient } from '@/lib/supabase/server'

/** True when Authorization: Bearer matches CRON_SECRET. */
export function hasCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  const header = request.headers.get('authorization')
  return header === `Bearer ${secret}`
}

/**
 * Authorize urgent-job SMS side effects: the authenticated poster of the job,
 * or a server/cron caller with CRON_SECRET. Never allows arbitrary callers.
 */
export async function authorizeUrgentJobActor(
  request: Request,
  job: { requester_id: string },
): Promise<{ ok: true; via: 'poster' | 'cron' } | { ok: false; status: 401 | 403 }> {
  if (hasCronSecret(request)) {
    return { ok: true, via: 'cron' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, status: 401 }
  }
  if (job.requester_id !== user.id) {
    return { ok: false, status: 403 }
  }
  return { ok: true, via: 'poster' }
}
