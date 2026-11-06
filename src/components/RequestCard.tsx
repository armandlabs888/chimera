import { ArrowRight, Clock3, MapPin, Package } from 'lucide-react'
import Link from 'next/link'
import { getCategory } from '../data/categories'
import { getNeighborhood } from '../data/neighborhoods'
import { formatMoney, relativeTime } from '../lib/matching'
import type { HelpRequest } from '../types'
import { Badge, CategoryIconBadge } from './ui'

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
      className="elevated elevated-hover group flex flex-col overflow-hidden"
    >
      <div className={`relative overflow-hidden ${compact ? 'h-28' : 'h-36'}`}>
        <img
          src={request.image}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
        <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5">
          <CategoryIconBadge tintBg={category.tintBg} tintFg={category.tintFg} size={28}>
            <Package className="h-3.5 w-3.5" strokeWidth={2} />
          </CategoryIconBadge>
          <Badge tone="outline">{category.shortLabel}</Badge>
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
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-beam-surface-2 px-2 py-0.5 type-meta text-beam-cream-dim shadow-[0_0_0_1px_rgba(15,23,42,0.05)]">
            <MapPin className="h-3 w-3 text-beam-amber-deep" />
            {neighborhood.shortName}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-beam-surface-2 px-2 py-0.5 type-meta text-beam-cream-dim shadow-[0_0_0_1px_rgba(15,23,42,0.05)]">
            <Clock3 className="h-3 w-3 text-beam-amber-deep" />
            {request.whenLabel}
          </span>
          <span className="price-pill ml-auto">{formatMoney(request.budget)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-black/[0.05] pt-2">
          <p className="type-meta text-beam-muted">Posted {relativeTime(request.createdAt)}</p>
          <span className="type-meta font-semibold text-beam-amber-deep opacity-0 transition group-hover:opacity-100">
            View
          </span>
        </div>
      </div>
    </Link>
  )
}
