import { ArrowRight, MapPin, Star } from 'lucide-react'
import Link from 'next/link'
import { getCategory } from '../data/categories'
import { getNeighborhood } from '../data/neighborhoods'
import { formatMoney } from '../lib/matching'
import type { MatchScore, Person } from '../types'
import { Avatar, Badge, CategoryIconBadge } from './ui'

export function PersonCard({
  person,
  match,
}: {
  person: Person
  match?: MatchScore
}) {
  const neighborhood = getNeighborhood(person.neighborhood)

  return (
    <Link
      href={`/people/${person.id}`}
      className="elevated elevated-hover group flex gap-3 p-3.5"
    >
      <Avatar src={person.avatar} name={person.name} size={48} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-[16px] font-semibold text-beam-cream">{person.name}</h3>
            <p className="mt-0.5 flex items-center gap-1 type-meta text-beam-muted">
              <MapPin className="h-3.5 w-3.5 text-beam-amber-deep" />
              {neighborhood.shortName}
              {match ? ` · ${match.distanceMiles.toFixed(1)} mi` : null}
            </p>
          </div>
          <div className="flex items-start gap-1.5 text-right">
            <div>
              <span className="price-pill">
                {formatMoney(person.hourlyRate)}
                <span className="font-medium text-beam-muted">/hr</span>
              </span>
              <p className="mt-1 inline-flex items-center gap-1 type-meta text-beam-cream-dim">
                <Star className="h-3 w-3 fill-beam-amber text-beam-amber" />
                <span className="tabular-nums">{person.rating.toFixed(1)}</span>
              </p>
            </div>
            <ArrowRight
              className="mt-1 h-4 w-4 shrink-0 text-beam-muted transition duration-150 group-hover:translate-x-0.5 group-hover:text-beam-amber"
              aria-hidden
            />
          </div>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {person.skills.slice(0, 3).map((skill) => {
            const cat = getCategory(skill)
            return (
              <span
                key={skill}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 type-meta font-semibold"
                style={{ background: cat.tintBg, color: cat.tintFg }}
              >
                <CategoryIconBadge tintBg={cat.tintBg} tintFg={cat.tintFg} size={16}>
                  <span className="text-[9px] font-bold">{cat.shortLabel[0]}</span>
                </CategoryIconBadge>
                {cat.shortLabel}
              </span>
            )
          })}
          {match?.availableNow ? <Badge tone="live">Free now</Badge> : null}
        </div>
      </div>
    </Link>
  )
}
