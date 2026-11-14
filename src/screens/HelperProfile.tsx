'use client'

import { Heart } from 'lucide-react'
import { useParams } from 'next/navigation'
import { RequestCard } from '@/components/RequestCard'
import { HelperProfileHero } from '@/components/profile/HelperProfileHero'
import { HelperProfileReviews } from '@/components/profile/HelperProfileReviews'
import { ButtonLink, EmptyState } from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import { hidesPeerHelperDiscovery } from '@/lib/roles'

function paramId(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

export function HelperProfile() {
  const params = useParams()
  const id = paramId(params.id)
  const { getPerson, state, currentUser, authUser, mode, toggleSavedHelper } = useBeam()
  const person = getPerson(id)
  const isGuest = mode === 'live' && !authUser
  const hidePeerDiscovery = hidesPeerHelperDiscovery(currentUser, isGuest)
  const browseFallbackHref = hidePeerDiscovery ? '/browse' : '/browse?tab=people'

  if (!person) {
    return (
      <div className="py-10">
        <EmptyState
          title="Person not found"
          body="They may not be in this demo seed."
          action={
            <ButtonLink href={browseFallbackHref}>
              {hidePeerDiscovery ? 'Browse open jobs' : 'Browse people'}
            </ButtonLink>
          }
        />
      </div>
    )
  }

  const reviews = state.reviews
    .filter((r) => r.toId === person.id)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
  const theirOpen = state.requests.filter(
    (r) => r.requesterId === person.id && r.status === 'open',
  )
  const isYou = person.id === currentUser.id
  const saved = state.savedHelperIds?.includes(person.id) ?? false
  const primarySkill = person.skills[0]
  const bookHref = primarySkill
    ? `/post?rebook=${person.id}&category=${primarySkill}`
    : `/post?rebook=${person.id}`

  return (
    <div className="py-1 sm:py-2">
      <HelperProfileHero
        person={person}
        nameSuffix={isYou ? ' · You' : ''}
        trailingAction={
          !isYou && authUser ? (
            <button
              type="button"
              aria-label={saved ? 'Remove from favorites' : 'Save helper'}
              onClick={() => void toggleSavedHelper(person.id)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[rgba(7,19,48,0.1)] bg-white text-[#64748B] transition hover:text-[#1D5CE5]"
            >
              <Heart
                className={`h-5 w-5 ${saved ? 'fill-[#1D5CE5] text-[#1D5CE5]' : ''}`}
                strokeWidth={1.75}
              />
            </button>
          ) : null
        }
        actions={
          isYou ? (
            <ButtonLink href="/you#you-profile" variant="secondary">
              Edit helper profile
            </ButtonLink>
          ) : (
            <ButtonLink href={bookHref}>Request to book</ButtonLink>
          )
        }
      />

      <HelperProfileReviews reviews={reviews} getPerson={getPerson} />

      {theirOpen.length ? (
        <section className="mt-10">
          <h2 className="font-display text-[22px] font-bold text-[#071330]">Open requests</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {theirOpen.map((r) => (
              <RequestCard key={r.id} request={r} compact />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
