import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mapHelperVerification } from '@/lib/beam/mappers'

export const runtime = 'nodejs'

type Body = {
  email?: string
  street?: string
  apt?: string | null
  city?: string
  stateCode?: string
  zip?: string
  deviceLat?: number
  deviceLng?: number
  deviceAccuracyM?: number
}

/**
 * Confirms a helper is at their typed home address.
 * Geocoding and match decisions happen in SECURITY DEFINER RPC
 * `confirm_helper_home_location` (Census Bureau). Clients cannot pass
 * address coordinates or a matched flag.
 */
export async function POST(req: Request) {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const email = String(body.email ?? '').trim()
  const street = String(body.street ?? '').trim()
  const apt = body.apt != null ? String(body.apt).trim() : ''
  const city = String(body.city ?? '').trim()
  const stateCode = String(body.stateCode ?? '').trim()
  const zip = String(body.zip ?? '').trim()
  const deviceLat = Number(body.deviceLat)
  const deviceLng = Number(body.deviceLng)
  const deviceAccuracyM = Number(body.deviceAccuracyM)

  if (!email || !street || !city || !stateCode || !zip) {
    return NextResponse.json({ error: 'Fill in your email and home address.' }, { status: 400 })
  }
  if (
    !Number.isFinite(deviceLat) ||
    !Number.isFinite(deviceLng) ||
    !Number.isFinite(deviceAccuracyM)
  ) {
    return NextResponse.json(
      { error: 'Location reading was incomplete. Try again on your phone.' },
      { status: 400 },
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const { data, error } = await supabase.rpc('confirm_helper_home_location', {
    p_email: email,
    p_street: street,
    p_apt: apt || null,
    p_city: city,
    p_state_code: stateCode,
    p_zip: zip,
    p_device_lat: deviceLat,
    p_device_lng: deviceLng,
    p_device_accuracy_m: deviceAccuracyM,
  })

  if (error) {
    return NextResponse.json({ error: error.message || 'Could not confirm location' }, { status: 400 })
  }

  const payload = (data ?? {}) as {
    ok?: boolean
    result?: string
    status?: string
    message?: string
    distance_m?: number | null
    geocode_quality?: string | null
    attempt_id?: string
    verification?: Record<string, unknown>
  }

  return NextResponse.json({
    ok: Boolean(payload.ok),
    result: payload.result ?? null,
    status: payload.status ?? null,
    message: payload.message ?? null,
    distanceM: payload.distance_m ?? null,
    geocodeQuality: payload.geocode_quality ?? null,
    attemptId: payload.attempt_id ?? null,
    verification: payload.verification
      ? mapHelperVerification(payload.verification)
      : null,
  })
}
