'use client'

import Link from 'next/link'
import { Avatar } from '@/components/ui'
import type { Person } from '@/types'

export function BrowseHelperRow({
  person,
  skillLabel,
  milesLabel,
  availabilityLabel,
  rateLabel,
  ratingLabel,
}: {
  person: Person
  skillLabel: string
  milesLabel: string | null
  availabilityLabel: string
  rateLabel: string
  ratingLabel: string | null
}) {
  return (
    <li>
      <Link
        href={`/people/${person.id}`}
        data-testid="browse-helper-row"
        className="grid w-[calc(100%+20px)] -mx-2.5 grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3.5 rounded-xl px-2.5 py-3.5 transition-colors hover:bg-[#F4F8FD] sm:-mx-3 sm:w-[calc(100%+24px)] sm:grid-cols-[76px_minmax(0,1fr)_auto] sm:px-3 sm:py-4"
      >
        <Avatar src={person.avatar} name={person.name} size={64} />
        <span className="min-w-0">
          <span className="block truncate text-[15.5px] font-semibold tracking-[-0.012em] text-[#071330] sm:text-[16.5px]">
            {person.name}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 text-[13.5px] text-[#273449] sm:text-[14px]">
            <span className="truncate">{skillLabel}</span>
            {milesLabel ? (
              <>
                <span className="h-[3px] w-[3px] rounded-full bg-[#7C889C]" aria-hidden />
                <span>{milesLabel}</span>
              </>
            ) : null}
            {availabilityLabel ? (
              <>
                <span className="h-[3px] w-[3px] rounded-full bg-[#7C889C]" aria-hidden />
                <span>{availabilityLabel}</span>
              </>
            ) : null}
          </span>
          {ratingLabel ? (
            <span className="mt-1 hidden text-[14px] text-[#3D4A5F] sm:block">★ {ratingLabel}</span>
          ) : null}
        </span>
        <span className="text-right">
          <span className="block text-[15.5px] font-bold tabular-nums text-[#071330] sm:text-[17px]">
            {rateLabel}
          </span>
          <span className="hidden text-[12.5px] font-medium text-[#3D4A5F] sm:block">Rate</span>
        </span>
      </Link>
    </li>
  )
}
