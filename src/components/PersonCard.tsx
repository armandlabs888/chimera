'use client'

import Link from 'next/link'
import { Heart, MapPin, Star } from 'lucide-react'
import { useBeam } from '@/context/BeamContext'
import { getCategory } from '../data/categories'
import { formatLocation, formatRate } from '../lib/matching'
import { formatPublicRating } from '@/lib/ratingDisplay'
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
  const ratingLabel = formatPublicRating(person)

  return (
    <div className="group relative flex flex-col rounded-xl border border-[#E2E8F0] bg-white p-3.5 transition-[border-color,box-shadow] duration-150 hover:border-[#CBD5E1] hover:shadow-[0_6px_18px_-6px_rgba(7,19,48,0.08)]">
      {authUser ? (
        <button
          type="button"
          aria-label={saved ? 'Remove from favorites' : 'Save helper'}
          className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] transition hover:bg-[#F8FAFC] hover:text-[#1D5CE5]"
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
          <Avatar src={person.avatar} name={person.name} size={40} />
          <div className="min-w-0 flex-1 pr-7">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-[14.5px] font-semibold text-[#071330]">
                  {person.name}
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-[#64748B]">
                  {ratingLabel ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-[#071330]">
                      <Star
                        className="h-3 w-3 fill-amber-400 text-amber-400"
                        aria-hidden
                      />
                      {ratingLabel}
                    </span>
                  ) : (
                    <span className="rounded bg-[#F1F5F9] px-1.5 py-0.5 text-[10.5px] font-medium text-[#64748B]">
                      New
                    </span>
                  )}
                  {person.jobsCompleted > 0 ? (
                    <>
                      <span aria-hidden className="text-[#CBD5E1]">
                        ·
                      </span>
                      <span>{person.jobsCompleted} tasks</span>
                    </>
                  ) : null}
                </div>
              </div>
              <p className="shrink-0 font-display text-[14.5px] font-bold tabular-nums leading-tight text-[#071330]">
                {rateLabel}
              </p>
            </div>
          </div>
        </div>

        {!compact ? (
          <>
            {person.bio ? (
              <p className="mt-3 line-clamp-2 text-[12.5px] leading-[1.45] text-[#64748B]">
                {person.bio}
              </p>
            ) : null}
            {skills.length ? (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {skills.map((label) => (
                  <span
                    key={label}
                    className="inline-flex rounded-md bg-[#F4F8FD] px-2 py-0.5 text-[11px] font-semibold text-[#071330]"
                  >
                    {label}
                  </span>
                ))}
              </div>
            ) : null}
          </>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-[#F1F5F9] pt-2.5 mt-3">
          <p className="inline-flex min-w-0 items-center gap-1 text-[11.5px] font-medium text-[#64748B]">
            <MapPin className="h-3 w-3 shrink-0 text-[#94A3B8]" aria-hidden />
            <span className="truncate">{locationLabel}</span>
          </p>
          {person.availableNow ? (
            <span className="inline-flex shrink-0 items-center gap-1 text-[11.5px] font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Available
            </span>
          ) : (
            <span className="truncate text-[11.5px] font-medium text-[#94A3B8]">
              {formatAvailability(person.availability)}
            </span>
          )}
        </div>
      </Link>
    </div>
  )
}
