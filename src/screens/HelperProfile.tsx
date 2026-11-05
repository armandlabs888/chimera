'use client'

import { MapPin, Star } from 'lucide-react'
import { useParams } from 'next/navigation'
import { RequestCard } from '../components/RequestCard'
import { Badge, ButtonLink, EmptyState, SectionHeader } from '../components/ui'
import { useBeam } from '../context/BeamContext'
import { getCategory } from '../data/categories'
import { getNeighborhood } from '../data/neighborhoods'
import { formatMoney } from '../lib/matching'

const AVAIL_LABELS: Record<string, string> = {
  mornings: 'Mornings',
  afternoons: 'Afternoons',
  evenings: 'Evenings',
  weekends: 'Weekends',
}

function paramId(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

export function HelperProfile() {
  const params = useParams()
  const id = paramId(params.id)
  const { getPerson, state, currentUser } = useBeam()
  const person = getPerson(id)

  if (!person) {
    return (
      <div className="px-4 py-10">
        <EmptyState
          title="Person not found"
          body="They may not be in this demo seed."
          action={<ButtonLink href="/browse?tab=people">Browse people</ButtonLink>}
        />
      </div>
    )
  }

  const reviews = state.reviews.filter((r) => r.toId === person.id)
  const theirOpen = state.requests.filter(
    (r) => r.requesterId === person.id && r.status === 'open',
  )
  const isYou = person.id === currentUser.id

  return (
    <div className="px-4 py-6">
      <div className="overflow-hidden rounded-3xl border border-beam-line bg-beam-raised">
        <div className="h-28 bg-gradient-to-br from-beam-amber/30 via-beam-panel to-beam-base" />
        <div className="px-4 pb-5">
          <img
            src={person.avatar}
            alt=""
            className="-mt-12 h-24 w-24 rounded-2xl border-4 border-beam-raised object-cover"
          />
          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl text-beam-cream">
                {person.name}
                {isYou ? ' · You' : ''}
              </h1>
              <p className="mt-1 flex items-center gap-1 text-sm text-beam-muted">
                <MapPin className="h-4 w-4 text-beam-amber" />
                {getNeighborhood(person.neighborhood).name}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-semibold text-beam-amber">
                {formatMoney(person.hourlyRate)}/hr
              </p>
              <p className="mt-1 inline-flex items-center gap-1 text-sm text-beam-cream-dim">
                <Star className="h-4 w-4 fill-beam-amber text-beam-amber" />
                {person.rating.toFixed(1)} · {person.reviewCount} reviews
              </p>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-beam-cream-dim">{person.bio}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {person.skills.map((skill) => (
              <Badge key={skill} tone="amber">
                {getCategory(skill).label}
              </Badge>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {person.availability.map((slot) => (
              <Badge key={slot}>{AVAIL_LABELS[slot] ?? slot}</Badge>
            ))}
          </div>
          <p className="mt-4 text-sm text-beam-muted">{person.jobsCompleted} jobs completed on Beam</p>
          {isYou ? (
            <ButtonLink href="/you" variant="secondary" className="mt-4">
              Edit your profile
            </ButtonLink>
          ) : null}
        </div>
      </div>

      <section className="mt-8">
        <SectionHeader title="Reviews" />
        {reviews.length ? (
          <ul className="space-y-3">
            {reviews.map((review) => {
              const from = getPerson(review.fromId)
              return (
                <li key={review.id} className="rounded-2xl border border-beam-line bg-beam-raised p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Star className="h-4 w-4 fill-beam-amber text-beam-amber" />
                    <span className="font-semibold text-beam-cream">{review.rating}/5</span>
                    <span className="text-beam-muted">from {from?.name ?? 'Neighbor'}</span>
                  </div>
                  <p className="mt-2 text-sm text-beam-cream-dim">{review.comment}</p>
                </li>
              )
            })}
          </ul>
        ) : (
          <EmptyState title="No reviews yet" body="Completed jobs will show neighbor feedback here." />
        )}
      </section>

      {theirOpen.length ? (
        <section className="mt-8">
          <SectionHeader title="Open requests" />
          <div className="grid gap-4 sm:grid-cols-2">
            {theirOpen.map((r) => (
              <RequestCard key={r.id} request={r} compact />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
