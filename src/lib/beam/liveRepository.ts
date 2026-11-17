import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AppState,
  BeamNotification,
  BudgetType,
  CategoryId,
  HelpRequest,
  JobReferral,
  NeighborhoodId,
  Offer,
  Person,
  RateType,
  RequestInvite,
  Review,
  WhenOption,
} from '@/types'
import {
  mapHelperVerification,
  mapInvite,
  mapJobReferral,
  mapMessage,
  mapNotification,
  mapOffer,
  mapProfile,
  mapPublicProfile,
  mapPublicRequest,
  mapPublicReview,
  mapRequest,
  mapReview,
  mapThread,
} from '@/lib/beam/mappers'
import type { HelperVerification } from '@/types'
import { assertOwnedListingPhotoUrls } from '@/lib/listingPhotos'
import { formatZipLocationLabel, normalizeZipInput } from '@/lib/zip/format'

// Untyped client keeps app compiling while schema evolves; runtime RLS still enforces authz.
type Client = SupabaseClient

export class BeamBackendError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message)
    this.name = 'BeamBackendError'
  }
}

function throwOnError(error: { message: string } | null, action: string): void {
  if (error) throw new BeamBackendError(`${action}: ${error.message}`, error)
}

function emptyExtras(): Pick<
  AppState,
  'invites' | 'savedHelperIds' | 'savedRequestIds' | 'notifications' | 'jobReferrals'
> {
  return {
    invites: [],
    savedHelperIds: [],
    savedRequestIds: [],
    notifications: [],
    jobReferrals: [],
  }
}

/** Missing-table / not-yet-migrated errors should not crash the app. */
function isMissingRelationError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false
  const msg = (error.message || '').toLowerCase()
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    msg.includes('does not exist') ||
    msg.includes('could not find the table') ||
    msg.includes('schema cache')
  )
}

export async function loadPublicLiveMarketplace(client: Client): Promise<AppState> {
  const { data, error } = await client.rpc('get_public_marketplace')
  throwOnError(error, 'Load public marketplace')
  const payload = (data ?? {}) as {
    requests?: Record<string, unknown>[]
    profiles?: Record<string, unknown>[]
    reviews?: Record<string, unknown>[]
  }
  return {
    version: 1,
    currentUserId: 'anonymous',
    people: (payload.profiles ?? []).map(mapPublicProfile),
    requests: (payload.requests ?? []).map(mapPublicRequest),
    offers: [],
    threads: [],
    messages: [],
    reviews: (payload.reviews ?? []).map(mapPublicReview),
    ...emptyExtras(),
  }
}

