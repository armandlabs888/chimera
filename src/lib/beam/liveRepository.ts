import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AppState,
  CategoryId,
  HelpRequest,
  NeighborhoodId,
  Offer,
  Person,
  Review,
  WhenOption,
} from '@/types'
import {
  mapMessage,
  mapOffer,
  mapProfile,
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

export async function loadLiveState(client: Client, userId: string): Promise<AppState> {
  const [profiles, requests, offers, threads, messages, reviews] = await Promise.all([
    client.from('profiles').select('*'),
    client.from('help_requests').select('*').order('created_at', { ascending: false }),
    client.from('offers').select('*').order('created_at', { ascending: false }),
    client.from('message_threads').select('*').order('last_message_at', { ascending: false }),
    client.from('messages').select('*').order('created_at', { ascending: true }),
    client.from('reviews').select('*').order('created_at', { ascending: false }),
  ])

  throwOnError(profiles.error, 'Load profiles')
  throwOnError(requests.error, 'Load requests')
  throwOnError(offers.error, 'Load offers')
  throwOnError(threads.error, 'Load threads')
  throwOnError(messages.error, 'Load messages')
  throwOnError(reviews.error, 'Load reviews')

  return {
    version: 1,
    currentUserId: userId,
    people: (profiles.data ?? []).map((row) => mapProfile(row, userId)),
    requests: (requests.data ?? []).map(mapRequest),
    offers: (offers.data ?? []).map(mapOffer),
    threads: (threads.data ?? []).map(mapThread),
    messages: (messages.data ?? []).map(mapMessage),
    reviews: (reviews.data ?? []).map(mapReview),
  }
}

export type EnsureProfileSeed = {
  name?: string
  avatarUrl?: string
  neighborhood?: string
}

/**
 * Ensure a profiles row exists for the signed-in user.
 * Never clobbers a non-empty name or avatar; only fills blanks from seed/OAuth metadata.
 * Requires an authenticated session (auth.uid()) — do not call without data.session.
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
  const fallbackNeighborhood = normalized.neighborhood?.trim() || 'east-austin'

  const existing = await client.from('profiles').select('*').eq('id', userId).maybeSingle()
  throwOnError(existing.error, 'Load profile')

  if (existing.data) {
    const patch: Record<string, unknown> = {}
    const currentName = String(existing.data.name ?? '').trim()
    const currentAvatar = String(existing.data.avatar_url ?? '').trim()
    if (!currentName && fallbackName) patch.name = fallbackName
    if (!currentAvatar && fallbackAvatar) patch.avatar_url = fallbackAvatar
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
  if (patch.skills !== undefined) payload.skills = patch.skills
  if (patch.hourlyRate !== undefined) payload.hourly_rate = patch.hourlyRate
  if (patch.availability !== undefined) payload.availability = patch.availability

  const { error } = await client.from('profiles').update(payload).eq('id', userId)
  throwOnError(error, 'Update profile')
}

export async function createLiveRequest(
  client: Client,
  userId: string,
  input: {
    title: string
    details: string
    category: CategoryId
    neighborhood: NeighborhoodId
    when: WhenOption
    whenLabel: string
    budget: number
    image: string
  },
): Promise<HelpRequest> {
  const { data, error } = await client
    .from('help_requests')
    .insert({
      title: input.title.trim(),
      details: input.details.trim(),
      category: input.category,
      neighborhood: input.neighborhood,
      when_option: input.when,
      when_label: input.whenLabel,
      budget: input.budget,
      status: 'open',
      requester_id: userId,
      image: input.image,
    })
    .select('*')
    .single()
  throwOnError(error, 'Create request')
  return mapRequest(data)
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
