'use client'

import { Home, MapPin, Settings, Star, Wrench } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { Avatar } from '@/components/ui'
import { formatLocation } from '@/lib/location'
import { formatCategoryLabel } from '@/lib/taxonomy'
import { formatRate } from '@/lib/matching'
import type { Person } from '@/types'

const AVAIL_LABELS: Record<string, string> = {
  mornings: 'Mornings',
  afternoons: 'Afternoons',
  evenings: 'Evenings',
  weekends: 'Weekends',
}

export function HelperProfileHero({
  person,
  showHelperMeta = true,
  accountType = null,
  nameSuffix = '',
  trailingAction,
  actions,
  showBio = true,
}: {
  person: Person
  /** Rate, skills, availability chips, rating/jobs line. */
  showHelperMeta?: boolean
  accountType?: 'helper' | 'neighbor' | null
  nameSuffix?: string
  trailingAction?: ReactNode
  actions?: ReactNode
  showBio?: boolean
}) {
  const locationLabel = formatLocation(person)
  const radius = person.serviceRadiusMiles ?? 5

  return (
    <div
      className="overflow-hidden rounded-lg border border-[rgba(7,19,48,0.08)] bg-white shadow-[0_10px_28px_-12px_rgba(12,42,102,0.08)]"
      data-testid="helper-profile-hero"
    >
      <div className="h-24 bg-gradient-to-br from-[#F5F9FF] via-[#F4F8FD] to-[#E3E8EF] sm:h-28" />
      <div className="relative px-5 pb-6 pt-0 sm:px-7">
        <div className="-mt-12 flex flex-wrap items-end justify-between gap-3">
          <div className="rounded-lg ring-4 ring-white">
            <Avatar src={person.avatar} name={person.name} size={88} />
          </div>
          {trailingAction}
        </div>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-[clamp(1.6rem,3vw,2rem)] font-bold tracking-[-0.02em] text-[#071330]">
                {person.name}
                {nameSuffix}
              </h1>
              {accountType === 'helper' ? (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#1D5CE5] px-2.5 py-1 text-[12px] font-semibold leading-tight tracking-[-0.01em] text-white"
                  data-testid="account-type-badge"
                >
                  <Wrench className="h-3 w-3 shrink-0" strokeWidth={2.25} aria-hidden />
                  Helper account
                </span>
              ) : null}
              {accountType === 'neighbor' ? (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#D7E0EC] bg-[#F4F8FD] px-2.5 py-1 text-[12px] font-semibold leading-tight tracking-[-0.01em] text-[#1649BD]"
                  data-testid="account-type-badge"
                >
                  <Home className="h-3 w-3 shrink-0" strokeWidth={2.25} aria-hidden />
                  Neighbor account
                </span>
              ) : null}
              {showHelperMeta && person.availableNow ? (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-[#F4F8FD] px-2.5 py-1 text-[12px] font-semibold text-[#1D5CE5]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#1D5CE5]" />
                  Available now
                </span>
              ) : null}
            </div>
            <p className="mt-2 inline-flex items-center gap-1.5 text-[14px] text-[#64748B]">
              <MapPin className="h-4 w-4 shrink-0 text-[#94A3B8]" aria-hidden />
              <span>
                {locationLabel}
                {showHelperMeta ? (
                  <>
                    <span className="text-[#94A3B8]"> · </span>
                    Within {radius} mi
                  </>
                ) : null}
              </span>
            </p>
            {showHelperMeta ? (
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
                  <span className="rounded bg-[#F4F8FD] px-1.5 py-0.5 text-[12px] font-medium text-[#64748B]">
                    New
                  </span>
                )}
                <span className="text-[#CBD5E1]" aria-hidden>
                  ·
                </span>
                <span>{person.jobsCompleted} jobs completed</span>
              </p>
            ) : null}
          </div>
          {showHelperMeta ? (
            <p className="shrink-0 font-display text-[22px] font-bold text-[#071330]">
              {formatRate(person)}
            </p>
          ) : null}
        </div>

        {showBio && person.bio ? (
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.55] text-[#475569]">{person.bio}</p>
        ) : null}

        {showHelperMeta && person.skills.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {person.skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex rounded-md bg-[#F4F8FD] px-3 py-1.5 text-[12.5px] font-semibold text-[#071330]"
              >
                {formatCategoryLabel(skill, skill === 'other' ? person.otherSkillLabel : null)}
              </span>
            ))}
          </div>
        ) : null}

        {showHelperMeta && person.availability.length ? (
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

        {actions ? <div className="mt-5 flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  )
}

export function HelperProfileSettingsButton({ href = '/settings' }: { href?: string }) {
  return (
    <Link
      href={href}
      aria-label="Settings"
      data-testid="you-hero-settings"
      className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[rgba(7,19,48,0.1)] bg-white text-[#64748B] transition hover:text-[#1D5CE5]"
    >
      <Settings className="h-5 w-5" strokeWidth={1.75} aria-hidden />
    </Link>
  )
}
