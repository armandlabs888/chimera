import type { AppState, HelpRequest, Message, MessageThread, Offer, Person, Review } from '../types'
import { getCategory } from './categories'

const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString()
const minutesAgo = (m: number) => new Date(Date.now() - m * 60 * 1000).toISOString()

export const CURRENT_USER_ID = 'user-you'

export const HERO_IMAGE =
  'https://images.unsplash.com/photo-1531218150217-54595bc2b934?auto=format&fit=crop&w=1600&q=80'

const people: Person[] = [
  {
    id: CURRENT_USER_ID,
    name: 'Alex Rivera',
    avatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&h=200&q=80',
    bio: 'East Austin neighbor who pitches in on moves and quick fixes. Available most evenings.',
    neighborhood: 'east-austin',
    skills: ['moving', 'handyman', 'petcare'],
    hourlyRate: 35,
    availability: ['afternoons', 'evenings', 'weekends'],
    rating: 4.9,
    reviewCount: 12,
    jobsCompleted: 18,
    isCurrentUser: true,
  },
  {
    id: 'p-maya',
    name: 'Maya Chen',
    avatar:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&h=200&q=80',
    bio: 'Former teacher. Patient algebra & Spanish tutor. Hyde Park based.',
    neighborhood: 'hyde-park',
    skills: ['tutoring', 'events'],
    hourlyRate: 40,
    availability: ['afternoons', 'evenings'],
    rating: 5.0,
    reviewCount: 24,
    jobsCompleted: 31,
  },
  {
    id: 'p-jordan',
    name: 'Jordan Blake',
    avatar:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&h=200&q=80',
    bio: 'Movers’ helper and furniture lifter. Truck access on weekends.',
    neighborhood: 'mueller',
    skills: ['moving', 'handyman'],
    hourlyRate: 45,
    availability: ['mornings', 'afternoons', 'weekends'],
    rating: 4.8,
    reviewCount: 19,
    jobsCompleted: 42,
  },
  {
    id: 'p-sam',
    name: 'Sam Ortiz',
    avatar:
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&h=200&q=80',
    bio: 'Detail-oriented cleaner. Move-outs and post-party resets are my jam.',
    neighborhood: 'south-congress',
    skills: ['cleaning', 'events'],
    hourlyRate: 38,
    availability: ['mornings', 'afternoons', 'weekends'],
    rating: 4.9,
    reviewCount: 33,
    jobsCompleted: 57,
  },
  {
    id: 'p-devon',
    name: 'Devon Park',
    avatar:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&h=200&q=80',
    bio: 'Dog person. Reliable walks and drop-ins around Zilker & SoCo.',
    neighborhood: 'zilker',
    skills: ['petcare', 'moving'],
    hourlyRate: 28,
    availability: ['mornings', 'afternoons', 'evenings'],
    rating: 4.7,
    reviewCount: 15,
    jobsCompleted: 28,
  },
  {
    id: 'p-riley',
    name: 'Riley Nguyen',
    avatar:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&h=200&q=80',
    bio: 'Photographer who also helps hang lights and stage small gatherings.',
    neighborhood: 'travis-heights',
    skills: ['events', 'handyman'],
    hourlyRate: 55,
    availability: ['afternoons', 'evenings', 'weekends'],
    rating: 5.0,
    reviewCount: 21,
    jobsCompleted: 26,
  },
  {
    id: 'p-casey',
    name: 'Casey Brooks',
    avatar:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80',
    bio: 'IKEA whisperer and TV mounter. Clarksville & downtown adjacent.',
    neighborhood: 'clarksville',
    skills: ['handyman', 'moving', 'cleaning'],
    hourlyRate: 42,
    availability: ['afternoons', 'weekends'],
    rating: 4.8,
    reviewCount: 17,
    jobsCompleted: 35,
  },
  {
    id: 'p-taylor',
    name: 'Taylor Kim',
    avatar:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&h=200&q=80',
    bio: 'North Austin helper near The Domain. Tutoring + light pet care.',
    neighborhood: 'the-domain',
    skills: ['tutoring', 'petcare'],
    hourlyRate: 36,
    availability: ['evenings', 'weekends'],
    rating: 4.6,
    reviewCount: 9,
    jobsCompleted: 14,
  },
]

