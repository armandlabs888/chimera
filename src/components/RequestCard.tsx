'use client'

import Image from 'next/image'
import Link from 'next/link'
import { MapPin } from 'lucide-react'
import { useMemo } from 'react'
import { Avatar } from './ui'
import { useBeam } from '@/context/BeamContext'
import { getCategory } from '../data/categories'
import { getNeighborhood } from '../data/neighborhoods'
import { formatMoney, relativeTime } from '../lib/matching'
import type { HelpRequest } from '../types'
import { CATEGORY_ICONS } from '@/lib/categoryIcons'

export function RequestCard({
  request,
  compact = false,
}: {
  request: HelpRequest
  compact?: boolean
}) {
  const { state } = useBeam()
  const category = getCategory(request.category)
  const neighborhood = getNeighborhood(request.neighborhood)
  const CategoryIcon = CATEGORY_ICONS[request.category]

  const requester = useMemo(
    () => state.people.find((p) => p.id === request.requesterId),
    [state.people, request.requesterId],
  )

  const offerCount = useMemo(
    () => state.offers.filter((o) => o.requestId === request.id && o.status !== 'withdrawn').length,
    [state.offers, request.id],
  )

  const requesterFirstName = requester?.name?.split(/\s+/)[0] ?? 'Neighbor'
  const isAsap = request.when === 'asap'
  const timingLabel = isAsap ? 'ASAP' : request.whenLabel

  return (
    <Link
      href={`/requests/${request.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-[26px] border border-[rgba(7,19,48,0.08)] bg-white shadow-[0_10px_28px_-12px_rgba(12,42,102,0.08)] transition duration-200 hover:-translate-y-0.5 hover:border-[rgba(29,92,229,0.28)] hover:shadow-[0_18px_38px_-14px_rgba(12,42,102,0.15)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D5CE5]"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image
          src={request.image}
          alt=""
          fill
          sizes="(min-width:1024px) 360px, 50vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <span
          className={`absolute right-3 top-3 inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-semibold tracking-wide ${
            isAsap
              ? 'border border-[rgba(7,19,48,0.12)] bg-[#FFF8D6] text-[#071330]'
              : 'bg-white/92 text-[#071330] backdrop-blur-sm'
          }`}
        >
          {timingLabel}
        </span>
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[12.5px] font-semibold text-[#071330] shadow-sm backdrop-blur-sm">
          <CategoryIcon className="h-3.5 w-3.5 text-[#1D5CE5]" strokeWidth={2} aria-hidden />
          {category.shortLabel}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 text-[17px] font-bold leading-[1.35] text-[#071330]">
          {request.title}
        </h3>
        {!compact ? (
          <p className="mt-2 line-clamp-2 text-[14px] leading-[1.5] text-[#475569]">{request.details}</p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13px] text-[#64748B]">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-[#94A3B8]" aria-hidden />
            {neighborhood.shortName}
          </span>
          <span aria-hidden>·</span>
          <span>{relativeTime(request.createdAt)}</span>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-semibold ${
              offerCount > 0
                ? 'bg-[#EEF4FF] text-[#1D5CE5]'
                : 'bg-[#F4F8FD] text-[#64748B]'
            }`}
          >
            {offerCount > 0
              ? `${offerCount} offer${offerCount === 1 ? '' : 's'}`
              : 'Open for offers'}
          </span>
        </div>

        {request.status !== 'open' ? (
          <p className="mt-2 text-[13px] capitalize text-[#64748B]">{request.status}</p>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-[rgba(7,19,48,0.07)] pt-4">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar src={requester?.avatar} name={requester?.name ?? 'Neighbor'} size={26} />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-[#071330]">{requesterFirstName}</p>
              <p className="truncate text-[11.5px] text-[#64748B]">
                {requester ? `★ ${requester.rating.toFixed(1)}` : 'Neighbor'}
              </p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
              Budget
            </p>
            <p className="font-display text-[24px] font-bold leading-none tabular-nums text-[#071330]">
              {formatMoney(request.budget)}
            </p>
          </div>
        </div>
      </div>
    </Link>
  )
}
