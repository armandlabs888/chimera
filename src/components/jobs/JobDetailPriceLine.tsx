import {
  formatMoney,
  hasListedPrice,
  requestAcceptsOffers,
} from '@/lib/matching'
import type { HelpRequest } from '@/types'

/**
 * Job detail price under the title: amount at 20/700, with an "Open to offers"
 * pill when negotiable. No listed price shows the pill alone (not a heading).
 */
export function JobDetailPriceLine({
  request,
  className = '',
  testId,
}: {
  request: Pick<HelpRequest, 'budget' | 'budgetType' | 'acceptsOffers'>
  className?: string
  testId?: string
}) {
  const listed = hasListedPrice(request)
  const openToOffers = requestAcceptsOffers(request)

  if (!listed) {
    return (
      <div
        className={`flex flex-wrap items-center gap-2 ${className}`.trim()}
        data-testid={testId}
      >
        <OpenToOffersPill />
      </div>
    )
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${className}`.trim()}
      data-testid={testId}
    >
      <span className="font-display text-[20px] font-bold leading-none tracking-[-0.02em] text-[#071330] tabular-nums">
        {formatMoney(request.budget)}
      </span>
      {openToOffers ? <OpenToOffersPill /> : null}
    </div>
  )
}

function OpenToOffersPill() {
  return (
    <span
      className="inline-flex items-center rounded-md bg-[#EEF2F7] px-2 py-0.5 text-[12px] font-semibold leading-tight tracking-[-0.01em] text-[#071330]"
      data-testid="job-open-to-offers-pill"
    >
      Open to offers
    </span>
  )
}
