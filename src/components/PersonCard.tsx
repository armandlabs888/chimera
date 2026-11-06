import Link from 'next/link'
import { getCategory } from '../data/categories'
import { getNeighborhood } from '../data/neighborhoods'
import { formatMoney } from '../lib/matching'
import type { MatchScore, Person } from '../types'
import { Avatar } from './ui'

export function PersonCard({
  person,
  match,
}: {
  person: Person
  match?: MatchScore
}) {
  const neighborhood = getNeighborhood(person.neighborhood)
  const skills = person.skills
    .slice(0, 4)
    .map((s) => getCategory(s).shortLabel)
    .join(', ')

  return (
    <Link
      href={`/people/${person.id}`}
      className="group flex gap-4 rounded-[26px] border border-[rgba(7,19,48,0.08)] bg-white p-4 shadow-sm transition hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D5CE5]"
    >
      <Avatar src={person.avatar} name={person.name} size={56} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-[16px] font-bold text-[#071330]">{person.name}</h3>
            <p className="mt-1 text-[13px] text-[#64748B]">
              ★ {person.rating.toFixed(1)} ({person.reviewCount})
              {match ? ` · ${match.distanceMiles.toFixed(1)} mi` : ` · ${neighborhood.shortName}`}
            </p>
          </div>
          <p className="shrink-0 font-display text-[22px] font-bold leading-none tabular-nums text-[#071330]">
            {formatMoney(person.hourlyRate)}
            <span className="text-[13px] font-sans font-medium text-[#64748B]">/hr</span>
          </p>
        </div>
        <p className="mt-2 truncate text-[14px] text-[#64748B]">{skills}</p>
        {match?.availableNow ? (
          <p className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-[#059669]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#059669]" aria-hidden />
            Available now
          </p>
        ) : null}
      </div>
    </Link>
  )
}
