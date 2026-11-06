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
      className="group block overflow-hidden rounded-2xl bg-[#141518] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E2B66A]"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image
          src={request.image}
          alt=""
          fill
          sizes="(min-width:1024px) 360px, 50vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <div className="p-5">
        <p className="text-[13px] font-medium tracking-[0.01em] text-[#D6B06C]">{category.label}</p>
        <h3 className="mt-1.5 line-clamp-2 text-[17px] font-medium leading-[1.35] text-[#F6F3EE]">
          {request.title}
        </h3>
        {!compact ? (
          <p className="mt-2 line-clamp-2 text-[14px] leading-[1.5] text-[#B7B2AA]">{request.details}</p>
        ) : null}
        <div className="mt-4 flex items-end justify-between gap-3">
          <p className="text-[13px] text-[#85817A]">
            {neighborhood.shortName} · {request.whenLabel} · {relativeTime(request.createdAt)}
          </p>
          <p
            className="font-serif text-[24px] leading-none tabular-nums text-[#F6F3EE]"
            style={{ fontVariationSettings: "'opsz' 36" }}
          >
            {formatMoney(request.budget)}
          </p>
        </div>
        {request.status !== 'open' ? (
          <p className="mt-3 text-[13px] capitalize text-[#85817A]">{request.status}</p>
        ) : null}
      </div>
    </Link>
  )
}