export async function loadLiveState(client: Client, userId: string): Promise<AppState> {
  const [
    profiles,
    requests,
    offers,
    threads,
    messages,
    reviews,
    invites,
    saved,
    savedRequests,
    notifications,
    jobReferrals,
    privateDetails,
    myVerification,
    staffFlag,
  ] = await Promise.all([
    client.from('profiles').select('*'),
    client.from('help_requests').select('*').order('created_at', { ascending: false }),
    client.from('offers').select('*').order('created_at', { ascending: false }),
    client.from('message_threads').select('*').order('last_message_at', { ascending: false }),
    client.from('messages').select('*').order('created_at', { ascending: true }),
    client.from('reviews').select('*').order('created_at', { ascending: false }),
    client.from('request_invites').select('*').order('created_at', { ascending: false }),
    client.from('saved_helpers').select('helper_id').eq('user_id', userId),
    client.from('saved_help_requests').select('help_request_id').eq('user_id', userId),
    client.from('notifications').select('*').eq('user_id', userId).order('created_at', {
      ascending: false,
    }),
    client.from('job_referrals').select('*').order('created_at', { ascending: false }),
    client.from('request_private_details').select('*'),
    client.from('helper_verifications').select('*').eq('profile_id', userId).maybeSingle(),
    client.rpc('is_beam_staff'),
  ])

  throwOnError(profiles.error, 'Load profiles')
  throwOnError(requests.error, 'Load requests')
  throwOnError(offers.error, 'Load offers')
  throwOnError(threads.error, 'Load threads')
  throwOnError(messages.error, 'Load messages')
  throwOnError(reviews.error, 'Load reviews')
  // New tables may fail briefly on older deploys - treat as empty rather than hard-fail.
  const inviteRows = invites.error ? [] : (invites.data ?? [])
  const savedIds = saved.error ? [] : (saved.data ?? []).map((r) => r.helper_id as string)
  let savedRequestIds: string[] = []
  if (savedRequests.error) {
    if (isMissingRelationError(savedRequests.error)) {
      console.warn(
        '[beam] saved_help_requests table missing; treating saved jobs as empty until migration is applied',
      )
    } else {
      console.warn('[beam] load saved_help_requests failed:', savedRequests.error.message)
    }
  } else {
    savedRequestIds = (savedRequests.data ?? []).map((r) => r.help_request_id as string)
  }
  const notifRows = notifications.error ? [] : (notifications.data ?? [])
  // job_referrals may be missing until the migration is applied.
  const referralRows = jobReferrals.error ? [] : (jobReferrals.data ?? [])
  const privateMap = new Map<string, string>()
  if (!privateDetails.error) {
    for (const row of privateDetails.data ?? []) {
      privateMap.set(row.request_id as string, String(row.exact_address ?? ''))
    }
  }

  const isBeamStaff = !staffFlag.error && Boolean(staffFlag.data)
  let helperVerifications: HelperVerification[] = []
  const helperVerification =
    !myVerification.error && myVerification.data
      ? mapHelperVerification(myVerification.data as Record<string, unknown>)
      : null

  if (isBeamStaff) {
    const queue = await client
      .from('helper_verifications')
      .select('*')
      .order('submitted_at', { ascending: false })
    if (!queue.error) {
      helperVerifications = (queue.data ?? []).map((row) =>
        mapHelperVerification(row as Record<string, unknown>),
      )
    }
  } else if (helperVerification) {
    helperVerifications = [helperVerification]
  }

  return {
    version: 1,
    currentUserId: userId,
    people: (profiles.data ?? []).map((row) => mapProfile(row, userId)),
    requests: (requests.data ?? []).map((row) =>
      mapRequest({ ...row, exact_address: privateMap.get(row.id) }),
    ),
    offers: (offers.data ?? []).map(mapOffer),
    threads: (threads.data ?? []).map(mapThread),
    messages: (messages.data ?? []).map(mapMessage),
    reviews: (reviews.data ?? []).map(mapReview),
    invites: inviteRows.map(mapInvite),
    savedHelperIds: savedIds,
    savedRequestIds,
    notifications: notifRows.map(mapNotification),
    jobReferrals: referralRows.map((row) => mapJobReferral(row as Record<string, unknown>)),
    helperVerification,
    helperVerifications,
    isBeamStaff,
  }
}

export type EnsureProfileSeed = {
  name?: string
  avatarUrl?: string
  neighborhood?: string
  locationLabel?: string
}

/**
 * Ensure a profiles row exists for the signed-in user.
 * Never clobbers a non-empty name or avatar; only fills blanks from seed/OAuth metadata.
 */
export async function ensureProfile(
  client: Client,
  userId: string,
  seed: EnsureProfileSeed | string = {},
): Promise<Person> {
  const normalized: EnsureProfileSeed =
    typeof seed === 'string' ? { name: seed } : seed
  const fallbackName = (normalized.name?.trim() || 'Neighbor').slice(0, 80)
  const fallbackAvatar = normalized.avatarUrl?.trim() || ''
  const fallbackNeighborhood = normalized.neighborhood?.trim() || ''
  const fallbackLocation = normalized.locationLabel?.trim() || ''

  const existing = await client.from('profiles').select('*').eq('id', userId).maybeSingle()
  throwOnError(existing.error, 'Load profile')

  if (existing.data) {
    const patch: Record<string, unknown> = {}
    const currentName = String(existing.data.name ?? '').trim()
    const currentAvatar = String(existing.data.avatar_url ?? '').trim()
    const currentLocation = String(existing.data.location_label ?? '').trim()
    if (!currentName && fallbackName) patch.name = fallbackName
    if (!currentAvatar && fallbackAvatar) patch.avatar_url = fallbackAvatar
    if (!currentLocation && fallbackLocation) patch.location_label = fallbackLocation
    if (Object.keys(patch).length > 0) {
      const updated = await client
        .from('profiles')
        .update(patch)
        .eq('id', userId)
        .select('*')
        .single()
      throwOnError(updated.error, 'Update profile blanks')
      return mapProfile(updated.data, userId)
    }
    return mapProfile(existing.data, userId)
  }

  const inserted = await client
    .from('profiles')
    .insert({
      id: userId,
      name: fallbackName,
      avatar_url: fallbackAvatar,
      bio: '',
      neighborhood: fallbackNeighborhood,
      location_label: fallbackLocation,
      skills: [],
      hourly_rate: 35,
      availability: ['afternoons', 'evenings'],
    })
    .select('*')
    .single()
  throwOnError(inserted.error, 'Create profile')
  return mapProfile(inserted.data, userId)
}

