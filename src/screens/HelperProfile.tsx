'use client'

import { useParams } from 'next/navigation'
import {
  PublicHelperNotFound,
  PublicHelperProfileView,
} from '@/components/profile/public/PublicHelperProfileView'
import { useBeam } from '@/context/BeamContext'

function paramId(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

export function HelperProfile() {
  const params = useParams()
  const id = paramId(params.id)
  const { getPerson, state } = useBeam()
  const person = getPerson(id)

  if (!person) {
    return <PublicHelperNotFound />
  }

  const reviews = state.reviews
    .filter((r) => r.toId === person.id)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))

  return (
    <div className="beam-container pb-24 pt-4 sm:pb-10 sm:pt-6 md:pb-10">
      <PublicHelperProfileView person={person} reviews={reviews} />
    </div>
  )
}
