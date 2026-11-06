'use client'

import Link from 'next/link'
import { MapPin, Star } from 'lucide-react'
import { getCategory } from '../data/categories'
import { getNeighborhood } from '../data/neighborhoods'
import { formatMoney } from '../lib/matching'
import type { AvailabilitySlot, MatchScore, Person } from '../types'
import { Avatar } from './ui'

const SLOT_LABELS: Record<AvailabilitySlot, string> = {
  mornings: 'Mornings',
  afternoons: 'Afternoons',
  evenings: 'Evenings',
  weekends: 'Weekends',
}

function formatAvailability(slots: AvailabilitySlot[]): string {
  if (!slots.length) return 'Flexible schedule'
  return slots
    .slice(0, 2)
    .map((s) => SLOT_LABELS[s])
    .join(' · ')
}

export function PersonCard({
  person,
  match,
  compact = false,
}: {
  person: Person
  match?: MatchScore
  compact?: boolean
}) {
  const neighborhood = getNeighborhood(person.neighborhood)
  const skills = person.skills.slice(0, 3).map((s) => getCategory(s).shortLabel)
  const locationLabel = match
    ? `${match.distanceMiles.toFixed(1)} mi away`
    : neighborhood.shortName

  return (
    <Link
      href={`/people/${person.id}`}
      className="group flex h-full flex-col rounded-[26px] border border-[rgba(7,19,48,0.08)] bg-white p-5 shadow-[0_10px_28px_-12px_rgba(12,42,102,0.08)] transition duration-200 hover:-translate-y-0.5 hover:border-[rgba(29,92,229,0.28)] hover:shadow-[0_18px_38px_-14px_rgba(12,42,102,0.15)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D5CE5]"
    >
      <div className="flex items-start gap-3">
        <Avatar src={person.avatar} name={person.name} size={56} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-[17px] font-bold text-[#071330]">{person.name}</h3>
              <p className="mt-1 inline-flex items-center gap-1 text-[13px] text-[#64748B]">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-[#94A3B8]" aria-hidden />
                <span className="truncate">{locationLabel}</span>
              </p>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] text-[#475569]">
                <span className="inline-flex items-center gap-1 font-semibold text-[#071330]">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
                  {person.rating.toFixed(1)}
                </span>
                <span className="text-[#94A3B8]">({person.reviewCount})</span>
                <span aria-hidden className="text-[#CBD5E1]">
                  ·
                </span>
                <span>{person.jobsCompleted} tasks</span>
              </p>
            </div>
            <p className="shrink-0 text-right font-display text-[22px] font-bold leading-none tabular-nums text-[#071330]">
              {formatMoney(person.hourlyRate)}
              <span className="block pt-0.5 font-sans text-[12px] font-medium text-[#64748B]">
                /hr
              </span>
            </p>
          </div>
        </div>
      </div>

      {!compact ? (
        <>
          {person.bio ? (
            <p className="mt-4 line-clamp-2 text-[14px] leading-[1.5] text-[#475569]">{person.bio}</p>
          ) : null}
          {skills.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {skills.map((label) => (
                <span
                  key={label}
                  className="inline-flex rounded-full bg-[#F4F8FD] px-2.5 py-1 text-[12px] font-semibold text-[#071330]"
                >
                  {label}
                </span>
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-[rgba(7,19,48,0.07)] pt-4">
        {match?.availableNow ? (
          <p className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#059669]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#059669]" aria-hidden />
            Available now
          </p>
        ) : (
          <p className="truncate text-[13px] text-[#64748B]">
            {formatAvailability(person.availability)}
          </p>
        )}
        <span className="shrink-0 text-[13px] font-semibold text-[#1D5CE5] transition group-hover:translate-x-0.5">
          View profile →
        </span>
      </div>
    </Link>
  )
}