const requests: HelpRequest[] = [
  {
    id: 'req-1',
    title: 'Help move a couch upstairs',
    details:
      'Need two strong people to carry a sectional from a U-Haul into a second-floor walk-up on East 6th. Stairs only. Should take about 45 minutes if we move carefully.',
    category: 'moving',
    neighborhood: 'east-austin',
    when: 'asap',
    whenLabel: 'ASAP',
    budget: 70,
    status: 'open',
    requesterId: 'p-sam',
    image: getCategory('moving').image,
    createdAt: minutesAgo(42),
  },
  {
    id: 'req-2',
    title: 'Algebra II homework help tonight',
    details:
      'High school junior stuck on quadratic equations. Prefer someone patient who can explain step-by-step. About 1 hour at the kitchen table or nearby cafe.',
    category: 'tutoring',
    neighborhood: 'hyde-park',
    when: 'today',
    whenLabel: 'Today · 6–8pm',
    budget: 50,
    status: 'open',
    requesterId: 'p-jordan',
    image: getCategory('tutoring').image,
    createdAt: hoursAgo(1.5),
  },
  {
    id: 'req-3',
    title: 'Afternoon dog walk (friendly lab)',
    details:
      'Need someone to walk our 3-year-old lab for 30–40 minutes around Zilker. Friendly with people and dogs. Leash and bags ready by the door.',
    category: 'petcare',
    neighborhood: 'zilker',
    when: 'today',
    whenLabel: 'Today · 3–5pm',
    budget: 28,
    status: 'open',
    requesterId: 'p-riley',
    image: getCategory('petcare').image,
    createdAt: hoursAgo(2),
  },
  {
    id: 'req-4',
    title: 'Mount a TV on drywall',
    details:
      '55" TV and fixed mount already purchased. Stud finder available. Prefer someone who has done this before. Clarksville bungalow living room.',
    category: 'handyman',
    neighborhood: 'clarksville',
    when: 'tomorrow',
    whenLabel: 'Tomorrow morning',
    budget: 75,
    status: 'open',
    requesterId: 'p-maya',
    image: getCategory('handyman').image,
    createdAt: hoursAgo(3),
  },
  {
    id: 'req-5',
    title: 'Post-brunch kitchen reset',
    details:
      'Kitchen and dining after a small brunch on South Congress. Dishes, counters, floors. Supplies here — need ~90 minutes of help.',
    category: 'cleaning',
    neighborhood: 'south-congress',
    when: 'asap',
    whenLabel: 'ASAP',
    budget: 60,
    status: 'open',
    requesterId: 'p-devon',
    image: getCategory('cleaning').image,
    createdAt: hoursAgo(0.8),
  },
  {
    id: 'req-6',
    title: 'Candid photos at backyard birthday',
    details:
      'Small backyard birthday in Travis Heights, ~20 people. Need candid shots for 90 minutes starting at golden hour. Phone or camera both fine.',
    category: 'events',
    neighborhood: 'travis-heights',
    when: 'tomorrow',
    whenLabel: 'Tomorrow · 5:30pm',
    budget: 90,
    status: 'open',
    requesterId: 'p-casey',
    image: getCategory('events').image,
    createdAt: hoursAgo(5),
  },
  {
    id: 'req-7',
    title: 'Assemble IKEA bookshelf',
    details:
      'KALLAX 4x4 still in the box at a Mueller condo. Tools on site. Looking for someone methodical — about 90 minutes.',
    category: 'handyman',
    neighborhood: 'mueller',
    when: 'this-week',
    whenLabel: 'This week',
    budget: 55,
    status: 'open',
    requesterId: 'p-taylor',
    image: getCategory('handyman').image,
    createdAt: hoursAgo(8),
  },
  {
    id: 'req-8',
    title: 'Load boxes into a truck',
    details:
      'About 20 medium boxes in the living room near The Domain. Need help loading into a pickup this afternoon.',
    category: 'moving',
    neighborhood: 'the-domain',
    when: 'today',
    whenLabel: 'Today',
    budget: 45,
    status: 'open',
    requesterId: 'p-maya',
    image: getCategory('moving').image,
    createdAt: hoursAgo(4),
  },
  {
    id: 'req-you-open',
    title: 'Cat drop-in while at a wedding',
    details:
      'Two chill indoor cats in East Austin. Need a 20-minute drop-in this evening: water, food, litter scoop, quick play. Key under the mat.',
    category: 'petcare',
    neighborhood: 'east-austin',
    when: 'today',
    whenLabel: 'Today · evening',
    budget: 30,
    status: 'open',
    requesterId: CURRENT_USER_ID,
    image: getCategory('petcare').image,
    createdAt: hoursAgo(1),
  },
]

