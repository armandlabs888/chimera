import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AppState,
  BeamNotification,
  BudgetType,
  CategoryId,
  HelpRequest,
  NeighborhoodId,
  Offer,
  Person,
  RateType,
  RequestInvite,
  Review,
  WhenOption,
} from '@/types'
import {
  mapInvite,
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

function emptyExtras(): Pick<AppState, 'invites' | 'savedHelperIds' | 'notifications'> {
  return { invites: [], savedHelperIds: [], notifications: [] }
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
    notifications,
    privateDetails,
  ] = await Promise.all([
    client.from('profiles').select('*'),
    client.from('help_requests').select('*').order('created_at', { ascending: false }),
    client.from('offers').select('*').order('created_at', { ascending: false }),
    client.from('message_threads').select('*').order('last_message_at', { ascending: false }),
    client.from('messages').select('*').order('created_at', { ascending: true }),
    client.from('reviews').select('*').order('created_at', { ascending: false }),
    client.from('request_invites').select('*').order('created_at', { ascending: false }),
    client.from('saved_helpers').select('helper_id').eq('user_id', userId),
    client.from('notifications').select('*').eq('user_id', userId).order('created_at', {
      ascending: false,
    }),
    client.from('request_private_details').select('*'),
  ])

  throwOnError(profiles.error, 'Load profiles')
  throwOnError(requests.error, 'Load requests')
  throwOnError(offers.error, 'Load offers')
  throwOnError(threads.error, 'Load threads')
  throwOnError(messages.error, 'Load messages')
  throwOnError(reviews.error, 'Load reviews')
  // New tables may fail briefly on older deploys — treat as empty rather than hard-fail.
  const inviteRows = invites.error ? [] : (invites.data ?? [])
  const savedIds = saved.error ? [] : (saved.data ?? []).map((r) => r.helper_id as string)
  const notifRows = notifications.error ? [] : (notifications.data ?? [])
  const privateMap = new Map<string, string>()
  if (!privateDetails.error) {
    for (const row of privateDetails.data ?? []) {
      privateMap.set(row.request_id as string, String(row.exact_address ?? ''))
    }
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
    notifications: notifRows.map(mapNotification),
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

export async function updateLiveProfile(
  client: Client,
  userId: string,
  patch: Partial<Person>,
): Promise<void> {
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
  if (patch.hourlyRate !== undefined) payload.hourly_rate = patch.hourlyRate
  if (patch.availability !== undefined) payload.availability = patch.availability
  if (patch.locationLabel !== undefined) payload.location_label = patch.locationLabel
  if (patch.lat !== undefined) payload.lat = patch.lat
  if (patch.lng !== undefined) payload.lng = patch.lng
  if (patch.serviceRadiusMiles !== undefined) payload.service_radius_miles = patch.serviceRadiusMiles
  if (patch.rateType !== undefined) payload.rate_type = patch.rateType
  if (patch.availableNow !== undefined) payload.available_now = patch.availableNow
  if (patch.isHelper !== undefined) payload.is_helper = patch.isHelper

  const { error } = await client.from('profiles').update(payload).eq('id', userId)
  throwOnError(error, 'Update profile')
}

export type CreateRequestInput = {
  title: string
  details: string
  category: CategoryId
  neighborhood?: NeighborhoodId | ''
  when: WhenOption
  whenLabel: string
  budget: number
  image: string
  locationLabel?: string
  lat?: number | null
  lng?: number | null
  radiusMiles?: number
  exactAddress?: string
  budgetType?: BudgetType
  scheduledFor?: string | null
  preferredHelperId?: string | null
}

export async function createLiveRequest(
  client: Client,
  userId: string,
  input: CreateRequestInput,
): Promise<HelpRequest> {
  const budgetType = input.budgetType ?? (input.budget === 0 ? 'open' : 'fixed')
  const { data, error } = await client
    .from('help_requests')
    .insert({
      title: input.title.trim(),
      details: input.details.trim(),
      category: input.category,
      neighborhood: input.neighborhood ?? '',
      when_option: input.when,
      when_label: input.whenLabel,
      budget: budgetType === 'open' ? 0 : input.budget,
      budget_type: budgetType,
      status: 'open',
      requester_id: userId,
      image: input.image,
      location_label: input.locationLabel?.trim() || '',
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      radius_miles: input.radiusMiles ?? 5,
      scheduled_for: input.scheduledFor ?? null,
      preferred_helper_id: input.preferredHelperId ?? null,
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

  return mapRequest({ ...data, exact_address: exact || undefined })
}

export async function createLiveOffer(
  client: Client,
  userId: string,
  input: { requestId: string; price: number; note: string; eta: string },
): Promise<Offer> {
  const existing = await client
    .from('offers')
    .select('id')
    .eq('request_id', input.requestId)
    .eq('helper_id', userId)
    .maybeSingle()
  throwOnError(existing.error, 'Lookup offer')

  const payload = {
    price: input.price,
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

export async function acceptLiveOffer(client: Client, offerId: string): Promise<void> {
  const { error } = await client.rpc('accept_offer', { p_offer_id: offerId })
  throwOnError(error, 'Accept offer')
}

export async function completeLiveRequest(client: Client, requestId: string): Promise<void> {
  const { error } = await client.rpc('complete_request', { p_request_id: requestId })
  throwOnError(error, 'Complete request')
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

export async function sendLiveMessage(
  client: Client,
  userId: string,
  threadId: string,
  body: string,
): Promise<void> {
  const thread = await client.from('message_threads').select('*').eq('id', threadId).single()
  throwOnError(thread.error, 'Load thread')
  const { error } = await client.from('messages').insert({
    thread_id: threadId,
    request_id: thread.data.request_id,
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

export type { RateType, BeamNotification }
