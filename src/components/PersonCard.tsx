'use client'

import Link from 'next/link'
import { Heart, MapPin, Star } from 'lucide-react'
import { useBeam } from '@/context/BeamContext'
import { getCategory } from '../data/categories'
import { formatLocation, formatRate } from '../lib/matching'
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
  const { authUser, state, toggleSavedHelper } = useBeam()
  const skills = person.skills.slice(0, 3).map((s) => getCategory(s).shortLabel)
  const locationLabel =
    match && authUser ? `${match.distanceMiles.toFixed(1)} mi away` : formatLocation(person)
  const rateLabel = formatRate(person)
  const saved = state.savedHelperIds?.includes(person.id) ?? false

  return (
    <div className="group relative flex h-full flex-col rounded-xl border border-[rgba(7,19,48,0.08)] bg-white p-5 shadow-[0_10px_28px_-12px_rgba(12,42,102,0.08)] transition duration-200 hover:-translate-y-0.5 hover:border-[rgba(29,92,229,0.28)] hover:shadow-[0_18px_38px_-14px_rgba(12,42,102,0.15)]">
      {authUser ? (
        <button
          type="button"
          aria-label={saved ? 'Remove from favorites' : 'Save helper'}
          className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(7,19,48,0.08)] bg-white text-[#64748B] transition hover:text-[#1D5CE5]"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            void toggleSavedHelper(person.id)
          }}
        >
          <Heart
            className={`h-4 w-4 ${saved ? 'fill-[#1D5CE5] text-[#1D5CE5]' : ''}`}
            strokeWidth={1.75}
          />
        </button>
      ) : null}

      <Link
        href={`/people/${person.id}`}
        className="flex flex-1 flex-col focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D5CE5]"
      >
        <div className="flex items-start gap-3">
          <Avatar src={person.avatar} name={person.name} size={56} />
          <div className="min-w-0 flex-1 pr-8">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-[17px] font-bold text-[#071330]">{person.name}</h3>
                  {person.availableNow ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Available now
                    </span>
                  ) : null}
                </div>
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
              <p className="shrink-0 text-right font-display text-[18px] font-bold leading-tight text-[#071330]">
                {rateLabel}
              </p>
            </div>
          </div>
        </div>

        {!compact ? (
          <>
            {person.bio ? (
              <p className="mt-4 line-clamp-2 text-[14px] leading-[1.5] text-[#475569]">
                {person.bio}
              </p>
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

        <p className="mt-auto pt-4 text-[12px] font-medium text-[#64748B]">
          {formatAvailability(person.availability)}
        </p>
      </Link>
    </div>
  )
}
