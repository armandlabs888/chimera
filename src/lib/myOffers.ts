import type { HelpRequest, Offer } from '@/types'

/**
 * Offers shown on My activity → My offers.
 * Hides helper withdrawals and declines that only exist because the job was cancelled.
 */
export function isVisibleMyOffer(
  offer: Offer,
  request: HelpRequest | undefined,
): boolean {
  if (offer.status === 'withdrawn') return false
  if (offer.status === 'declined' && request?.status === 'cancelled') return false
  return true
}

export function filterMyOffers(
  offers: Offer[],
  helperId: string,
  requests: HelpRequest[],
): Offer[] {
  const byId = new Map(requests.map((r) => [r.id, r]))
  return offers.filter(
    (o) => o.helperId === helperId && isVisibleMyOffer(o, byId.get(o.requestId)),
  )
}