/** Normalize HH:MM / HH:MM:SS into Postgres `time` text (HH:MM:SS) or null. */
export function toDbWorkTime(value: string | null | undefined): string | null {
  if (value == null) return null
  const trimmed = String(value).trim()
  if (!trimmed) return null
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(trimmed)
  if (!m) return null
  const hh = m[1].padStart(2, '0')
  const mm = m[2]
  const ss = m[3] ?? '00'
  return `${hh}:${mm}:${ss}`
}

/**
 * True only for genuine missing-column / schema-cache misses on working-hours
 * fields. Broad matches like bare "column" caused silent drops of work_* after
 * unrelated update failures.
 */
export function isMissingWorkingHoursColumnError(
  error: { message?: string; code?: string } | null | undefined,
): boolean {
  if (!error) return false
  const msg = error.message || ''
  const lower = msg.toLowerCase()
  const code = error.code || ''

  const namesWorkingHoursColumn =
    /\bwork_start\b|\bwork_end\b|\btimezone\b/i.test(msg)

  // PostgREST: unknown column in schema cache
  if (code === 'PGRST204' && namesWorkingHoursColumn) return true
  // Postgres undefined_column
  if (code === '42703' && namesWorkingHoursColumn) return true

  if (
    /could not find the '(work_start|work_end|timezone)' column/i.test(msg) ||
    /column ["']?(work_start|work_end|timezone)["']? (?:of relation|does not exist)/i.test(
      lower,
    ) ||
    (namesWorkingHoursColumn &&
      (/schema cache/i.test(msg) || /does not exist/i.test(lower)))
  ) {
    return true
  }
  return false
}

/** Build the profiles UPDATE payload from a Person patch (exported for QA). */
export function buildLiveProfileUpdatePayload(
  patch: Partial<Person>,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  if (patch.name !== undefined) payload.name = patch.name
  if (patch.avatar !== undefined) payload.avatar_url = patch.avatar
  if (patch.bio !== undefined) payload.bio = patch.bio
  if (patch.neighborhood !== undefined) payload.neighborhood = patch.neighborhood
  if (patch.skills !== undefined) {
    payload.skills = patch.skills
    if (patch.isHelper === undefined) {
      payload.is_helper = patch.skills.length > 0
    }
  }
  if (patch.otherSkillLabel !== undefined) {
    payload.other_skill_label = patch.otherSkillLabel
  }
  if (patch.hourlyRate !== undefined) payload.hourly_rate = patch.hourlyRate
  if (patch.availability !== undefined) payload.availability = patch.availability
  if (patch.locationLabel !== undefined) payload.location_label = patch.locationLabel
  if (patch.city !== undefined) payload.city = patch.city
  if (patch.stateCode !== undefined) payload.state_code = patch.stateCode
  if (patch.cityGeoid !== undefined) payload.city_geoid = patch.cityGeoid
  if (patch.lat !== undefined) payload.lat = patch.lat
  if (patch.lng !== undefined) payload.lng = patch.lng
  if (patch.serviceRadiusMiles !== undefined) payload.service_radius_miles = patch.serviceRadiusMiles
  if (patch.rateType !== undefined) payload.rate_type = patch.rateType
  if (patch.availableNow !== undefined) payload.available_now = patch.availableNow
  if (patch.isHelper !== undefined) payload.is_helper = patch.isHelper

  if (patch.workStart !== undefined) payload.work_start = toDbWorkTime(patch.workStart)
  if (patch.workEnd !== undefined) payload.work_end = toDbWorkTime(patch.workEnd)
  if (patch.timezone !== undefined) {
    const tz = typeof patch.timezone === 'string' ? patch.timezone.trim() : ''
    payload.timezone = tz || null
  }
  return payload
}

