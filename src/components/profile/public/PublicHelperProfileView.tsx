'use client'

import { HelperProfileBody } from '@/components/profile/HelperProfileBody'
import { ButtonLink, EmptyState } from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import { hidesPeerHelperDiscovery } from '@/lib/roles'
import type { Person, Review } from '@/types'

export function PublicHelperProfileView({
  person,
  reviews,
}: {
  person: Person
  reviews: Review[]
}) {
  return <HelperProfileBody person={person} reviews={reviews} variant="public" />
}

export function PublicHelperNotFound() {
  const { currentUser, authUser, mode } = useBeam()
  const isGuest = mode === 'live' && !authUser
  const hidePeerDiscovery = hidesPeerHelperDiscovery(currentUser, isGuest)
  const browseFallbackHref = hidePeerDiscovery ? '/browse' : '/browse?tab=people'
  return (
    <div className="beam-container py-10" data-testid="public-helper-not-found">
      <EmptyState
        titleAs="h1"
        title="This profile isn't available"
        body="It may be private, or the link may be incorrect."
        action={
          <ButtonLink href={browseFallbackHref}>
            {hidePeerDiscovery ? 'Browse open jobs' : 'Browse people'}
          </ButtonLink>
        }
      />
    </div>
  )
}
