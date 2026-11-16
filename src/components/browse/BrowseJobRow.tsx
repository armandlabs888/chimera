'use client'

import { Clock, MapPin } from 'lucide-react'
import type { HelpRequest } from '@/types'
import { JobViewCount, JobViewCountMetaSep } from '@/components/jobs/JobViewCount'
import { NeedsHelpNowLabel } from '@/components/urgent/NeedsHelpNowLabel'
import { BrowseCategoryThumb } from './BrowseCategoryThumb'

export function BrowseJobRow({
  request,
  title,
  categoryLabel,
  areaLabel,
  distanceLabel,
  timingLabel,
  asap,
  excerpt,
  priceLabel,
  priceCaption,
  openBudget,
  imageSrc,
  selected,
  onOpen,
}: {
  request: HelpRequest
  title: string
  categoryLabel: string
  areaLabel: string
  /** e.g. "0.4 mi away" — shown in desktop meta and under time on mobile. */
  distanceLabel: string | null
  timingLabel: string
  asap: boolean
  excerpt: string
  priceLabel: string
  priceCaption: string
  openBudget: boolean
  imageSrc: string
  selected: boolean
  onOpen: (id: string) => void
}) {
  return (
    <li data-selected={selected ? 'true' : 'false'}>
      <button
        type="button"
        data-testid="browse-job-row"
        data-job-id={request.id}
        aria-pressed={selected}
        onClick={() => onOpen(request.id)}
        className={`browse-hc-job-row ${selected ? 'is-selected' : ''}`}
      >
        {imageSrc ? (
          // Listing photos may be arbitrary HTTPS hosts.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageSrc} alt="" className="browse-hc-thumb" />
        ) : (
          <span className="browse-hc-thumb overflow-hidden">
            <BrowseCategoryThumb
              categoryId={request.category}
              className="!h-full !w-full !rounded-[10px]"
            />
          </span>
        )}
        <span className="browse-hc-row-main">
          <span className="browse-hc-row-title">
            {title}
            {request.isUrgent ? (
              <NeedsHelpNowLabel className="ml-2 align-middle" />
            ) : null}
          </span>
          <span className="browse-hc-row-meta">
            <span className="cat">{categoryLabel}</span>
            {areaLabel ? (
              <>
                <span className="browse-hc-dot" aria-hidden>
                  ·
                </span>
                <span>{areaLabel}</span>
              </>
            ) : null}
            {distanceLabel ? (
              <>
                <span className="browse-hc-dot browse-hc-distance-desk" aria-hidden>
                  ·
                </span>
                <span className="browse-hc-distance-desk">{distanceLabel}</span>
              </>
            ) : null}
            <span className="browse-hc-views-desk">
              <JobViewCountMetaSep count={request.viewCount} testId="browse-job-views" />
            </span>
          </span>
          {excerpt ? <span className="browse-hc-row-desc">{excerpt}</span> : null}
          {timingLabel || distanceLabel || (request.viewCount ?? 0) > 0 ? (
            <span className="browse-hc-row-foot">
              {timingLabel ? (
                <span className={`browse-hc-when ${asap ? 'browse-hc-asap' : ''}`}>
                  <Clock className="h-[13px] w-[13px]" strokeWidth={2} aria-hidden />
                  {asap ? 'ASAP' : timingLabel}
                </span>
              ) : null}
              {distanceLabel ? (
                <span className="browse-hc-distance-mob">
                  <MapPin className="h-[13px] w-[13px]" strokeWidth={2} aria-hidden />
                  {distanceLabel}
                </span>
              ) : null}
              <span className="browse-hc-views-mob">
                <JobViewCount count={request.viewCount} testId="browse-job-views-mob" />
              </span>
            </span>
          ) : null}
        </span>
        <span className="browse-hc-row-side">
          <span className="browse-hc-price-block">
            <span className={`browse-hc-price ${openBudget ? 'browse-hc-price-open' : ''}`}>
              {priceLabel}
            </span>
            <span className="browse-hc-pay-label">{priceCaption}</span>
          </span>
        </span>
      </button>
    </li>
  )
}
