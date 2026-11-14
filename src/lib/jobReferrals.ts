import { isHelperPerson } from '@/lib/roles'
import { formatRate } from '@/lib/matching'
import { formatCategoryLabel } from '@/lib/taxonomy'
import type { HelpRequest, JobReferral, MessageThread, Person } from '@/types'

export const REFERRAL_NOTE_MAX = 280

export type ReferHelperCandidate = {
  id: string
  name: string
  avatar: string
  skills: string[]
  rating: number
  reviewCount: number
  rateLabel: string
  workedWith: boolean
  alreadySuggested: boolean
}

/** Helpers the current user has messaged or hired. */
export function workedWithHelperIds(
  currentUserId: string,
  threads: MessageThread[],
  requests: HelpRequest[],
): Set<string> {
  const ids = new Set<string>()
  for (const thread of threads) {
    if (!thread.participantIds.includes(currentUserId)) continue
    for (const pid of thread.participantIds) {
      if (pid !== currentUserId) ids.add(pid)
    }
  }
  for (const req of requests) {
    if (req.requesterId === currentUserId && req.helperId) ids.add(req.helperId)
  }
  return ids
}

export function buildReferCandidates(input: {
  people: Person[]
  currentUserId: string
  jobOwnerId: string
  jobId: string
  referrals: JobReferral[]
  threads: MessageThread[]
  requests: HelpRequest[]
}): ReferHelperCandidate[] {
  const worked = workedWithHelperIds(input.currentUserId, input.threads, input.requests)
  const already = new Set(
    input.referrals.filter((r) => r.jobId === input.jobId).map((r) => r.helperId),
  )

  return input.people
    .filter((p) => {
      if (p.id === input.currentUserId || p.id === input.jobOwnerId) return false
      return isHelperPerson(p)
    })
    .map((p) => {
      const skills = p.skills
        .slice(0, 2)
        .map((s) => formatCategoryLabel(s, s === 'other' ? p.otherSkillLabel : null))
      return {
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        skills,
        rating: p.rating,
        reviewCount: p.reviewCount,
        rateLabel: formatRate(p),
        workedWith: worked.has(p.id),
        alreadySuggested: already.has(p.id),
      }
    })
    .sort((a, b) => {
      if (a.workedWith !== b.workedWith) return a.workedWith ? -1 : 1
      return a.name.localeCompare(b.name)
    })
}

export function activeReferralsForJob(
  referrals: JobReferral[] | undefined,
  jobId: string,
): JobReferral[] {
  return (referrals ?? [])
    .filter((r) => r.jobId === jobId && r.status !== 'dismissed')
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
}

export function inboundReferralsForHelper(
  referrals: JobReferral[] | undefined,
  helperId: string,
): JobReferral[] {
  return (referrals ?? [])
    .filter((r) => r.helperId === helperId && r.status !== 'dismissed')
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
}