export async function updateLiveProfile(
  client: Client,
  userId: string,
  patch: Partial<Person>,
): Promise<void> {
  const payload = buildLiveProfileUpdatePayload(patch)
  if (Object.keys(payload).length === 0) return

  const hasWorkingHoursPatch =
    payload.work_start !== undefined ||
    payload.work_end !== undefined ||
    payload.timezone !== undefined

  const { error } = await client.from('profiles').update(payload).eq('id', userId)
  if (error && hasWorkingHoursPatch && isMissingWorkingHoursColumnError(error)) {
    // Deployed before migration: retry without working-hours columns only.
    delete payload.work_start
    delete payload.work_end
    delete payload.timezone
    if (Object.keys(payload).length === 0) {
      throw new BeamBackendError(
        'Update profile: working hours are not available yet. Ask an admin to apply the helper_working_hours migration.',
        error,
      )
    }
    const retry = await client.from('profiles').update(payload).eq('id', userId)
    throwOnError(retry.error, 'Update profile')
    return
  }
  throwOnError(error, 'Update profile')
}

export type CreateRequestInput = {
  title: string
  details: string
  category: CategoryId
  categoryCustom?: string | null
  neighborhood?: NeighborhoodId | ''
  when: WhenOption
  whenLabel: string
  budget: number
  image: string
  images?: string[]
  locationLabel?: string
  city?: string | null
  stateCode?: string | null
  zip?: string | null
  lat?: number | null
  lng?: number | null
  radiusMiles?: number
  exactAddress?: string
  budgetType?: BudgetType
  /** When false, helpers must offer exactly budget (firm price). */
  acceptsOffers?: boolean
  scheduledFor?: string | null
  scheduledEnd?: string | null
  preferredHelperId?: string | null
  isUrgent?: boolean
}

async function resolveZipPlaceFromApi(zip: string): Promise<{
  zip: string
  lat: number
  lng: number
  city: string
  stateCode: string
  label: string
}> {
  const res = await fetch(`/api/zip?zip=${encodeURIComponent(zip)}`)
  if (res.status === 404) {
    throw new Error('We could not find that ZIP code')
  }
  if (!res.ok) {
    throw new Error('Could not look up that ZIP. Try again.')
  }
  return (await res.json()) as {
    zip: string
    lat: number
    lng: number
    city: string
    stateCode: string
    label: string
  }
}

export async function createLiveRequest(
  client: Client,
  userId: string,
  input: CreateRequestInput,
): Promise<HelpRequest> {
  const acceptsOffers =
    typeof input.acceptsOffers === 'boolean'
      ? input.acceptsOffers
      : input.budgetType === 'open' || input.budget === 0
  // Keep budget_type derived for older clients: firm -> fixed, negotiable -> open.
  // Price always lives in budget (including when open to offers).
  const budgetType: BudgetType =
    input.budgetType ?? (acceptsOffers ? 'open' : 'fixed')
  const budget = Number(input.budget) > 0 ? Number(input.budget) : 0
  const owned = assertOwnedListingPhotoUrls(input.images ?? [], userId)
  if (!owned.ok) throw new Error(owned.error)
  const images = owned.urls
  // Cover may be a category stock image when the listing has zero photos.
  const cover = images[0] || input.image || ''
  if (images.length === 0 && cover && !assertOwnedListingPhotoUrls([cover], userId).ok) {
    // Stock/category covers are app-served paths (e.g. /images/...), not beam-media — allow those.
    // Reject only if someone tries to persist a third-party https cover without upload.
    if (/^https?:\/\//i.test(cover) && !cover.includes('/storage/v1/object/public/beam-media/')) {
      throw new Error('Photos must be uploaded through BlockSide. External image links are not allowed.')
    }
  }

  // Authoritative ZIP center from the server gazetteer. Ignore client lat/lng so
  // spoofed coordinates cannot break urgent SMS matching.
  const zip = normalizeZipInput(input.zip ?? '')
  if (!zip) {
    throw new Error('Enter a 5-digit US ZIP code')
  }
  const place = await resolveZipPlaceFromApi(zip)
  const locationLabel =
    formatZipLocationLabel(place) || input.locationLabel?.trim() || ''

  const { data, error } = await client
    .from('help_requests')
    .insert({
      title: input.title.trim(),
      details: input.details.trim(),
      category: input.category,
      category_custom:
        input.category === 'other' ? (input.categoryCustom?.trim() || null) : null,
      neighborhood: input.neighborhood ?? '',
      when_option: input.when,
      when_label: input.whenLabel,
      budget,
      budget_type: budgetType,
      accepts_offers: acceptsOffers,
      status: 'open',
      requester_id: userId,
      image: cover,
      images,
      location_label: locationLabel,
      city: place.city || null,
      state_code: place.stateCode || null,
      zip: place.zip,
      lat: place.lat,
      lng: place.lng,
      // Legacy column kept for schema compatibility. Matching uses helper travel
      // distance (service_radius_miles), not this poster radius.
      radius_miles: input.radiusMiles ?? 5,
      scheduled_for: input.scheduledFor ?? null,
      scheduled_end: input.scheduledEnd ?? null,
      preferred_helper_id: input.preferredHelperId ?? null,
      is_urgent: Boolean(input.isUrgent),
    })
    .select('*')
    .single()
  throwOnError(error, 'Create request')

  const exact = input.exactAddress?.trim()
  if (exact) {
    const priv = await client.from('request_private_details').upsert({
      request_id: data.id,
      exact_address: exact,
    })
    throwOnError(priv.error, 'Save private address')
  }

  if (input.preferredHelperId) {
    try {
      await inviteLiveHelper(client, data.id, input.preferredHelperId, '')
    } catch {
      // Invite is best-effort after request creation.
    }
  }

  // Urgent SMS matching is best-effort; never block posting if Twilio/env is unset.
  if (input.isUrgent) {
    try {
      void fetch('/api/urgent-jobs/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: data.id }),
      })
    } catch {
      /* ignore */
    }
  }

  return mapRequest({ ...data, exact_address: exact || undefined })
}

