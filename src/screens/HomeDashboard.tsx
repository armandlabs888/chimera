'use client'

import { Bookmark, Heart } from 'lucide-react'
import Link from 'next/link'
import { useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { BrowseCategoryThumb } from '@/components/browse/BrowseCategoryThumb'
import { CancelOfferAction } from '@/components/jobs/CancelOfferAction'
import { Avatar, Button } from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import { formatBudget, formatPriceCaption, hasListedPrice } from '@/lib/matching'
import { filterMyOffers } from '@/lib/myOffers'
import { formatCategoryLabel } from '@/lib/taxonomy'
import type { HelpRequest, Offer, Person, RequestStatus } from '@/types'
import './my-activity.css'

const ACTIVITY_TABS = ['requests', 'offers', 'saved'] as const
type ActivityTab = (typeof ACTIVITY_TABS)[number]

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'accepted', label: 'Booked' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
] as const

type StatusFilter = (typeof STATUS_FILTERS)[number]['id']

function statusPillLabel(status: RequestStatus | Offer['status']): string {
  if (status === 'accepted') return 'Booked'
  if (status === 'cancelled') return 'Cancelled'
  if (status === 'completed') return 'Completed'
  if (status === 'open') return 'Open'
  if (status === 'pending') return 'Pending'
  if (status === 'declined') return 'Declined'
  return status
}

