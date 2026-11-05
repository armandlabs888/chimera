import { ArrowRight, MapPin, Star } from 'lucide-react'
import Link from 'next/link'
import { getCategory } from '../data/categories'
import { getNeighborhood } from '../data/neighborhoods'
import { formatMoney } from '../lib/matching'
import type { MatchScore, Person } from '../types'
import { Badge } from './ui'

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
      className="flat-row group flex gap-3 rounded-xl px-2 py-3 transition hover:bg-white/[0.04]"
    >
      <img
        src={person.avatar}
        alt=""
        className="h-16 w-16 shrink-0 rounded-xl object-cover"
        loading="lazy"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="truncate font-display text-lg text-beam-cream">{person.name}</h3>
            <p className="mt-0.5 flex items-center gap-1 text-xs tracking-wide text-beam-muted">
              <MapPin className="h-3.5 w-3.5 text-beam-amber" />
              {neighborhood.shortName}
              {match ? ` · ${match.distanceMiles.toFixed(1)} mi` : null}
            </p>
          </div>
          <div className="flex items-start gap-2 text-right">
            <div>
              <p className="text-sm font-semibold text-beam-amber">{formatMoney(person.hourlyRate)}/hr</p>
              <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-beam-cream-dim">
                <Star className="h-3 w-3 fill-beam-amber text-beam-amber" />
                {person.rating.toFixed(1)}
              </p>
            </div>
            <ArrowRight
              className="mt-1 h-4 w-4 shrink-0 text-beam-muted transition group-hover:translate-x-0.5 group-hover:text-beam-amber"
              aria-hidden
            />
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {person.skills.slice(0, 3).map((skill) => (
            <Badge key={skill}>{getCategory(skill).shortLabel}</Badge>
          ))}
          {match?.availableNow ? <Badge tone="live">Free now</Badge> : null}
        </div>
      </div>
    </Link>
  )
}