async function assertHelperCanOffer(client: Client, userId: string): Promise<void> {
  const { data, error } = await client
    .from('helper_verifications')
    .select('status')
    .eq('profile_id', userId)
    .maybeSingle()
  if (error) {
    // Table missing on older deploys: fail closed so offers cannot bypass the gate.
    throw new BeamBackendError(
      "To make an offer, BlockSide has to confirm you're at your home address. You need to be home for this check.",
      error,
    )
  }
  if (!data || data.status !== 'approved') {
    throw new BeamBackendError(
      "To make an offer, BlockSide has to confirm you're at your home address. You need to be home for this check.",
    )
  }
}

export async function createLiveOffer(
  client: Client,
  userId: string,
  input: { requestId: string; price: number; note: string; eta: string },
): Promise<Offer> {
  await assertHelperCanOffer(client, userId)

  const job = await client
    .from('help_requests')
    .select('budget, accepts_offers, budget_type')
    .eq('id', input.requestId)
    .maybeSingle()
  throwOnError(job.error, 'Lookup job for offer')
  if (!job.data) throw new Error('Job not found')
  const acceptsOffers =
    typeof job.data.accepts_offers === 'boolean' ? job.data.accepts_offers : true
  const jobBudget = Number(job.data.budget)
  if (!acceptsOffers && jobBudget > 0 && Math.round(input.price) !== Math.round(jobBudget)) {
    throw new Error(`This job has a firm price of $${Math.round(jobBudget)}. Offer amount must match.`)
  }

  const existing = await client
    .from('offers')
    .select('id')
    .eq('request_id', input.requestId)
    .eq('helper_id', userId)
    .maybeSingle()
  throwOnError(existing.error, 'Lookup offer')

  const payload = {
    price: !acceptsOffers && jobBudget > 0 ? Math.round(jobBudget) : input.price,
    note: input.note.trim(),
    eta: input.eta.trim() || 'Flexible',
    status: 'pending' as const,
  }

  if (existing.data?.id) {
    const { data, error } = await client
      .from('offers')
      .update(payload)
      .eq('id', existing.data.id)
      .select('*')
      .single()
    throwOnError(error, 'Update offer')
    return mapOffer(data)
  }

  const { data, error } = await client
    .from('offers')
    .insert({
      request_id: input.requestId,
      helper_id: userId,
      ...payload,
    })
    .select('*')
    .single()
  throwOnError(error, 'Create offer')
  return mapOffer(data)
}

export async function withdrawLiveOffer(
  client: Client,
  userId: string,
  offerId: string,
): Promise<Offer> {
  const { data, error } = await client
    .from('offers')
    .update({ status: 'withdrawn' as const })
    .eq('id', offerId)
    .eq('helper_id', userId)
    .eq('status', 'pending')
    .select('*')
    .maybeSingle()
  throwOnError(error, 'Cancel offer')
  if (!data) {
    throw new Error('This offer can no longer be canceled. It may have already been accepted or declined.')
  }
  return mapOffer(data)
}

