'use client'

import Image from 'next/image'
import Link from 'next/link'
import { MapPin } from 'lucide-react'
import { useMemo } from 'react'
import { Avatar } from './ui'
import { useBeam } from '@/context/BeamContext'
import { formatLocation, relativeTime } from '../lib/matching'
import { formatPublicRating } from '@/lib/ratingDisplay'
import { listingCoverImage, normalizeListingImages } from '@/lib/listingPhotos'
import { formatCategoryLabel } from '@/lib/taxonomy'
import type { HelpRequest } from '../types'

export function RequestCard({
  request,
  compact = false,
}: {
  request: HelpRequest
  compact?: boolean
}) {
  const { state } = useBeam()
  const categoryLabel = formatCategoryLabel(request.category, request.categoryCustom)
  const location = formatLocation(request)
  const cover = listingCoverImage(
    normalizeListingImages(request.images, request.image),
    request.image,
  )

  const requester = useMemo(
    () => state.people.find((p) => p.id === request.requesterId),
    [state.people, request.requesterId],
  )

  const offerCount = useMemo(() => {
    if (typeof request.publicOfferCount === 'number') return request.publicOfferCount
    return state.offers.filter((o) => o.requestId === request.id && o.status !== 'withdrawn')
      .length
  }, [state.offers, request.id, request.publicOfferCount])

  const requesterFirstName = requester?.name?.split(/\s+/)[0] ?? 'Neighbor'
  const isAsap = request.when === 'asap'
  const timingLabel = isAsap ? 'ASAP' : request.whenLabel
  const isOpenBudget = request.budgetType === 'open' || !request.budget || request.budget <= 0
  const ratingLabel = requester ? formatPublicRating(requester) : null
  const neighborhood = location.split(',')[0]?.trim() || location

  return (
    <Link
      href={`/requests/${request.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-[#E2E8F0] bg-white transition-[border-color,box-shadow] duration-150 hover:border-[#CBD5E1] hover:shadow-[0_6px_18px_-6px_rgba(7,19,48,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D5CE5]"
    >
      <div className="relative aspect-[16/9] max-h-[140px] w-full overflow-hidden bg-[#F1F5F9]">
        {cover ? (
          <Image
            src={cover}
            alt=""
            fill
            sizes="(min-width:1280px) 320px, (min-width:640px) 45vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 bg-[#E8EEF7]" aria-hidden />
        )}
        <span className="absolute left-2.5 top-2.5 inline-flex max-w-[70%] truncate items-center rounded-md bg-white/95 px-2 py-0.5 text-[11px] font-semibold text-[#071330] shadow-xs">
          {categoryLabel}
        </span>
        <span
          className={`absolute right-2.5 top-2.5 inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${
            isAsap
              ? 'border border-[#FDE047]/80 bg-[#FEF08A] text-[#071330]'
              : 'bg-[#071330]/80 text-white'
          }`}
        >
          {timingLabel}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <h3 className="line-clamp-1 text-[14.5px] font-semibold leading-[1.32] tracking-[-0.01em] text-[#071330] group-hover:text-[#1D5CE5]">
          {request.title}
        </h3>
        {!compact ? (
          <p className="mt-1 line-clamp-2 text-[12.5px] leading-[1.45] text-[#64748B]">
            {request.details}
          </p>
        ) : null}

        <div className="mt-2.5 flex items-center gap-1.5 text-[11.5px] font-medium text-[#64748B]">
          <MapPin className="h-3 w-3 shrink-0 text-[#94A3B8]" aria-hidden />
          <span className="min-w-0 truncate">{neighborhood}</span>
          <span aria-hidden>·</span>
          <span className="shrink-0">{relativeTime(request.createdAt)}</span>
          {offerCount > 0 ? (
            <span className="ml-auto inline-flex shrink-0 items-center rounded-md bg-[#EFF6FF] px-1.5 py-0.5 text-[11px] font-semibold text-[#1D5CE5]">
              {offerCount} offer{offerCount === 1 ? '' : 's'}
            </span>
          ) : null}
        </div>

        {request.status !== 'open' ? (
          <p className="mt-2 text-[12px] capitalize text-[#64748B]">{request.status}</p>
        ) : null}

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#F1F5F9] pt-2.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <Avatar src={requester?.avatar} name={requester?.name ?? 'Neighbor'} size={22} />
            <span className="truncate text-[12px] font-medium text-[#334155]">
              {requesterFirstName}
            </span>
            {ratingLabel ? (
              <span className="shrink-0 text-[11.5px] font-medium text-[#64748B]">
                ★ {ratingLabel}
              </span>
            ) : (
              <span className="shrink-0 rounded bg-[#F1F5F9] px-1.5 py-0.5 text-[10.5px] font-medium text-[#64748B]">
                New
              </span>
            )}
          </div>
          <div className="shrink-0">
            {isOpenBudget ? (
              <span className="inline-flex rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-0.5 text-[11.5px] font-semibold text-[#334155]">
                Open to offers
              </span>
            ) : (
              <span className="font-display text-[15px] font-bold tabular-nums text-[#071330]">
                ${Math.round(request.budget)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
