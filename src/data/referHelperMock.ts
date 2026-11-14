/**
 * Throwaway mock data for the Refer a helper picker mockup.
 * Not wired to Supabase. Demo names match seed helpers.
 */

export type ReferHelperCandidate = {
  id: string
  name: string
  avatar: string
  skills: string[]
  rating: number
  reviewCount: number
  hourlyRate: number
  rateType: 'hourly' | 'quote'
  /** Shown under "People you've worked with" when search is empty. */
  workedWith: boolean
}

export type MockReferral = {
  id: string
  jobId: string
  jobTitle: string
  referrerId: string
  referrerName: string
  helperId: string
  note: string
  status: 'pending' | 'viewed' | 'dismissed'
}

export const MOCK_REFER_JOB = {
  id: 'req-1',
  title: 'Help move a couch upstairs',
  details:
    'Need two strong people to carry a sectional from a U-Haul into a second-floor walk-up on East 6th. Stairs only. Should take about 45 minutes if we move carefully.',
  budgetLabel: '$70',
  timingLabel: 'As soon as possible',
  areaLabel: 'East Austin, TX',
  image:
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
} as const

export const MOCK_REFER_HELPERS: ReferHelperCandidate[] = [
  {
    id: 'p-maya',
    name: 'Maya Chen',
    avatar:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&h=200&q=80',
    skills: ['House cleaning', 'Pet grooming'],
    rating: 5.0,
    reviewCount: 24,
    hourlyRate: 40,
    rateType: 'hourly',
    workedWith: true,
  },
  {
    id: 'p-jordan',
    name: 'Jordan Blake',
    avatar:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&h=200&q=80',
    skills: ['Junk removal', 'Auto detailing'],
    rating: 4.8,
    reviewCount: 19,
    hourlyRate: 45,
    rateType: 'hourly',
    workedWith: true,
  },
  {
    id: 'p-devon',
    name: 'Devon Park',
    avatar:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&h=200&q=80',
    skills: ['Pet sitting', 'Junk removal'],
    rating: 4.7,
    reviewCount: 15,
    hourlyRate: 28,
    rateType: 'hourly',
    workedWith: true,
  },
  {
    id: 'p-sam',
    name: 'Sam Ortiz',
    avatar:
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&h=200&q=80',
    skills: ['House cleaning', 'Events'],
    rating: 4.9,
    reviewCount: 33,
    hourlyRate: 38,
    rateType: 'hourly',
    workedWith: false,
  },
  {
    id: 'p-casey',
    name: 'Casey Brooks',
    avatar:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80',
    skills: ['Auto detailing', 'Junk removal', 'House cleaning'],
    rating: 4.8,
    reviewCount: 17,
    hourlyRate: 42,
    rateType: 'hourly',
    workedWith: false,
  },
  {
    id: 'p-riley',
    name: 'Riley Nguyen',
    avatar:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&h=200&q=80',
    skills: ['Carpet cleaning', 'Auto detailing'],
    rating: 5.0,
    reviewCount: 21,
    hourlyRate: 55,
    rateType: 'quote',
    workedWith: false,
  },
  {
    id: 'p-taylor',
    name: 'Taylor Kim',
    avatar:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&h=200&q=80',
    skills: ['Pet grooming', 'Pet sitting'],
    rating: 4.6,
    reviewCount: 9,
    hourlyRate: 36,
    rateType: 'hourly',
    workedWith: false,
  },
]

/** Owner-facing suggestions on their own job (Jordan referred these). */
export const MOCK_OWNER_SUGGESTIONS: MockReferral[] = [
  {
    id: 'ref-1',
    jobId: 'req-you-open',
    jobTitle: 'Cat drop-in while at a wedding',
    referrerId: 'p-jordan',
    referrerName: 'Jordan',
    helperId: 'p-maya',
    note: 'He fixed my fence, great work',
    status: 'pending',
  },
  {
    id: 'ref-2',
    jobId: 'req-you-open',
    jobTitle: 'Cat drop-in while at a wedding',
    referrerId: 'p-jordan',
    referrerName: 'Jordan',
    helperId: 'p-sam',
    note: 'Super careful with pets at my place last month.',
    status: 'pending',
  },
  {
    id: 'ref-3',
    jobId: 'req-you-open',
    jobTitle: 'Cat drop-in while at a wedding',
    referrerId: 'p-jordan',
    referrerName: 'Jordan',
    helperId: 'p-casey',
    note: 'Reliable and on time for a move I posted.',
    status: 'pending',
  },
  {
    id: 'ref-4',
    jobId: 'req-you-open',
    jobTitle: 'Cat drop-in while at a wedding',
    referrerId: 'p-devon',
    referrerName: 'Devon',
    helperId: 'p-riley',
    note: 'Helped me hang lights for a small party.',
    status: 'pending',
  },
]

export const MOCK_INBOX_REFERRAL = {
  neighborName: 'Jordan',
  neighborAvatar:
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&h=200&q=80',
  helperName: 'Maya Chen',
  note: 'He fixed my fence, great work',
  job: MOCK_REFER_JOB,
  whenLabel: 'Just now',
} as const

export function rateLabelFor(helper: Pick<ReferHelperCandidate, 'hourlyRate' | 'rateType'>) {
  if (helper.rateType === 'quote') return 'Contact for quote'
  return `$${Math.round(helper.hourlyRate)}/hr`
}

export function findMockHelper(id: string) {
  return MOCK_REFER_HELPERS.find((h) => h.id === id)
}