export function HomeDashboard() {
  const {
    state,
    currentUser,
    getRequest,
    toggleSavedHelper,
    toggleSavedRequest,
  } = useBeam()
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const rawTab = params.get('tab')
  const activityTab: ActivityTab = ACTIVITY_TABS.includes(rawTab as ActivityTab)
    ? (rawTab as ActivityTab)
    : 'requests'

  const rawStatus = params.get('status')
  const statusFilter: StatusFilter = STATUS_FILTERS.some((s) => s.id === rawStatus)
    ? (rawStatus as StatusFilter)
    : 'all'

  function setActivityTab(next: ActivityTab) {
    const nextParams = new URLSearchParams(params.toString())
    if (next === 'requests') nextParams.delete('tab')
    else nextParams.set('tab', next)
    if (next !== 'requests') nextParams.delete('status')
    const qs = nextParams.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  function setStatusFilter(next: StatusFilter) {
    const nextParams = new URLSearchParams(params.toString())
    if (next === 'all') nextParams.delete('status')
    else nextParams.set('status', next)
    const qs = nextParams.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const myRequests = useMemo(
    () => state.requests.filter((r) => r.requesterId === currentUser.id),
    [state.requests, currentUser.id],
  )

  const filteredRequests = useMemo(() => {
    if (statusFilter === 'all') return myRequests
    return myRequests.filter((r) => r.status === statusFilter)
  }, [myRequests, statusFilter])

  const myOffers = useMemo(
    () => filterMyOffers(state.offers, currentUser.id, state.requests),
    [state.offers, state.requests, currentUser.id],
  )

  const savedHelpers = useMemo(
    () =>
      (state.savedHelperIds ?? [])
        .map((id) => state.people.find((p) => p.id === id))
        .filter((p): p is Person => Boolean(p)),
    [state.savedHelperIds, state.people],
  )

  // Drop cancelled or removed jobs from the Saved list.
  const savedJobs = useMemo(() => {
    const jobs: HelpRequest[] = []
    for (const id of state.savedRequestIds ?? []) {
      const request = state.requests.find((r) => r.id === id)
      if (request && request.status !== 'cancelled') jobs.push(request)
    }
    return jobs
  }, [state.savedRequestIds, state.requests])

  const hasSavedAnything = savedJobs.length > 0 || savedHelpers.length > 0

  return (
    <div className="beam-container pb-10 pt-6 sm:pt-8" data-testid="my-activity-page">
      <h1 className="ma-h1">My activity</h1>
      <p className="ma-sub">Tasks you posted, offers you made, and jobs or helpers you saved.</p>

      <div className="ma-tabs" role="tablist" aria-label="Activity">
        {(
          [
            ['requests', 'My requests'],
            ['offers', 'My offers'],
            ['saved', 'Saved'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activityTab === id}
            className={`ma-tab${activityTab === id ? ' is-on' : ''}`}
            onClick={() => setActivityTab(id)}
            data-testid={`you-tab-${id}`}
          >
            {label}
          </button>
        ))}
      </div>

      {activityTab === 'requests' ? (
        <>
          <div className="ma-filters" role="group" aria-label="Request status">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`ma-choice${statusFilter === f.id ? ' is-on' : ''}`}
                onClick={() => setStatusFilter(f.id)}
                data-testid={`activity-status-${f.id}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filteredRequests.length ? (
            <div className="ma-list" data-testid="activity-requests">
              {filteredRequests.map((request) => (
                <RequestActivityRow key={request.id} request={request} />
              ))}
            </div>
          ) : (
            <div className="ma-empty" data-testid="activity-requests-empty">
              <h3>No requests yet</h3>
              <p>Post something you need done nearby. Neighbors reply with a time and price.</p>
              <Link href="/post" className="ma-link">
                Post a task
              </Link>
            </div>
          )}

          <p className="ma-footer-cta">
            Need something else done?{' '}
            <Link href="/post" className="ma-link">
              Post a task
            </Link>
          </p>
        </>
      ) : null}

      {activityTab === 'offers' ? (
        myOffers.length ? (
          <div className="ma-list" data-testid="activity-offers">
            {myOffers.map((offer) => {
              const request = getRequest(offer.requestId)
              if (!request) return null
              return (
                <div key={offer.id} className="ma-act-row-wrap">
                  <Link href={`/requests/${request.id}`} className="ma-act-row">
                    <span className="ma-cat">
                      <BrowseCategoryThumb categoryId={request.category} className="!h-full !w-full !rounded-[11px]" />
                    </span>
                    <span className="min-w-0">
                      <div className="ma-act-title">{request.title}</div>
                      <div className="ma-act-meta">
                        <span>
                          Your offer ${Math.round(offer.price)}
                          {offer.eta ? ` · ${offer.eta}` : ''}
                        </span>
                        <span className="ma-dot">·</span>
                        <span className="ma-status-pill">{statusPillLabel(offer.status)}</span>
                      </div>
                    </span>
                    <span className="ma-act-right">
                      <div className="ma-act-price">${Math.round(offer.price)}</div>
                      <div className="ma-act-price-label">Offer</div>
                    </span>
                  </Link>
                  {offer.status === 'pending' ? (
                    <div className="ma-offer-actions">
                      <CancelOfferAction
                        offerId={offer.id}
                        testId={`you-cancel-offer-${offer.id}`}
                      />
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="ma-empty" data-testid="activity-offers-empty">
            <h3>No offers yet</h3>
            <p>Browse open jobs and name a price when you can help.</p>
            <Link href="/browse" className="ma-link">
              Browse jobs
            </Link>
          </div>
        )
      ) : null}

      {activityTab === 'saved' ? (
        hasSavedAnything ? (
          <div className="space-y-8" data-testid="activity-saved">
            <section data-testid="activity-saved-jobs">
              <div className="mt-5 flex items-center gap-2">
                <h2 className="text-[15px] font-bold text-[#071330]">Jobs</h2>
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#EEF2F7] px-2 text-[12px] font-semibold text-[#4A5568]">
                  {savedJobs.length}
                </span>
              </div>
              {savedJobs.length ? (
                <div className="ma-list">
                  {savedJobs.map((request) => (
                    <div key={request.id} className="ma-act-row-wrap">
                      <RequestActivityRow request={request} />
                      <div className="ma-offer-actions">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          aria-label="Remove saved job"
                          onClick={() => void toggleSavedRequest(request.id)}
                        >
                          <Bookmark className="h-4 w-4 fill-[#1D5CE5] text-[#1D5CE5]" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="ma-empty !mt-3" data-testid="activity-saved-jobs-empty">
                  <h3>No saved jobs</h3>
                  <p>Tap Save on a job to keep it here.</p>
                  <Link href="/browse" className="ma-link">
                    Browse jobs
                  </Link>
                </div>
              )}
            </section>

            <section data-testid="activity-saved-helpers">
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-bold text-[#071330]">Helpers</h2>
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#EEF2F7] px-2 text-[12px] font-semibold text-[#4A5568]">
                  {savedHelpers.length}
                </span>
              </div>
              {savedHelpers.length ? (
                <div className="ma-list">
                  {savedHelpers.map((person) => (
                    <div key={person.id} className="ma-act-row-wrap">
                      <Link href={`/people/${person.id}`} className="ma-act-row">
                        <span className="ma-cat ma-cat-avatar">
                          <Avatar src={person.avatar} name={person.name} size={48} />
                        </span>
                        <span className="min-w-0">
                          <div className="ma-act-title">{person.name}</div>
                          <div className="ma-act-meta">
                            {person.skills[0]
                              ? formatCategoryLabel(
                                  person.skills[0],
                                  person.skills[0] === 'other' ? person.otherSkillLabel : null,
                                )
                              : 'Helper'}
                          </div>
                        </span>
                        <span className="ma-act-right">
                          <div className="ma-act-price">
                            {person.rateType === 'quote'
                              ? 'Quote'
                              : `$${Math.round(person.hourlyRate || 0)}`}
                          </div>
                          <div className="ma-act-price-label">
                            {person.rateType === 'quote' ? 'Rate' : '/hr'}
                          </div>
                        </span>
                      </Link>
                      <div className="ma-offer-actions">
                        <Link
                          href={
                            person.skills[0]
                              ? `/post?rebook=${person.id}&category=${person.skills[0]}`
                              : `/post?rebook=${person.id}`
                          }
                          className="ma-link"
                        >
                          Book again
                        </Link>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          aria-label="Remove saved helper"
                          onClick={() => void toggleSavedHelper(person.id)}
                        >
                          <Heart className="h-4 w-4 fill-[#1D5CE5] text-[#1D5CE5]" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="ma-empty !mt-3" data-testid="activity-saved-helpers-empty">
                  <h3>No saved helpers</h3>
                  <p>Tap Save on a helper profile to keep them here.</p>
                  <Link href="/browse?tab=people" className="ma-link">
                    Meet helpers
                  </Link>
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="ma-empty" data-testid="activity-saved-empty">
            <h3>Nothing saved yet</h3>
            <p>Save jobs or helpers while you browse so you can find them again here.</p>
            <div className="mt-3 flex flex-wrap justify-center gap-4">
              <Link href="/browse" className="ma-link">
                Browse jobs
              </Link>
              <Link href="/browse?tab=people" className="ma-link">
                Meet helpers
              </Link>
            </div>
          </div>
        )
      ) : null}
    </div>
  )
}

function RequestActivityRow({ request }: { request: HelpRequest }) {
  const budget = formatBudget(request)
  const listed = hasListedPrice(request)
  const caption = formatPriceCaption(request)

  return (
    <Link href={`/requests/${request.id}`} className="ma-act-row" data-testid={`activity-request-${request.id}`}>
      <span className="ma-cat">
        <BrowseCategoryThumb categoryId={request.category} className="!h-full !w-full !rounded-[11px]" />
      </span>
      <span className="min-w-0">
        <div className="ma-act-title">{request.title}</div>
        <div className="ma-act-meta">
          <span>
            {formatCategoryLabel(
              request.category,
              request.category === 'other' ? request.categoryCustom : null,
            )}
          </span>
          <span className="ma-dot">·</span>
          <span className="ma-status-pill">{statusPillLabel(request.status)}</span>
        </div>
      </span>
      <span className="ma-act-right">
        <div className="ma-act-price">{listed ? budget : 'Open'}</div>
        <div className="ma-act-price-label">{listed ? caption ?? 'Price' : budget}</div>
      </span>
    </Link>
  )
}
