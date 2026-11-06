export type CategoryId =
  | 'moving'
  | 'cleaning'
  | 'tutoring'
  | 'petcare'
  | 'handyman'
  | 'events'

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

export type NotificationKind =
  | 'match_request'
  | 'invite'
  | 'new_offer'
  | 'offer_accepted'
  | 'new_message'
  | 'job_completed'
  | 'new_review'

export interface Category {
  id: CategoryId
  label: string
  shortLabel: string
  description: string
  image: string
  /** Soft tile background for category icon badges */
  tintBg: string
  /** Deep foreground for category icons / labels */
  tintFg: string
  /** Typical budget range shown on marketing tiles */
  typicalRange: string
  /** Arrival expectation shown on marketing tiles */
  arrival: string
  templates: RequestTemplate[]
}

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
  skills: CategoryId[]
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
}

export interface HelpRequest {
  id: string
  title: string
  details: string
  category: CategoryId
  neighborhood: NeighborhoodId | ''
  when: WhenOption
  whenLabel: string
  budget: number
  status: RequestStatus
  requesterId: string
  image: string
  createdAt: string
  acceptedOfferId?: string
  helperId?: string
  locationLabel?: string
  exactAddress?: string
  lat?: number | null
  lng?: number | null
  radiusMiles?: number
  budgetType?: BudgetType
  scheduledFor?: string | null
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
}

export interface MatchScore {
  person: Person
  score: number
  distanceMiles: number
  skillMatch: boolean
  availableNow: boolean
  reasons: string[]
}
