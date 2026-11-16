'use client'

import { useMemo } from 'react'
import { useParams } from 'next/navigation'
import { PageContainer } from '@/components/PageContainer'
import { HelperProfileBody } from '@/components/profile/HelperProfileBody'
import {
  PublicHelperNotFound,
  PublicHelperProfileView,
  PublicProfileSignInPrompt,
} from '@/components/profile/public/PublicHelperProfileView'
import { useBeam } from '@/context/BeamContext'
import { isHelperPerson } from '@/lib/roles'

function paramId(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

export function HelperProfile() {
  const params = useParams()
  const id = paramId(params.id)
  const { getPerson, state, ready, authUser, mode, currentUser } = useBeam()
  const person = getPerson(id)
  const isGuest = mode === 'live' && !authUser

  const reviews = useMemo(() => {
    if (!person) return []
    return state.reviews
      .filter((r) => r.toId === person.id)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
  }, [person, state.reviews])

  const jobsPosted = useMemo(() => {
    if (!person) return 0
    return state.requests.filter((r) => r.requesterId === person.id).length
  }, [person, state.requests])

  if (!ready) {
    return (
      <PageContainer className="pb-24 pt-4 sm:pb-10 sm:pt-6 md:pb-10">
        <p className="text-[14px] text-[#4A5568]" data-testid="public-profile-loading">
          Loading profile…
        </p>
      </PageContainer>
    )
  }

  if (!person) {
    // Signed-out marketplace often omits neighbors; prompt sign-in instead of a hard miss.
    if (isGuest) {
      return <PublicProfileSignInPrompt profilePath={`/people/${id}`} />
    }
    return <PublicHelperNotFound />
  }

  if (isHelperPerson(person)) {
    return (
      <PageContainer className="pb-[calc(var(--beam-mobile-dock-clearance)+2rem)] pt-4 sm:pb-10 sm:pt-6 md:pb-10">
        <PublicHelperProfileView person={person} reviews={reviews} />
      </PageContainer>
    )
  }

  const isOwn = person.id === currentUser.id

  return (
    <PageContainer className="pb-[calc(var(--beam-mobile-dock-clearance)+2rem)] pt-4 sm:pb-10 sm:pt-6 md:pb-10">
      <HelperProfileBody
        person={person}
        reviews={reviews}
        variant={isOwn ? 'own' : 'public'}
        jobsPosted={jobsPosted}
      />
    </PageContainer>
  )
}
