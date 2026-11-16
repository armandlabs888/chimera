import { NextResponse } from 'next/server'
import { parseRealName, REAL_NAME_ERROR } from '@/lib/realName'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

type Body = {
  role?: unknown
  city?: unknown
  stateCode?: unknown
  safetyVersion?: unknown
  firstName?: unknown
  lastName?: unknown
}

/**
 * Server-side onboarding completion with real-name enforcement.
 * Validates names via shared util, then calls complete_onboarding and persists
 * the display name (and first/last when those columns exist).
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Body

    const role = typeof body.role === 'string' ? body.role : ''
    const city = typeof body.city === 'string' ? body.city : ''
    const stateCode = typeof body.stateCode === 'string' ? body.stateCode : ''
    const safetyVersion =
      typeof body.safetyVersion === 'string' && body.safetyVersion.trim()
        ? body.safetyVersion.trim().slice(0, 40)
        : 'v1'

    if (role !== 'customer' && role !== 'helper') {
      return NextResponse.json(
        { error: 'Choose whether you are a Neighbor or a Helper.' },
        { status: 400 },
      )
    }
    if (!city.trim() || !stateCode.trim()) {
      return NextResponse.json({ error: 'Select a US city from the list.' }, { status: 400 })
    }

    const parsed = parseRealName(body.firstName, body.lastName)
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const baseArgs = {
      p_role: role,
      p_city: city.trim(),
      p_state_code: stateCode.trim(),
      p_accept_safety: true,
      p_safety_version: safetyVersion,
    }

    // Prefer the migrated RPC that accepts names; fall back when migration
    // has not been applied yet, then write name via profiles update.
    let { data, error } = await supabase.rpc('complete_onboarding', {
      ...baseArgs,
      p_first_name: parsed.value.firstName,
      p_last_name: parsed.value.lastName,
    })

    if (error) {
      const msg = error.message || ''
      const missingNameArgs =
        /could not find the function/i.test(msg) ||
        /p_first_name|p_last_name/i.test(msg) ||
        /function public\.complete_onboarding/i.test(msg)

      if (!missingNameArgs) {
        return NextResponse.json(
          { error: msg || 'Could not finish onboarding' },
          { status: 400 },
        )
      }

      ;({ data, error } = await supabase.rpc('complete_onboarding', baseArgs))
      if (error) {
        return NextResponse.json(
          { error: error.message || 'Could not finish onboarding' },
          { status: 400 },
        )
      }

      const { error: nameError } = await supabase
        .from('profiles')
        .update({ name: parsed.value.fullName })
        .eq('id', user.id)

      if (nameError) {
        return NextResponse.json(
          { error: nameError.message || REAL_NAME_ERROR },
          { status: 400 },
        )
      }
    }

    return NextResponse.json({
      ok: true,
      profile: data ?? null,
      name: parsed.value.fullName,
      firstName: parsed.value.firstName,
      lastName: parsed.value.lastName,
    })
  } catch {
    console.error('[onboarding/complete] unexpected failure')
    return NextResponse.json({ error: 'Could not finish onboarding' }, { status: 500 })
  }
}
