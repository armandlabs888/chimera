'use client'

import Link from 'next/link'
import { Heart, MapPin, Star } from 'lucide-react'
import { useBeam } from '@/context/BeamContext'
import { formatLocation, formatRate } from '../lib/matching'
import { formatCategoryLabel } from '@/lib/taxonomy'
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
  const skills = person.skills.slice(0, 3).map((s) =>
    formatCategoryLabel(s, s === 'other' ? person.otherSkillLabel : null),
  )
  const locationLabel =
    match && authUser ? `${match.distanceMiles.toFixed(1)} mi away` : formatLocation(person)
  const rateLabel = formatRate(person)
  const saved = state.savedHelperIds?.includes(person.id) ?? false
  const ratingLabel = formatPublicRating(person)

  return (
    <div className="group relative flex flex-col rounded-[10px] border border-[#C7D7F0] bg-white p-3.5 transition-[border-color,box-shadow] duration-150 hover:border-[#5EEAD4] hover:shadow-[0_8px_22px_-8px_rgba(13,148,136,0.2)]">
      {authUser ? (
        <button
          type="button"
          aria-label={saved ? 'Remove from favorites' : 'Save helper'}
          className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#334155] transition hover:bg-[#F0F7FF] hover:text-[#1D5CE5]"
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
                <h3 className="truncate text-[15px] font-bold text-[#071330]">{person.name}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12.5px] text-[#334155]">
                  {ratingLabel ? (
                    <span className="inline-flex items-center gap-1 font-bold text-[#071330]">
                      <Star
                        className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                        aria-hidden
                      />
                      {ratingLabel}
                    </span>
                  ) : (
                    <span className="rounded-md bg-[#E0F2FE] px-1.5 py-0.5 text-[11px] font-bold text-[#0369A1]">
                      New
                    </span>
                  )}
                  {person.jobsCompleted > 0 ? (
                    <>
                      <span aria-hidden className="text-[#64748B]">
                        ·
                      </span>
                      <span className="font-semibold">{person.jobsCompleted} tasks</span>
                    </>
                  ) : null}
                </div>
              </div>
              <p className="shrink-0 font-display text-[15px] font-bold tabular-nums leading-tight text-[#071330]">
                {rateLabel}
              </p>
            </div>
          </div>
        </div>

        {!compact ? (
          <>
            {person.bio ? (
              <p className="mt-3 line-clamp-2 text-[13px] leading-[1.45] text-[#334155]">
                {person.bio}
              </p>
            ) : null}
            {skills.length ? (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {skills.map((label) => (
                  <span
                    key={label}
                    className="inline-flex rounded-md border border-[#99F6E4]/80 bg-[#F0FDFA] px-2 py-0.5 text-[11.5px] font-bold text-[#0F766E]"
                  >
                    {label}
                  </span>
                ))}
              </div>
            ) : null}
          </>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-[#D7E3F4] pt-2.5 mt-3">
          <p className="inline-flex min-w-0 items-center gap-1 text-[12px] font-semibold text-[#334155]">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-[#0D9488]" aria-hidden />
            <span className="truncate">{locationLabel}</span>
          </p>
          {person.availableNow ? (
            <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-bold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Available
            </span>
          ) : (
            <span className="truncate text-[12px] font-semibold text-[#475569]">
              {formatAvailability(person.availability)}
            </span>
          )}
        </div>
      </Link>
    </div>
  )
}
