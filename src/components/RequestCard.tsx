import { ArrowRight, Clock3, MapPin } from 'lucide-react'
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
      className="flat-row group block overflow-hidden rounded-2xl transition hover:bg-white/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-beam-amber"
    >
      <div className={`relative overflow-hidden ${compact ? 'h-28' : 'h-36'}`}>
        <img
          src={request.image}
          alt=""
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-beam-base via-beam-base/30 to-transparent" />
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
      <div className="space-y-2 px-1 pb-3 pt-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg leading-snug text-beam-cream">{request.title}</h3>
          <ArrowRight
            className="mt-1 h-4 w-4 shrink-0 text-beam-muted transition group-hover:translate-x-0.5 group-hover:text-beam-amber"
            aria-hidden
          />
        </div>
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
        <p className="text-[11px] tracking-wide text-beam-muted">Posted {relativeTime(request.createdAt)}</p>
      </div>
    </Link>
  )
}