const offers: Offer[] = [
  {
    id: 'off-1',
    requestId: 'req-1',
    helperId: 'p-jordan',
    price: 65,
    note: 'I can be there in 40 minutes with a friend. Done this walk-up move a dozen times.',
    eta: '40 min',
    status: 'pending',
    createdAt: minutesAgo(18),
  },
  {
    id: 'off-2',
    requestId: 'req-1',
    helperId: 'p-casey',
    price: 70,
    note: 'Available now. Bring moving blankets if you want — I have a set in the car.',
    eta: '25 min',
    status: 'pending',
    createdAt: minutesAgo(12),
  },
  {
    id: 'off-3',
    requestId: 'req-2',
    helperId: 'p-maya',
    price: 45,
    note: 'Former math teacher. Happy to work through the worksheet at Quack’s or at your place.',
    eta: 'Today 6pm',
    status: 'pending',
    createdAt: minutesAgo(35),
  },
  {
    id: 'off-4',
    requestId: 'req-you-open',
    helperId: 'p-devon',
    price: 28,
    note: 'I can swing by around 7pm after a walk near Lady Bird. Cat person — happy to scoop and play.',
    eta: '7:00pm',
    status: 'pending',
    createdAt: minutesAgo(22),
  },
  {
    id: 'off-5',
    requestId: 'req-5',
    helperId: CURRENT_USER_ID,
    price: 55,
    note: 'I can start in about an hour. Bring gloves and a good playlist.',
    eta: '~1 hr',
    status: 'pending',
    createdAt: minutesAgo(50),
  },
]

const threads: MessageThread[] = [
  {
    id: 'th-1',
    requestId: 'req-you-open',
    participantIds: [CURRENT_USER_ID, 'p-devon'],
    lastMessageAt: minutesAgo(10),
  },
  {
    id: 'th-2',
    requestId: 'req-5',
    participantIds: [CURRENT_USER_ID, 'p-devon'],
    lastMessageAt: minutesAgo(40),
  },
]

const messages: Message[] = [
  {
    id: 'msg-1',
    threadId: 'th-1',
    requestId: 'req-you-open',
    senderId: 'p-devon',
    body: 'Hey! Sent an offer for the cat drop-in. Any food quirks I should know about?',
    createdAt: minutesAgo(22),
  },
  {
    id: 'msg-2',
    threadId: 'th-1',
    requestId: 'req-you-open',
    senderId: CURRENT_USER_ID,
    body: 'Both eat the same wet food in the fridge — half a can each. Litter scoop is under the sink.',
    createdAt: minutesAgo(15),
  },
  {
    id: 'msg-3',
    threadId: 'th-1',
    requestId: 'req-you-open',
    senderId: 'p-devon',
    body: 'Perfect. I’ll text when I’m headed over around 7.',
    createdAt: minutesAgo(10),
  },
  {
    id: 'msg-4',
    threadId: 'th-2',
    requestId: 'req-5',
    senderId: CURRENT_USER_ID,
    body: 'Hi Devon — I offered on your kitchen reset. I can start around 1pm if that works.',
    createdAt: minutesAgo(50),
  },
  {
    id: 'msg-5',
    threadId: 'th-2',
    requestId: 'req-5',
    senderId: 'p-devon',
    body: 'That timing is great. Door code is in the offer notes once I accept. Thanks!',
    createdAt: minutesAgo(40),
  },
]

const reviews: Review[] = [
  {
    id: 'rev-1',
    requestId: 'req-past-1',
    fromId: 'p-sam',
    toId: CURRENT_USER_ID,
    rating: 5,
    comment: 'Alex made the couch move feel easy. On time and careful with the walls.',
    createdAt: hoursAgo(72),
  },
  {
    id: 'rev-2',
    requestId: 'req-past-2',
    fromId: 'p-jordan',
    toId: 'p-maya',
    rating: 5,
    comment: 'Maya explained algebra in a way that finally clicked. Highly recommend.',
    createdAt: hoursAgo(96),
  },
]

export function createSeedState(): AppState {
  return {
    version: 1,
    currentUserId: CURRENT_USER_ID,
    people: structuredClone(people),
    requests: structuredClone(requests),
    offers: structuredClone(offers),
    threads: structuredClone(threads),
    messages: structuredClone(messages),
    reviews: structuredClone(reviews),
  }
}