export async function acceptLiveOffer(client: Client, offerId: string): Promise<void> {
  const { error } = await client.rpc('accept_offer', { p_offer_id: offerId })
  throwOnError(error, 'Accept offer')
}

export async function completeLiveRequest(client: Client, requestId: string): Promise<void> {
  const { error } = await client.rpc('complete_request', { p_request_id: requestId })
  throwOnError(error, 'Complete request')
}

export async function cancelLiveHelpRequest(client: Client, requestId: string): Promise<void> {
  const { error } = await client.rpc('cancel_help_request', { p_request_id: requestId })
  throwOnError(error, 'Cancel job')
}

export async function submitLiveReview(
  client: Client,
  input: { requestId: string; toId: string; rating: number; comment: string },
): Promise<Review> {
  const { data, error } = await client.rpc('submit_review', {
    p_request_id: input.requestId,
    p_to_id: input.toId,
    p_rating: input.rating,
    p_comment: input.comment.trim(),
  })
  throwOnError(error, 'Submit review')
  return mapReview(data)
}

export async function ensureLiveThread(
  client: Client,
  requestId: string,
  otherUserId: string,
): Promise<string> {
  const { data, error } = await client.rpc('ensure_thread', {
    p_request_id: requestId,
    p_other_user_id: otherUserId,
  })
  throwOnError(error, 'Ensure thread')
  return data.id
}

export async function ensureLiveDirectThread(
  client: Client,
  otherUserId: string,
): Promise<string> {
  const { data, error } = await client.rpc('ensure_direct_thread', {
    p_other_user_id: otherUserId,
  })
  throwOnError(error, 'Ensure direct thread')
  return data.id
}

export async function sendLiveMessage(
  client: Client,
  userId: string,
  threadId: string,
  body: string,
): Promise<void> {
  const thread = await client.from('message_threads').select('*').eq('id', threadId).single()
  throwOnError(thread.error, 'Load thread')
  // Explicit null for DMs (never omit / never empty string) so RLS
  // `is not distinct from` matches thread.request_id.
  const requestId =
    thread.data.request_id == null || thread.data.request_id === ''
      ? null
      : thread.data.request_id
  const { error } = await client.from('messages').insert({
    thread_id: threadId,
    request_id: requestId,
    sender_id: userId,
    body: body.trim(),
  })
  throwOnError(error, 'Send message')
}

export async function inviteLiveHelper(
  client: Client,
  requestId: string,
  helperId: string,
  note = '',
): Promise<RequestInvite> {
  const { data, error } = await client.rpc('invite_helper', {
    p_request_id: requestId,
    p_helper_id: helperId,
    p_note: note,
  })
  throwOnError(error, 'Invite helper')
  return mapInvite(data)
}

export async function toggleLiveSavedHelper(
  client: Client,
  userId: string,
  helperId: string,
  currentlySaved: boolean,
): Promise<void> {
  if (currentlySaved) {
    const { error } = await client
      .from('saved_helpers')
      .delete()
      .eq('user_id', userId)
      .eq('helper_id', helperId)
    throwOnError(error, 'Unsave helper')
  } else {
    const { error } = await client.from('saved_helpers').insert({
      user_id: userId,
      helper_id: helperId,
    })
    throwOnError(error, 'Save helper')
  }
}

/** Result of toggling a saved job; `missing_table` means migration not applied yet. */
export type ToggleSavedRequestResult = 'ok' | 'missing_table'

export async function toggleLiveSavedRequest(
  client: Client,
  userId: string,
  requestId: string,
  currentlySaved: boolean,
): Promise<ToggleSavedRequestResult> {
  if (currentlySaved) {
    const { error } = await client
      .from('saved_help_requests')
      .delete()
      .eq('user_id', userId)
      .eq('help_request_id', requestId)
    if (error && isMissingRelationError(error)) {
      console.warn(
        '[beam] saved_help_requests table missing; unsaved locally until migration is applied',
      )
      return 'missing_table'
    }
    throwOnError(error, 'Unsave request')
    return 'ok'
  }

  const { error } = await client.from('saved_help_requests').insert({
    user_id: userId,
    help_request_id: requestId,
  })
  if (error && isMissingRelationError(error)) {
    console.warn(
      '[beam] saved_help_requests table missing; saved locally until migration is applied',
    )
    return 'missing_table'
  }
  throwOnError(error, 'Save request')
  return 'ok'
}

