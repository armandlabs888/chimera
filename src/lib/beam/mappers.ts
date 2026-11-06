import type {
  AvailabilitySlot,
  BeamNotification,
  BudgetType,
  CategoryId,
  HelpRequest,
  Message,
  MessageThread,
  NeighborhoodId,
  NotificationKind,
  Offer,
  Person,
  RateType,
  RequestInvite,
  Review,
  WhenOption,
} from '@/types'
import type { Database } from '@/lib/supabase/database.types'

type ProfileRow = Database['public']['Tables']['profiles']['Row']
type RequestRow = Database['public']['Tables']['help_requests']['Row']
type OfferRow = Database['public']['Tables']['offers']['Row']
type ThreadRow = Database['public']['Tables']['message_threads']['Row']
type MessageRow = Database['public']['Tables']['messages']['Row']
type ReviewRow = Database['public']['Tables']['reviews']['Row']
type InviteRow = Database['public']['Tables']['request_invites']['Row']
type NotificationRow = Database['public']['Tables']['notifications']['Row']

export function mapProfile(row: ProfileRow, currentUserId?: string): Person {
  const skills = (row.skills ?? []) as CategoryId[]
  return {
    id: row.id,
    name: row.name,
    avatar: row.avatar_url,
    bio: row.bio,
    neighborhood: (row.neighborhood || '') as NeighborhoodId | '',
    skills,
    hourlyRate: Number(row.hourly_rate),
    availability: (row.availability ?? []) as AvailabilitySlot[],
    rating: Number(row.rating),
    reviewCount: row.review_count,
    jobsCompleted: row.jobs_completed,
    isCurrentUser: currentUserId ? row.id === currentUserId : undefined,
    locationLabel: row.location_label || '',
    lat: row.lat,
    lng: row.lng,
    serviceRadiusMiles: row.service_radius_miles ?? 5,
    rateType: (row.rate_type as RateType) || 'hourly',
    availableNow: Boolean(row.available_now),
    isHelper: Boolean(row.is_helper) || skills.length > 0,
  }
}

export function mapRequest(
  row: RequestRow & { offer_count?: number; exact_address?: string },
): HelpRequest {
  return {
    id: row.id,
    title: row.title,
    details: row.details,
    category: row.category as CategoryId,
    neighborhood: (row.neighborhood || '') as NeighborhoodId | '',
    when: row.when_option as WhenOption,
    whenLabel: row.when_label,
    budget: Number(row.budget),
    status: row.status as HelpRequest['status'],
    requesterId: row.requester_id,
    image: row.image,
    createdAt: row.created_at,
    acceptedOfferId: row.accepted_offer_id ?? undefined,
    helperId: row.helper_id ?? undefined,
    locationLabel: row.location_label || '',
    exactAddress: row.exact_address || undefined,
    lat: row.lat,
    lng: row.lng,
    radiusMiles: row.radius_miles ?? 5,
    budgetType: (row.budget_type as BudgetType) || (Number(row.budget) === 0 ? 'open' : 'fixed'),
    scheduledFor: row.scheduled_for,
    preferredHelperId: row.preferred_helper_id,
    publicOfferCount: row.offer_count,
  }
}

export function mapOffer(row: OfferRow): Offer {
  return {
    id: row.id,
    requestId: row.request_id,
    helperId: row.helper_id,
    price: Number(row.price),
    note: row.note,
    eta: row.eta,
    status: row.status as Offer['status'],
    createdAt: row.created_at,
  }
}

export function mapThread(row: ThreadRow): MessageThread {
  return {
    id: row.id,
    requestId: row.request_id,
    participantIds: [row.participant_a, row.participant_b],
    lastMessageAt: row.last_message_at,
  }
}

export function mapMessage(row: MessageRow): Message {
  return {
    id: row.id,
    threadId: row.thread_id,
    requestId: row.request_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
  }
}

export function mapReview(row: ReviewRow): Review {
  return {
    id: row.id,
    requestId: row.request_id,
    fromId: row.from_id,
    toId: row.to_id,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at,
  }
}

export function mapInvite(row: InviteRow): RequestInvite {
  return {
    id: row.id,
    requestId: row.request_id,
    requesterId: row.requester_id,
    helperId: row.helper_id,
    note: row.note,
    status: row.status as RequestInvite['status'],
    createdAt: row.created_at,
  }
}

export function mapNotification(row: NotificationRow): BeamNotification {
  return {
    id: row.id,
    userId: row.user_id,
    kind: row.kind as NotificationKind,
    title: row.title,
    body: row.body,
    href: row.href,
    requestId: row.request_id,
    readAt: row.read_at,
    createdAt: row.created_at,
  }
}

/** Map public marketplace RPC JSON rows (snake_case, subset of columns). */
export function mapPublicProfile(row: Record<string, unknown>): Person {
  const skills = (row.skills as CategoryId[]) ?? []
  return {
    id: String(row.id),
    name: String(row.name ?? 'Neighbor'),
    avatar: String(row.avatar_url ?? ''),
    bio: String(row.bio ?? ''),
    neighborhood: (String(row.neighborhood ?? '') || '') as NeighborhoodId | '',
    skills,
    hourlyRate: Number(row.hourly_rate ?? 0),
    availability: (row.availability as AvailabilitySlot[]) ?? [],
    rating: Number(row.rating ?? 0),
    reviewCount: Number(row.review_count ?? 0),
    jobsCompleted: Number(row.jobs_completed ?? 0),
    locationLabel: String(row.location_label ?? ''),
    lat: (row.lat as number | null) ?? null,
    lng: (row.lng as number | null) ?? null,
    serviceRadiusMiles: Number(row.service_radius_miles ?? 5),
    rateType: (row.rate_type as RateType) || 'hourly',
    availableNow: Boolean(row.available_now),
    isHelper: Boolean(row.is_helper) || skills.length > 0,
  }
}

export function mapPublicRequest(row: Record<string, unknown>): HelpRequest {
  const budget = Number(row.budget ?? 0)
  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    details: String(row.details ?? ''),
    category: row.category as CategoryId,
    neighborhood: (String(row.neighborhood ?? '') || '') as NeighborhoodId | '',
    when: row.when_option as WhenOption,
    whenLabel: String(row.when_label ?? ''),
    budget,
    status: 'open',
    requesterId: String(row.requester_id),
    image: String(row.image ?? ''),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    locationLabel: String(row.location_label ?? ''),
    lat: (row.lat as number | null) ?? null,
    lng: (row.lng as number | null) ?? null,
    radiusMiles: Number(row.radius_miles ?? 5),
    budgetType: (row.budget_type as BudgetType) || (budget === 0 ? 'open' : 'fixed'),
    scheduledFor: (row.scheduled_for as string | null) ?? null,
    publicOfferCount: Number(row.offer_count ?? 0),
  }
}

export function mapPublicReview(row: Record<string, unknown>): Review {
  return {
    id: String(row.id),
    requestId: String(row.request_id),
    fromId: String(row.from_id),
    toId: String(row.to_id),
    rating: Number(row.rating ?? 0),
    comment: String(row.comment ?? ''),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  }
}
