import Image from 'next/image'
import Link from 'next/link'
import { getCategory } from '../data/categories'
import { getNeighborhood } from '../data/neighborhoods'
import { formatMoney, relativeTime } from '../lib/matching'
import type { HelpRequest } from '../types'

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
      className="group block overflow-hidden rounded-[26px] border border-[rgba(7,19,48,0.08)] bg-white shadow-sm transition hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D5CE5]"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image
          src={request.image}
          alt=""
          fill
          sizes="(min-width:1024px) 360px, 50vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <span className="absolute bottom-3 left-3 rounded-full bg-white px-3 py-1.5 text-[12.5px] font-semibold text-[#071330] shadow-sm">
          {category.shortLabel}
        </span>
      </div>
      <div className="p-5">
        <h3 className="line-clamp-2 text-[17px] font-bold leading-[1.35] text-[#071330]">
          {request.title}
        </h3>
        {!compact ? (
          <p className="mt-2 line-clamp-2 text-[14px] leading-[1.5] text-[#64748B]">{request.details}</p>
        ) : null}
        <div className="mt-4 flex items-end justify-between gap-3">
          <p className="text-[13px] text-[#64748B]">
            {neighborhood.shortName} · {request.whenLabel} · {relativeTime(request.createdAt)}
          </p>
          <p className="font-display text-[24px] font-bold leading-none tabular-nums text-[#071330]">
            {formatMoney(request.budget)}
          </p>
        </div>
        {request.status !== 'open' ? (
          <p className="mt-3 text-[13px] capitalize text-[#64748B]">{request.status}</p>
        ) : null}
      </div>
    </Link>
  )
}
