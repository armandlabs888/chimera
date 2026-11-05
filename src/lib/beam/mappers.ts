import type {
  AvailabilitySlot,
  CategoryId,
  HelpRequest,
  Message,
  MessageThread,
  NeighborhoodId,
  Offer,
  Person,
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

export function mapProfile(row: ProfileRow, currentUserId?: string): Person {
  return {
    id: row.id,
    name: row.name,
    avatar: row.avatar_url,
    bio: row.bio,
    neighborhood: row.neighborhood as NeighborhoodId,
    skills: row.skills as CategoryId[],
    hourlyRate: Number(row.hourly_rate),
    availability: row.availability as AvailabilitySlot[],
    rating: Number(row.rating),
    reviewCount: row.review_count,
    jobsCompleted: row.jobs_completed,
    isCurrentUser: currentUserId ? row.id === currentUserId : undefined,
  }
}

export function mapRequest(row: RequestRow): HelpRequest {
  return {
    id: row.id,
    title: row.title,
    details: row.details,
    category: row.category as CategoryId,
    neighborhood: row.neighborhood as NeighborhoodId,
    when: row.when_option as WhenOption,
    whenLabel: row.when_label,
    budget: Number(row.budget),
    status: row.status as HelpRequest['status'],
    requesterId: row.requester_id,
    image: row.image,
    createdAt: row.created_at,
    acceptedOfferId: row.accepted_offer_id ?? undefined,
    helperId: row.helper_id ?? undefined,
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
