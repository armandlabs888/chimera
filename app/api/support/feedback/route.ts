import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  checkSupportRateLimit,
  clientIpFromRequest,
  supportRateLimitKey,
} from '@/lib/support/rateLimit'
import { isFeedbackKind } from '@/lib/support/topics'
import {
  clampLength,
  isHoneypotTripped,
  trimOrEmpty,
} from '@/lib/support/validate'

export const runtime = 'nodejs'

const UNAVAILABLE = 'Feedback is temporarily unavailable. Please try again later.'
const RATE_LIMITED = 'Too many submissions. Please try again later.'

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    if (isHoneypotTripped(body.company_website ?? body.companyWebsite)) {
      return NextResponse.json({ ok: true })
    }

    const message = clampLength(trimOrEmpty(body.message), 2000)
    if (!message) {
      return NextResponse.json({ error: 'Message is required.' }, { status: 400 })
    }

    let rating: number | null = null
    if (body.rating != null && body.rating !== '') {
      const n = typeof body.rating === 'number' ? body.rating : Number(body.rating)
      if (!Number.isInteger(n) || n < 1 || n > 5) {
        return NextResponse.json({ error: 'Rating must be 1 to 5.' }, { status: 400 })
      }
      rating = n
    }

    let kind: string | null = null
    const kindRaw = trimOrEmpty(body.kind)
    if (kindRaw) {
      if (!isFeedbackKind(kindRaw)) {
        return NextResponse.json({ error: 'Choose a feedback type.' }, { status: 400 })
      }
      kind = kindRaw
    }

    const pagePath = clampLength(trimOrEmpty(body.page_path ?? body.pagePath), 300) || null

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const userId = user?.id ?? null

    const ip = clientIpFromRequest(request)
    // Max 5 per hour per user or IP (shared bucket with contact).
    const limit = checkSupportRateLimit(supportRateLimitKey(userId, ip))
    if (!limit.ok) {
      return NextResponse.json(
        { error: RATE_LIMITED },
        {
          status: 429,
          headers: { 'Retry-After': String(limit.retryAfterSec) },
        },
      )
    }

    const admin = createAdminClient()
    if (!admin) {
      return NextResponse.json({ error: UNAVAILABLE }, { status: 503 })
    }

    const { error: insertError } = await admin.from('feedback_entries').insert({
      user_id: userId,
      rating,
      kind,
      message,
      page_path: pagePath,
    })

    if (insertError) {
      console.error('[support/feedback] insert failed', insertError.message)
      return NextResponse.json({ error: UNAVAILABLE }, { status: 503 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[support/feedback] unexpected failure', err)
    return NextResponse.json({ error: UNAVAILABLE }, { status: 500 })
  }
}
