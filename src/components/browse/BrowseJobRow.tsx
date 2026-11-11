'use client'

import type { HelpRequest } from '@/types'

export function BrowseJobRow({
  request,
  title,
  categoryLabel,
  milesLabel,
  timingLabel,
  asap,
  excerpt,
  priceLabel,
  priceCaption,
  imageSrc,
  selected,
  onOpen,
}: {
  request: HelpRequest
  title: string
  categoryLabel: string
  milesLabel: string | null
  timingLabel: string
  asap: boolean
  excerpt: string
  priceLabel: string
  priceCaption: string
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
        className={`relative grid w-[calc(100%+20px)] -mx-2.5 grid-cols-[64px_minmax(0,1fr)] items-center gap-3.5 rounded-xl px-2.5 py-3.5 text-left transition-colors sm:-mx-3 sm:w-[calc(100%+24px)] sm:grid-cols-[76px_minmax(0,1fr)_auto] sm:gap-[18px] sm:px-3 sm:py-4 ${
          selected ? 'bg-[#F4F8FD]' : 'hover:bg-[#F4F8FD]'
        }`}
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt=""
            className="h-16 w-16 rounded-[9px] object-cover sm:h-[76px] sm:w-[76px] sm:rounded-[10px]"
          />
        ) : (
          <span
            className="grid h-16 w-16 place-items-center rounded-[9px] bg-[#E9EEF5] text-[13px] font-semibold text-[#3D4A5F] sm:h-[76px] sm:w-[76px] sm:rounded-[10px]"
            aria-hidden
          >
            {categoryLabel.slice(0, 1)}
          </span>
        )}
        <span className="min-w-0">
          <span className="block pr-16 text-[15.5px] font-semibold leading-snug tracking-[-0.012em] text-[#071330] sm:pr-0 sm:text-[16.5px] group-hover:text-[#0B2A6B]">
            {title}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 text-[13.5px] text-[#273449] sm:mt-[5px] sm:text-[14px]">
            <span>{categoryLabel}</span>
            {milesLabel ? (
              <>
                <Dot />
                <span>{milesLabel}</span>
              </>
            ) : null}
            {timingLabel ? (
              <>
                <Dot />
                {asap ? (
                  <span className="inline-flex items-center gap-[5px] font-semibold text-[#1446B8]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#1D5CE5]" aria-hidden />
                    {timingLabel}
                  </span>
                ) : (
                  <span>{timingLabel}</span>
                )}
              </>
            ) : null}
          </span>
          {excerpt ? (
            <span className="mt-1 hidden max-w-[470px] truncate text-[14px] text-[#3D4A5F] sm:block">
              {excerpt}
            </span>
          ) : null}
        </span>
        <span className="absolute right-2.5 top-3.5 text-right sm:static sm:self-start sm:pt-0.5">
          <span className="block text-[15.5px] font-bold tabular-nums tracking-[-0.01em] text-[#071330] sm:text-[17px]">
            {priceLabel}
          </span>
          <span className="hidden text-[12.5px] font-medium text-[#3D4A5F] sm:block">{priceCaption}</span>
        </span>
      </button>
    </li>
  )
}

function Dot() {
  return <span className="h-[3px] w-[3px] rounded-full bg-[#7C889C]" aria-hidden />
}