export async function markLiveNotificationRead(
  client: Client,
  notificationId: string,
): Promise<void> {
  const { error } = await client
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
  throwOnError(error, 'Mark notification read')
}

export async function markAllLiveNotificationsRead(client: Client): Promise<number> {
  const { data, error } = await client.rpc('mark_all_notifications_read')
  throwOnError(error, 'Mark all notifications read')
  return Number(data ?? 0)
}

export type ConfirmHomeLocationResult = {
  ok: boolean
  result: string | null
  status: string | null
  message: string | null
  distanceM: number | null
  geocodeQuality: string | null
  attemptId: string | null
  verification: HelperVerification | null
}

export async function confirmLiveHelperHomeLocation(
  client: Client,
  input: {
    email: string
    street: string
    apt?: string
    city: string
    stateCode: string
    zip: string
    deviceLat: number
    deviceLng: number
    deviceAccuracyM: number
  },
): Promise<ConfirmHomeLocationResult> {
  const { data, error } = await client.rpc('confirm_helper_home_location', {
    p_email: input.email,
    p_street: input.street,
    p_apt: input.apt ?? null,
    p_city: input.city,
    p_state_code: input.stateCode,
    p_zip: input.zip,
    p_device_lat: input.deviceLat,
    p_device_lng: input.deviceLng,
    p_device_accuracy_m: input.deviceAccuracyM,
  })
  throwOnError(error, 'Confirm home location')
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
  return {
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
  }
}

export async function reviewLiveHelperVerification(
  client: Client,
  input: { profileId: string; approve: boolean; reason?: string },
): Promise<HelperVerification> {
  const { data, error } = await client.rpc('review_helper_verification', {
    p_profile_id: input.profileId,
    p_approve: input.approve,
    p_reason: input.reason ?? null,
  })
  throwOnError(error, 'Review verification')
  return mapHelperVerification(data as Record<string, unknown>)
}

export async function referLiveHelpersToJob(
  client: Client,
  input: { jobId: string; helperIds: string[]; note?: string },
): Promise<JobReferral[]> {
  const { data, error } = await client.rpc('refer_helpers_to_job', {
    p_job_id: input.jobId,
    p_helper_ids: input.helperIds,
    p_note: (input.note ?? '').slice(0, 280),
  })
  if (error && isMissingRelationError(error)) {
    throw new BeamBackendError(
      'Referrals are not available yet. Ask an admin to apply the job_referrals migration.',
      error,
    )
  }
  throwOnError(error, 'Refer helpers')
  return (data ?? []).map((row: Record<string, unknown>) => mapJobReferral(row))
}

export async function dismissLiveJobReferral(
  client: Client,
  referralId: string,
): Promise<JobReferral> {
  const { data, error } = await client.rpc('dismiss_job_referral', {
    p_referral_id: referralId,
  })
  if (error && isMissingRelationError(error)) {
    throw new BeamBackendError(
      'Referrals are not available yet. Ask an admin to apply the job_referrals migration.',
      error,
    )
  }
  throwOnError(error, 'Dismiss referral')
  return mapJobReferral(data as Record<string, unknown>)
}

export async function markLiveJobReferralViewed(
  client: Client,
  referralId: string,
): Promise<JobReferral> {
  const { data, error } = await client.rpc('mark_job_referral_viewed', {
    p_referral_id: referralId,
  })
  if (error && isMissingRelationError(error)) {
    throw new BeamBackendError(
      'Referrals are not available yet. Ask an admin to apply the job_referrals migration.',
      error,
    )
  }
  throwOnError(error, 'Mark referral viewed')
  return mapJobReferral(data as Record<string, unknown>)
}

/** Returns true when a new view row was inserted (and view_count incremented). */
export async function recordLiveHelpRequestView(
  client: Client,
  requestId: string,
  viewerKey: string,
): Promise<boolean> {
  const { data, error } = await client.rpc('record_help_request_view', {
    p_request_id: requestId,
    p_viewer_key: viewerKey,
  })
  if (error) {
    // Migration not applied yet, or transient RPC failure — callers fail silently.
    if (isMissingRelationError(error)) return false
    const msg = (error.message || '').toLowerCase()
    if (
      msg.includes('could not find the function') ||
      msg.includes('schema cache') ||
      error.code === 'PGRST202'
    ) {
      return false
    }
    return false
  }
  return Boolean(data)
}

export type { RateType, BeamNotification }
