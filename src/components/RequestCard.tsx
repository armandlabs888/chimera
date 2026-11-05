import { Clock3, MapPin } from 'lucide-react'
import Link from 'next/link'
import { getCategory } from '../data/categories'
import { getNeighborhood } from '../data/neighborhoods'
import { formatMoney, relativeTime } from '../lib/matching'
import type { HelpRequest } from '../types'
import { Badge } from './ui'

export function RequestCard({
  request,
  compact = false,
}: {
  request: HelpRequest
  compact?: boolean
}) {
  const category = getCategory(request.category)
  const neighborhood = getNeighborhood(request.neighborhood)

  return (
    <Link
      href={`/requests/${request.id}`}
      className="group block overflow-hidden rounded-2xl border border-beam-line/80 bg-beam-raised transition hover:border-beam-amber/40 focus-visible:border-beam-amber"
    >
      <div className={`relative overflow-hidden ${compact ? 'h-28' : 'h-40'}`}>
        <img
          src={request.image}
          alt=""
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-beam-raised via-beam-raised/20 to-transparent" />
        <div className="absolute left-3 top-3 flex gap-2">
          <Badge tone="amber">{category.shortLabel}</Badge>
          {request.status === 'open' ? (
            <Badge tone="live">
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-emerald-300" />
              Open
            </Badge>
          ) : (
            <Badge>{request.status}</Badge>
          )}
        </div>
      </div>
      <div className="space-y-2 px-4 pb-4 pt-3">
        <h3 className="font-display text-lg leading-snug text-beam-cream">{request.title}</h3>
        {!compact ? (
          <p className="line-clamp-2 text-sm text-beam-muted">{request.details}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-beam-cream-dim">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-beam-amber" />
            {neighborhood.shortName}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5 text-beam-amber" />
            {request.whenLabel}
          </span>
          <span className="ml-auto font-semibold text-beam-amber">{formatMoney(request.budget)}</span>
        </div>
        <p className="text-[11px] text-beam-muted">Posted {relativeTime(request.createdAt)}</p>
      </div>
    </Link>
  )
}
