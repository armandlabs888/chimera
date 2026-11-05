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
      className="flat-row group flex flex-col overflow-hidden rounded-[12px] border border-beam-line bg-beam-base transition hover:bg-beam-ink"
    >
      <div className={`relative overflow-hidden ${compact ? 'h-28' : 'h-36'}`}>
        <img
          src={request.image}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
        <div className="absolute left-2.5 top-2.5 flex gap-1.5">
          <Badge tone="amber">{category.shortLabel}</Badge>
          {request.status === 'open' ? (
            <Badge tone="live">
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-emerald-500" />
              Open
            </Badge>
          ) : (
            <Badge>{request.status}</Badge>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="type-intro font-semibold text-beam-cream">{request.title}</h3>
          <ArrowRight
            className="mt-1 h-4 w-4 shrink-0 text-beam-muted transition duration-150 group-hover:translate-x-0.5 group-hover:text-beam-amber"
            aria-hidden
          />
        </div>
        {!compact ? (
          <p className="line-clamp-2 type-sec text-beam-muted">{request.details}</p>
        ) : null}
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 type-meta text-beam-cream-dim">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-beam-amber" />
            {neighborhood.shortName}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5 text-beam-amber" />
            {request.whenLabel}
          </span>
          <span className="ml-auto text-[15px] font-semibold text-beam-cream">
            {formatMoney(request.budget)}
          </span>
        </div>
        <p className="type-meta text-beam-muted">Posted {relativeTime(request.createdAt)}</p>
      </div>
    </Link>
  )
}
