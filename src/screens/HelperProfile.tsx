'use client'

import { Heart, MapPin, Star } from 'lucide-react'
import { useParams } from 'next/navigation'
import { RequestCard } from '@/components/RequestCard'
import { Avatar, ButtonLink, EmptyState } from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import { getCategory } from '@/data/categories'
import { formatLocation } from '@/lib/location'
import { formatRate, relativeTime } from '@/lib/matching'

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
  const { getPerson, state, currentUser, authUser, toggleSavedHelper } = useBeam()
  const person = getPerson(id)

  if (!person) {
    return (
      <div className="py-10">
        <EmptyState
          title="Person not found"
          body="They may not be in this demo seed."
          action={<ButtonLink href="/browse?tab=people">Browse people</ButtonLink>}
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
  const locationLabel = formatLocation(person)
  const radius = person.serviceRadiusMiles ?? 5
  const primarySkill = person.skills[0]
  const bookHref = primarySkill
    ? `/post?rebook=${person.id}&category=${primarySkill}`
    : `/post?rebook=${person.id}`

  return (
    <div className="py-1 sm:py-2">
      <div className="overflow-hidden rounded-lg border border-[rgba(7,19,48,0.08)] bg-white shadow-[0_10px_28px_-12px_rgba(12,42,102,0.08)]">
        <div className="h-24 bg-gradient-to-br from-[#E8F1FF] via-[#F4F8FD] to-[#FFF8D6] sm:h-28" />
        <div className="relative px-5 pb-6 pt-0 sm:px-7">
          <div className="-mt-12 flex flex-wrap items-end justify-between gap-3">
            <div className="rounded-lg ring-4 ring-white">
              <Avatar src={person.avatar} name={person.name} size={88} />
            </div>
            {!isYou && authUser ? (
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
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-[clamp(1.6rem,3vw,2rem)] font-bold tracking-[-0.02em] text-[#071330]">
                  {person.name}
                  {isYou ? ' · You' : ''}
                </h1>
                {person.availableNow ? (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-[12px] font-semibold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Available now
                  </span>
                ) : null}
              </div>
              <p className="mt-2 inline-flex items-center gap-1.5 text-[14px] text-[#64748B]">
                <MapPin className="h-4 w-4 shrink-0 text-[#94A3B8]" aria-hidden />
                <span>
                  {locationLabel}
                  <span className="text-[#94A3B8]"> · </span>
                  Within {radius} mi
                </span>
              </p>
              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-[#475569]">
                {person.rating > 0 && person.reviewCount > 0 ? (
                  <>
                    <span className="inline-flex items-center gap-1 font-semibold text-[#071330]">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
                      {person.rating.toFixed(1)}
                    </span>
                    <span className="text-[#94A3B8]">({person.reviewCount} reviews)</span>
                  </>
                ) : (
                  <span className="rounded bg-[#F1F5F9] px-1.5 py-0.5 text-[12px] font-medium text-[#64748B]">
                    New
                  </span>
                )}
                <span className="text-[#CBD5E1]" aria-hidden>
                  ·
                </span>
                <span>{person.jobsCompleted} jobs completed</span>
              </p>
            </div>
            <p className="shrink-0 font-display text-[22px] font-bold text-[#071330]">
              {formatRate(person)}
            </p>
          </div>

          {person.bio ? (
            <p className="mt-4 max-w-2xl text-[15px] leading-[1.55] text-[#475569]">{person.bio}</p>
          ) : null}

          {person.skills.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {person.skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex rounded-md bg-[#F4F8FD] px-3 py-1.5 text-[12.5px] font-semibold text-[#071330]"
                >
                  {getCategory(skill).label}
                </span>
              ))}
            </div>
          ) : null}

          {person.availability.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {person.availability.map((slot) => (
                <span
                  key={slot}
                  className="inline-flex rounded-md border border-[rgba(7,19,48,0.1)] px-3 py-1 text-[12px] font-medium text-[#64748B]"
                >
                  {AVAIL_LABELS[slot] ?? slot}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            {isYou ? (
              <ButtonLink href="/onboarding/helper" variant="secondary">
                Edit helper profile
              </ButtonLink>
            ) : (
              <ButtonLink href={bookHref}>Request to book</ButtonLink>
            )}
          </div>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="font-display text-[22px] font-bold text-[#071330]">Reviews</h2>
        {reviews.length ? (
          <ul className="mt-4 space-y-3">
            {reviews.map((review) => {
              const from = getPerson(review.fromId)
              return (
                <li
                  key={review.id}
                  className="rounded-lg border border-[rgba(7,19,48,0.08)] bg-white px-4 py-4"
                >
                  <div className="flex items-center gap-2 text-[14px]">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
                    <span className="font-semibold text-[#071330]">{review.rating}/5</span>
                    <span className="text-[#64748B]">from {from?.name ?? 'Neighbor'}</span>
                    <span className="ml-auto text-[12px] text-[#94A3B8]">
                      {relativeTime(review.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 text-[14px] leading-[1.5] text-[#475569]">{review.comment}</p>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="mt-4">
            <EmptyState
              title="No reviews yet"
              body="Completed jobs will show neighbor feedback here."
            />
          </div>
        )}
      </section>

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
