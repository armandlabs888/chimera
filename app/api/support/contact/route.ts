import { NextResponse } from 'next/server'
import { sendSupportEmail } from '@/lib/email/sendSupportEmail'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  checkSupportRateLimit,
  clientIpFromRequest,
  supportRateLimitKey,
} from '@/lib/support/rateLimit'
import { isSupportTopic } from '@/lib/support/topics'
import {
  clampLength,
  isHoneypotTripped,
  isValidEmail,
  trimOrEmpty,
} from '@/lib/support/validate'

export const runtime = 'nodejs'

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png'])

const UNAVAILABLE = 'Support is temporarily unavailable. Please try again later.'
const RATE_LIMITED = 'Too many messages. Please try again later.'

function extensionForMime(mime: string): string {
  if (mime === 'image/png') return 'png'
  return 'jpg'
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || ''
    let name = ''
    let email = ''
    let topicRaw = ''
    let jobLink = ''
    let message = ''
    let honeypot: unknown = ''
    let screenshot: File | null = null

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      name = trimOrEmpty(form.get('name'))
      email = trimOrEmpty(form.get('email'))
      topicRaw = trimOrEmpty(form.get('topic'))
      jobLink = trimOrEmpty(form.get('job_link'))
      message = trimOrEmpty(form.get('message'))
      honeypot = form.get('company_website')
      const file = form.get('screenshot')
      if (file instanceof File && file.size > 0) screenshot = file
    } else {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
      name = trimOrEmpty(body.name)
      email = trimOrEmpty(body.email)
      topicRaw = trimOrEmpty(body.topic)
      jobLink = trimOrEmpty(body.job_link ?? body.jobLink)
      message = trimOrEmpty(body.message)
      honeypot = body.company_website ?? body.companyWebsite
    }

    // Silent success for bots so they do not retry.
    if (isHoneypotTripped(honeypot)) {
      return NextResponse.json({ ok: true })
    }

    name = clampLength(name, 120)
    email = clampLength(email.toLowerCase(), 254)
    message = clampLength(message, 5000)
    jobLink = clampLength(jobLink, 500)

    if (!name) {
      return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 })
    }
    if (!isSupportTopic(topicRaw)) {
      return NextResponse.json({ error: 'Choose a topic.' }, { status: 400 })
    }
    if (!message) {
      return NextResponse.json({ error: 'Message is required.' }, { status: 400 })
    }

    if (screenshot) {
      if (!ALLOWED_MIME.has(screenshot.type)) {
        return NextResponse.json(
          { error: 'Screenshot must be a PNG or JPG.' },
          { status: 400 },
        )
      }
      if (screenshot.size > MAX_SCREENSHOT_BYTES) {
        return NextResponse.json(
          { error: 'Screenshot must be 5 MB or smaller.' },
          { status: 400 },
        )
      }
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const userId = user?.id ?? null

    const ip = clientIpFromRequest(request)
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

    let screenshotPath: string | null = null
    if (screenshot) {
      const folder = userId ?? 'guest'
      const path = `${folder}/${crypto.randomUUID()}.${extensionForMime(screenshot.type)}`
      const bytes = Buffer.from(await screenshot.arrayBuffer())
      const { error: uploadError } = await admin.storage
        .from('support-screenshots')
        .upload(path, bytes, {
          contentType: screenshot.type,
          upsert: false,
        })
      if (uploadError) {
        console.error('[support/contact] screenshot upload failed', uploadError.message)
        return NextResponse.json(
          { error: 'Could not upload screenshot. Try again without it, or use a smaller PNG or JPG.' },
          { status: 400 },
        )
      }
      screenshotPath = path
    }

    const { error: insertError } = await admin.from('support_messages').insert({
      user_id: userId,
      name,
      email,
      topic: topicRaw,
      job_link: jobLink || null,
      message,
      screenshot_path: screenshotPath,
      status: 'new',
    })

    if (insertError) {
      console.error('[support/contact] insert failed', insertError.message)
      return NextResponse.json({ error: UNAVAILABLE }, { status: 503 })
    }

    // Best-effort inbox email. Never fail the request because of email.
    await sendSupportEmail({
      name,
      email,
      topic: topicRaw,
      message,
      jobLink: jobLink || null,
      screenshotPath,
      userId,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[support/contact] unexpected failure', err)
    return NextResponse.json({ error: UNAVAILABLE }, { status: 500 })
  }
}
