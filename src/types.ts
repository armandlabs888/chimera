import type { ServiceCategoryId } from '@/lib/taxonomy'

/** Active selectable service / skill ids (casual launch taxonomy). */
export type CategoryId = ServiceCategoryId

export type NeighborhoodId =
  | 'east-austin'
  | 'hyde-park'
  | 'mueller'
  | 'zilker'
  | 'south-congress'
  | 'travis-heights'
  | 'clarksville'
  | 'the-domain'

export type WhenOption = 'asap' | 'today' | 'tomorrow' | 'this-week' | 'scheduled'

export type RequestStatus = 'open' | 'accepted' | 'completed' | 'cancelled'

export type AvailabilitySlot = 'mornings' | 'afternoons' | 'evenings' | 'weekends'

export type BudgetType = 'fixed' | 'open'

export type RateType = 'hourly' | 'quote'

export type AccountRole = 'customer' | 'helper'

export type NotificationKind =
  | 'match_request'
  | 'invite'
  | 'new_offer'
  | 'offer_accepted'
  | 'new_message'
  | 'job_completed'
  | 'new_review'
  | 'verification_submitted'
  | 'verification_approved'
  | 'verification_needs_resubmission'

/** Helper offer gate: no row = not started (unverified). */
export type HelperVerificationStatus =
  | 'unverified'
  | 'pending'
  | 'approved'
  | 'needs_resubmission'

export type HelperLocationCheckResult =
  | 'matched'
  | 'not_at_home'
  | 'weak_signal'
  | 'geocode_imprecise'
  | 'geocode_failed'
  | 'rate_limited'
  | 'permission_denied'

export type HelperGeocodeQuality = 'rooftop' | 'range_interpolated'

export interface HelperVerificationAttempt {
  id: string
  profileId: string
  verificationId?: string | null
  result: HelperLocationCheckResult
  email?: string | null
  street?: string | null
  apt?: string | null
  city?: string | null
  stateCode?: string | null
  zip?: string | null
  addressLat?: number | null
  addressLng?: number | null
  geocodeQuality?: HelperGeocodeQuality | null
  deviceLat?: number | null
  deviceLng?: number | null
  deviceAccuracyM?: number | null
  distanceM?: number | null
  createdAt: string
}

export interface HelperVerification {
  id: string
  profileId: string
  status: HelperVerificationStatus
  email: string
  street: string
  apt?: string | null
  city: string
  stateCode: string
  zip: string
  /** Legacy bill fields; unused for location verification. */
  documentPath?: string | null
  documentName?: string | null
  documentMime?: string | null
  documentBytes?: number | null
  addressLat?: number | null
  addressLng?: number | null
  geocodeQuality?: HelperGeocodeQuality | null
  lastDeviceLat?: number | null
  lastDeviceLng?: number | null
  lastDeviceAccuracyM?: number | null
  lastDistanceM?: number | null
  lastCheckResult?: HelperLocationCheckResult | null
  lastCheckedAt?: string | null
  verificationMethod?: 'location' | 'staff' | 'document_legacy' | null
  reviewReason?: string | null
  reviewedBy?: string | null
  reviewedAt?: string | null
  submittedAt: string
  createdAt: string
  updatedAt: string
  /** Demo-only; never used in live mode. */
  documentPreviewUrl?: string | null
  /** Staff queue: latest location attempt when loaded. */
  latestAttempt?: HelperVerificationAttempt | null
}

export type { ServiceCategory as Category } from '@/lib/taxonomy'

export interface RequestTemplate {
  title: string
  details: string
  budgetHint: number
}

export interface Neighborhood {
  id: NeighborhoodId
  name: string
  shortName: string
}

export interface Person {
  id: string
  name: string
  avatar: string
  bio: string
  neighborhood: NeighborhoodId | ''
  /** Active service ids and/or legacy historical skill ids. */
  skills: Array<CategoryId | string>
  /** When skills includes `other`, the helper-described service name. */
  otherSkillLabel?: string | null
  hourlyRate: number
  availability: AvailabilitySlot[]
  rating: number
  reviewCount: number
  jobsCompleted: number
  isCurrentUser?: boolean
  locationLabel?: string
  lat?: number | null
  lng?: number | null
  serviceRadiusMiles?: number
  rateType?: RateType
  availableNow?: boolean
  isHelper?: boolean
  accountRole?: AccountRole | null
  city?: string | null
  stateCode?: string | null
  cityGeoid?: string | null
  onboardingCompletedAt?: string | null
  safetyDisclaimerAcceptedAt?: string | null
  safetyDisclaimerVersion?: string | null
}

export interface HelpRequest {
  id: string
  title: string
  details: string
  /** Active service id, or a legacy/historical category string. */
  category: CategoryId | string
  /** Required when category === 'other'. */
  categoryCustom?: string | null
  neighborhood: NeighborhoodId | ''
  when: WhenOption
  whenLabel: string
  budget: number
  status: RequestStatus
  requesterId: string
  /** Cover image (first of `images`) for cards / legacy. */
  image: string
  /** Ordered listing photos (0–5). */
  images?: string[]
  createdAt: string
  acceptedOfferId?: string
  helperId?: string
  locationLabel?: string
  /** Optional structured city when known (Popular gigs city match). */
  city?: string | null
  /** Optional 2-letter state when known (Popular gigs city match). */
  stateCode?: string | null
  exactAddress?: string
  lat?: number | null
  lng?: number | null
  /** Legacy helper-match radius; not set by new listing UI. */
  radiusMiles?: number
  budgetType?: BudgetType
  scheduledFor?: string | null
  /** Optional end of requester time window. */
  scheduledEnd?: string | null
  preferredHelperId?: string | null
  publicOfferCount?: number
}

export interface Offer {
  id: string
  requestId: string
  helperId: string
  price: number
  note: string
  eta: string
  status: 'pending' | 'accepted' | 'declined' | 'withdrawn'
  createdAt: string
}

export interface Message {
  id: string
  threadId: string
  requestId: string
  senderId: string
  body: string
  createdAt: string
  isSimulated?: boolean
}

export interface MessageThread {
  id: string
  requestId: string
  participantIds: [string, string]
  lastMessageAt: string
}

export interface Review {
  id: string
  requestId: string
  fromId: string
  toId: string
  rating: number
  comment: string
  createdAt: string
}

export interface RequestInvite {
  id: string
  requestId: string
  requesterId: string
  helperId: string
  note: string
  status: 'pending' | 'responded' | 'declined'
  createdAt: string
}

export interface BeamNotification {
  id: string
  userId: string
  kind: NotificationKind
  title: string
  body: string
  href: string
  requestId?: string | null
  readAt?: string | null
  createdAt: string
}

export interface AppState {
  version: number
  currentUserId: string
  people: Person[]
  requests: HelpRequest[]
  offers: Offer[]
  threads: MessageThread[]
  messages: Message[]
  reviews: Review[]
  invites: RequestInvite[]
  savedHelperIds: string[]
  notifications: BeamNotification[]
  /** Current user's verification record (null = not started). */
  helperVerification?: HelperVerification | null
  /** All verification rows visible to staff (demo + live staff load). */
  helperVerifications?: HelperVerification[]
  /** Whether the signed-in user is on the Beam staff allowlist. */
  isBeamStaff?: boolean
}

export interface MatchScore {
  person: Person
  score: number
  distanceMiles: number
  skillMatch: boolean
  availableNow: boolean
  reasons: string[]
}
