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
      className="group flex gap-4 rounded-2xl bg-[#141518] p-4 transition hover:bg-[#1B1C20] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E2B66A]"
    >
      <Avatar src={person.avatar} name={person.name} size={56} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-[16px] font-medium text-[#F6F3EE]">{person.name}</h3>
            <p className="mt-1 text-[13px] text-[#85817A]">
              ★ {person.rating.toFixed(1)} ({person.reviewCount})
              {match ? ` · ${match.distanceMiles.toFixed(1)} mi` : ` · ${neighborhood.shortName}`}
            </p>
          </div>
          <p
            className="shrink-0 font-serif text-[22px] leading-none tabular-nums text-[#F6F3EE]"
            style={{ fontVariationSettings: "'opsz' 36" }}
          >
            {formatMoney(person.hourlyRate)}
            <span className="text-[13px] font-sans text-[#85817A]">/hr</span>
          </p>
        </div>
        <p className="mt-2 truncate text-[14px] text-[#B7B2AA]">{skills}</p>
        {match?.availableNow ? (
          <p className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-[#5FD08C]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#5FD08C]" aria-hidden />
            Available now
          </p>
        ) : null}
      </div>
    </Link>
  )
}
