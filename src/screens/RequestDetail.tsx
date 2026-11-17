'use client'

import {
  CheckCircle2,
  Heart,
  MapPin,
  MessageCircle,
  Send,
  Star,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import {
  ReferHelperButton,
  ReferHelperHint,
  useReferHelperShare,
} from '@/components/browse/ReferHelperActions'
import { SuggestedHelpersSection } from '@/components/refer/SuggestedHelpersSection'
import { CancelJobAction } from '@/components/jobs/CancelJobAction'
import { CancelOfferAction } from '@/components/jobs/CancelOfferAction'
import { JobAreaMap } from '@/components/jobs/JobAreaMap'
import { JobDetailPhoto } from '@/components/jobs/JobDetailPhoto'
import { JobDetailPriceLine } from '@/components/jobs/JobDetailPriceLine'
import { JobSaveButton } from '@/components/jobs/JobSaveButton'
import { JobViewCount } from '@/components/jobs/JobViewCount'
import '@/components/browse/browse-hc.css'
import { NeedsHelpNowLabel } from '@/components/urgent/NeedsHelpNowLabel'
import { formatJobDetailsDisplay } from '@/lib/displayDetails'
import { formatJobAreaCaption } from '@/lib/location'
import { Avatar, Button, ButtonLink, ConfirmDialog, TextArea } from '@/components/ui'
import { pluralNoun, pluralize } from '@/lib/pluralize'
import { useMessagesDrawer } from '@/components/messages/useMessagesDrawer'
import {
  OfferGateNotice,
  OfferGatePrimaryButton,
} from '@/components/verification/OfferGateFooter'
import { useBeam } from '@/context/BeamContext'
import { CATEGORY_ICONS } from '@/lib/categoryIcons'
import { JobTitleText } from '@/lib/displayTitle'
import { listingCoverImage, normalizeListingImages } from '@/lib/listingPhotos'
import {
  formatCategoryLabel,
  isServiceCategoryId,
} from '@/lib/taxonomy'
import {
  hasListedPrice,
  requestAcceptsOffers,
  formatLocation,
  formatMoney,
  formatRate,
  rankHelpersForRequest,
  relativeTime,
} from '@/lib/matching'
import { isHelperPerson } from '@/lib/roles'
import { canMakeOffer, offerGateKind } from '@/lib/verification/status'
import { useRecordHelpRequestView } from '@/hooks/useRecordHelpRequestView'

const ETA_CHIPS = ['Within 30 min', 'Within 1 hour', 'Today afternoon', 'Flexible'] as const

const actionPanelClass = 'hc-rail-card p-5'

function paramId(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

function statusLabel(status: string): string {
  if (status === 'open') return 'Open'
  if (status === 'accepted') return 'In progress'
  if (status === 'completed') return 'Completed'
  if (status === 'cancelled') return 'Cancelled'
  return status
}

function initialOfferPrice(myPrice: number | undefined, budget: number | undefined): string {
  if (myPrice && myPrice > 0) return String(myPrice)
  if (budget && budget > 0) return String(budget)
  return ''
}

export function RequestDetail() {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = paramId(params.id)
  const justPosted = searchParams.get('justPosted') === '1'
  const { openThread } = useMessagesDrawer()

  const {
    state,
    currentUser,
    authUser,
    mode,
    getRequest,
    getPerson,
    createOffer,
    acceptOffer,
    markComplete,
    addReview,
    ensureThread,
    inviteHelper,
    toggleSavedHelper,
    helperVerification,
    refresh,
  } = useBeam()

  const request = getRequest(id)
  const isGuest = mode === 'live' && !authUser
  useRecordHelpRequestView(request?.id)

  // After an urgent post, refresh so "We texted n helpers" can update.
  useEffect(() => {
    if (!justPosted || !request?.isUrgent) return
    const timers = [1500, 4000, 8000].map((ms) =>
      window.setTimeout(() => {
        void refresh()
      }, ms),
    )
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [justPosted, request?.isUrgent, request?.id, refresh])
  const requester = request ? getPerson(request.requesterId) : undefined
  const categoryLabel = request
    ? formatCategoryLabel(request.category, request.categoryCustom)
    : undefined
  const CategoryIcon =
    request && isServiceCategoryId(request.category)
      ? CATEGORY_ICONS[request.category]
      : null

  const isOwner = request?.requesterId === currentUser.id
  const requesterIsHelper = requester ? isHelperPerson(requester) : false
  const requesterPostsCount = requester
    ? state.requests.filter((r) => r.requesterId === requester.id).length
    : 0
  const requesterActivityLabel = requester
    ? requesterIsHelper
      ? `${requester.jobsCompleted} jobs`
      : requesterPostsCount > 0
        ? `${requesterPostsCount} ${requesterPostsCount === 1 ? 'post' : 'posts'}`
        : null
    : null
  const isNeighborViewer =
    Boolean(request) && !isGuest && !isOwner && !isHelperPerson(currentUser)
  const isAcceptedHelper = Boolean(request?.helperId && request.helperId === currentUser.id)
  const canSeeExactAddress = Boolean(isOwner || isAcceptedHelper)
  const { referHelper, dialog: referDialog } = useReferHelperShare(
    request?.id ?? id,
    request?.title ?? '',
    request?.requesterId,
  )

  const offers = useMemo(
    () =>
      state.offers
        .filter((o) => o.requestId === request?.id && o.status !== 'withdrawn')
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [state.offers, request?.id],
  )

  const myOffer = offers.find(
    (o) => o.helperId === currentUser.id && o.status !== 'declined',
  )
  const acceptedOffer = offers.find((o) => o.id === request?.acceptedOfferId)
  const acceptedHelper = request?.helperId ? getPerson(request.helperId) : undefined

  const myInvite = useMemo(
    () =>
      state.invites.find(
        (inv) => inv.requestId === request?.id && inv.helperId === currentUser.id,
      ),
    [state.invites, request?.id, currentUser.id],
  )

  const invitedHelperIds = useMemo(() => {
    const ids = new Set<string>()
    for (const inv of state.invites) {
      if (inv.requestId === request?.id) ids.add(inv.helperId)
    }
    return ids
  }, [state.invites, request?.id])

  const offeredHelperIds = useMemo(
    () => new Set(offers.map((o) => o.helperId)),
    [offers],
  )

  const matches = useMemo(() => {
    if (!request) return []
    const exclude = [...offeredHelperIds]
    return rankHelpersForRequest(request, state.people, exclude).slice(0, 6)
  }, [request, state.people, offeredHelperIds])

  const existingReview = state.reviews.find(
    (r) => r.requestId === request?.id && r.fromId === currentUser.id,
  )

  const helperSaved =
    acceptedHelper != null && (state.savedHelperIds?.includes(acceptedHelper.id) ?? false)

  const [offerPrice, setOfferPrice] = useState(() =>
    initialOfferPrice(myOffer?.price, request?.budget),
  )
  const [offerNote, setOfferNote] = useState(() => myOffer?.note ?? '')
  const [offerEta, setOfferEta] = useState(() => myOffer?.eta ?? 'Within 1 hour')
  const [offerError, setOfferError] = useState('')
  const [offerPending, setOfferPending] = useState(false)
  const [invitePendingId, setInvitePendingId] = useState<string | null>(null)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewPending, setReviewPending] = useState(false)
  const [confirmAcceptOfferId, setConfirmAcceptOfferId] = useState<string | null>(null)
  const [confirmComplete, setConfirmComplete] = useState(false)
  const [actionPending, setActionPending] = useState(false)

  if (!request || !categoryLabel || !requester) {
    return (
      <div className="beam-container py-10" data-testid="request-not-found">
        <div className="rounded-[10px] border border-[#E3E8EF] bg-white px-6 py-12 text-center">
          <h1 className="type-h3 text-[#071330]">This request isn&apos;t available</h1>
          <p className="mx-auto mt-2 max-w-sm type-sec text-beam-muted">
            It may have been filled or removed.
          </p>
          <div className="mt-4 flex justify-center">
            <ButtonLink href="/browse">Back to browse</ButtonLink>
          </div>
        </div>
      </div>
    )
  }

  const activeRequest = request
  const listedPrice = hasListedPrice(request)
  const firmPrice = listedPrice && !requestAcceptsOffers(request)
  const firmPriceAmount = listedPrice ? Math.round(request.budget) : 0
  const locationLabel = formatLocation(request)
  const listingImages = normalizeListingImages(request.images, request.image)
  const coverImage = listingCoverImage(listingImages, request.image)
  const pendingAcceptOffer = confirmAcceptOfferId
    ? offers.find((o) => o.id === confirmAcceptOfferId)
    : undefined
  const pendingAcceptHelper = pendingAcceptOffer
    ? getPerson(pendingAcceptOffer.helperId)
    : undefined
  const hireFirstName =
    pendingAcceptHelper?.name?.split(' ')[0] || pendingAcceptHelper?.name || 'this helper'
  const hirePriceLabel = pendingAcceptOffer ? formatMoney(pendingAcceptOffer.price) : ''

  async function openThreadWith(otherId: string) {
    const threadId = await ensureThread(activeRequest.id, otherId)
    openThread(threadId)
  }

  async function submitOffer(e: FormEvent) {
    e.preventDefault()
    const priceNum = firmPrice ? firmPriceAmount : Number(offerPrice)
    if (!Number.isFinite(priceNum) || priceNum < 5) {
      setOfferError('Name a real price before you show up.')
      return
    }
    if (firmPrice && Math.round(priceNum) !== firmPriceAmount) {
      setOfferError(`This job has a firm price of $${firmPriceAmount}.`)
      return
    }
    setOfferPending(true)
    setOfferError('')
    try {
      await createOffer({
        requestId: activeRequest.id,
        price: priceNum,
        note: offerNote.trim(),
        eta: offerEta,
      })
      await ensureThread(activeRequest.id, activeRequest.requesterId)
    } catch (err) {
      setOfferError(err instanceof Error ? err.message : 'Could not send offer')
    } finally {
      setOfferPending(false)
    }
  }

  async function submitReview(e: FormEvent) {
    e.preventDefault()
    if (!activeRequest.helperId && !isOwner) return
    const toId = isOwner ? activeRequest.helperId! : activeRequest.requesterId
    setReviewPending(true)
    try {
      await addReview({
        requestId: activeRequest.id,
        toId,
        rating: reviewRating,
        comment: reviewComment.trim(),
      })
    } finally {
      setReviewPending(false)
    }
  }

  async function confirmAccept() {
    if (!confirmAcceptOfferId || actionPending) return
    setActionPending(true)
    try {
      await acceptOffer(confirmAcceptOfferId)
      setConfirmAcceptOfferId(null)
    } catch {
      // backendError toast surfaces live failures
    } finally {
      setActionPending(false)
    }
  }

  async function confirmMarkComplete() {
    if (actionPending) return
    setActionPending(true)
    try {
      await markComplete(activeRequest.id)
      setConfirmComplete(false)
    } catch {
      // backendError toast surfaces live failures
    } finally {
      setActionPending(false)
    }
  }

  async function onInvite(helperId: string) {
    setInvitePendingId(helperId)
    try {
      await inviteHelper(activeRequest.id, helperId)
    } finally {
      setInvitePendingId(null)
    }
  }

  return (
    <div
      className="beam-container space-y-5 py-2 pb-40 sm:py-4 lg:pb-16"
      data-testid="request-detail-root"
    >
      <Link
        href="/browse"
        className="inline-flex min-h-[44px] items-center py-2 text-[13.5px] font-medium text-[#4A5568] transition hover:text-[#071330]"
        data-testid="request-detail-back"
      >
        ← Back to browse
      </Link>

      <div
        className="lg:grid lg:grid-cols-[minmax(0,1.45fr)_minmax(360px,420px)] lg:items-start lg:gap-8 xl:gap-10"
        data-testid="request-detail-grid"
      >
        {/* Left column - task overview */}
        <div className="space-y-5" data-testid="request-detail-left">
          <article className="overflow-hidden">
            <div className="flex flex-col gap-6 p-0 sm:gap-7">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-[#EEF2F7] px-3 py-1.5 text-[13px] font-semibold text-[#071330]">
                  {CategoryIcon ? (
                    <CategoryIcon
                      className="h-3.5 w-3.5 text-[#1D5CE5]"
                      strokeWidth={2}
                      aria-hidden
                    />
                  ) : null}
                  {categoryLabel}
                </span>
                {request.isUrgent ? <NeedsHelpNowLabel /> : null}
                <span
                  className={`inline-flex items-center rounded-md px-2.5 py-1 text-[12px] font-semibold capitalize ${
                    request.status === 'open'
                      ? 'bg-[#EEF4FF] text-[#1D5CE5]'
                      : request.status === 'accepted'
                        ? 'bg-[#EEF4FF] text-[#1D5CE5]'
                        : request.status === 'completed'
                          ? 'bg-white text-[#4A5568]'
                          : 'bg-white text-[#4A5568]'
                  }`}
                >
                  {statusLabel(request.status)}
                </span>
                <span className="text-[12.5px] text-[#4A5568]">
                  Posted {relativeTime(request.createdAt)}
                </span>
                {(request.viewCount ?? 0) > 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-[12.5px] text-[#4A5568]">
                    <span aria-hidden>·</span>
                    <JobViewCount count={request.viewCount} testId="request-detail-views" />
                  </span>
                ) : null}
              </div>

              {isOwner && request.isUrgent ? (
                (request.urgentHelpersNotifiedCount ?? 0) > 0 ? (
                  <p
                    className="border-0 bg-transparent px-0 py-1 text-[13.5px] font-medium text-[#071330]"
                    data-testid="urgent-texted-helpers"
                  >
                    We texted{' '}
                    {pluralize(request.urgentHelpersNotifiedCount ?? 0, 'helper')} nearby
                  </p>
                ) : (
                  <p
                    className="border-0 bg-transparent px-0 py-1 text-[13.5px] font-medium text-[#071330]"
                    data-testid="urgent-texted-helpers-pending"
                  >
                    We&apos;ll text helpers nearby as they become available
                  </p>
                )
              ) : null}

              <h1 className="font-display text-[22px] font-bold leading-[1.25] tracking-[-0.015em] text-[#071330] [text-wrap:balance] sm:text-[24px]">
                <JobTitleText title={request.title} />
              </h1>

              <JobDetailPriceLine
                request={request}
                testId="request-budget-card"
              />

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[14px] font-medium text-[#4A5568]">
                <span className="inline-flex items-center gap-1.5 font-medium text-[#071330]">
                  {request.whenLabel}
                </span>
                <span aria-hidden className="text-[#CBD5E1]">
                  ·
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-[#4A5568]" aria-hidden />
                  {locationLabel}
                </span>
              </div>

              {listingImages.length > 0 ? (
                <div className="mt-1 space-y-2" data-testid="request-detail-photos">
                  <JobDetailPhoto
                    src={coverImage ?? listingImages[0]}
                    showBottomScrim
                    className="rounded-lg"
                    testId="request-detail-cover"
                  >
                    <JobSaveButton requestId={request.id} testId="request-job-save" />
                  </JobDetailPhoto>
                  {listingImages.length > 1 ? (
                    <ul className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                      {listingImages.map((src, i) => (
                        <li
                          key={`${src}-${i}`}
                          className="relative aspect-square overflow-hidden rounded-md bg-white"
                        >
                          <Image
                            src={src}
                            alt=""
                            fill
                            sizes="96px"
                            className="object-cover"
                          />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : (
                <div className="pt-1">
                  <JobSaveButton
                    requestId={request.id}
                    testId="request-job-save"
                    className="inline-flex h-10 min-h-10 items-center gap-1.5 rounded-full bg-[#EEF2F7] px-4 text-[14px] font-semibold text-[#071330]"
                  />
                </div>
              )}

              <JobAreaMap
                jobId={request.id}
                lat={request.lat}
                lng={request.lng}
                locationLabel={request.locationLabel}
                neighborhood={request.neighborhood}
                city={request.city}
                radiusMiles={request.radiusMiles}
                areaLabel={formatJobAreaCaption(request)}
              />

              <div className="border-t border-[#E3E8EF] pt-6 sm:pt-7">
                <h2 className="text-[20px] font-bold text-[#071330]">About this task</h2>
                <p className="mt-2.5 whitespace-pre-wrap text-[15px] leading-[1.55] text-[#071330]">
                  {formatJobDetailsDisplay(request.details)}
                </p>
              </div>

              <div className="flex items-center gap-3 border-t border-[#E3E8EF] pt-6 sm:pt-7">
                <Avatar src={requester.avatar} name={requester.name} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-[#071330]">
                    {requester.name}
                    {isOwner ? ' (you)' : ''}
                  </p>
                  <p className="truncate text-[13px] text-[#4A5568]">
                    {formatLocation(requester)}
                    {' · '}
                    {requester.rating > 0 && requester.reviewCount > 0
                      ? `★ ${requester.rating.toFixed(1)}`
                      : 'New'}
                    {requesterActivityLabel ? ` · ${requesterActivityLabel}` : ''}
                  </p>
                </div>
                <Link
                  href={`/people/${requester.id}`}
                  className="inline-flex min-h-[44px] shrink-0 items-center text-[13px] font-semibold text-[#1D5CE5] transition hover:text-[#1649BD]"
                >
                  View profile →
                </Link>
              </div>
            </div>
          </article>

          {isOwner && request.status === 'open' ? (
            <div
              data-testid="request-suggested-helpers"
              className="border-t border-[#E3E8EF] pt-6 empty:hidden"
            >
              <SuggestedHelpersSection jobId={request.id} />
            </div>
          ) : null}

          {/* Nearby matches for owner - left column */}
          {isOwner && request.status === 'open' ? (
            <section className="border-t border-[#E3E8EF] pt-6" data-testid="request-nearby-matches">
              <h2 className="text-[18px] font-bold text-[#071330]">Instant Nearby Matches</h2>
              <p className="mt-1 text-[14px] text-[#4A5568]">
                Ranked by skill, distance, and availability for this task.
              </p>

              {matches.length === 0 ? (
                <div className="mt-5 bg-transparent px-0 py-8 text-center">
                  <p className="text-[15px] font-semibold text-[#071330]">No matches in range</p>
                  <p className="mt-1 text-[13px] text-[#4A5568]">
                    Helpers will appear as they come online nearby.
                  </p>
                </div>
              ) : (
                <ul className="mt-5 divide-y divide-[#E3E8EF]">
                  {matches.map((match) => {
                    const { person } = match
                    const invited = invitedHelperIds.has(person.id)
                    return (
                      <li
                        key={person.id}
                        className="border-0 bg-transparent py-4 first:pt-0"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <Link
                            href={`/people/${person.id}`}
                            className="flex min-w-0 items-center gap-3"
                          >
                            <Avatar src={person.avatar} name={person.name} size={44} />
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-[#071330]">{person.name}</p>
                              <p className="text-[12.5px] text-[#4A5568]">
                                {authUser ? `${match.distanceMiles.toFixed(1)} mi · ` : ''}
                                {formatRate(person)}
                                {' · '}
                                {person.rating > 0 && person.reviewCount > 0
                                  ? `★ ${person.rating.toFixed(1)}`
                                  : 'New'}
                              </p>
                              {match.reasons.length ? (
                                <p className="mt-1 line-clamp-1 text-[12px] text-[#4A5568]">
                                  {match.reasons.slice(0, 3).join(' · ')}
                                </p>
                              ) : null}
                            </div>
                          </Link>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {invited ? (
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => void openThreadWith(person.id)}
                            >
                              Invited ✓ · Open chat
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              loading={invitePendingId === person.id}
                              onClick={() => void onInvite(person.id)}
                            >
                              Invite to offer
                            </Button>
                          )}
                          {!invited ? (
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => void openThreadWith(person.id)}
                            >
                              <MessageCircle className="h-4 w-4" />
                              Message
                            </Button>
                          ) : null}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          ) : null}
        </div>

        {/* Right column - sticky action rail */}
        <aside
          className="mt-5 space-y-4 lg:sticky lg:top-24 lg:mt-0"
          data-testid="request-detail-right"
        >
          <p className="px-0 pb-1 text-[13px] leading-[1.45] text-[#4A5568]">
            No lead fees · Agree in chat
          </p>

          {justPosted && isOwner && request.status === 'open' ? (
            <div
              className="border-0 bg-transparent px-0 py-2 text-[15px] leading-[1.55] text-[#071330]"
              role="status"
            >
              <p className="font-semibold text-[#071330]">Your request is live nearby.</p>
              <p className="mt-1 text-[#4A5568]">
                Nearby helpers can send offers now. Invite strong matches to speed things up.
              </p>
            </div>
          ) : null}

          {/* Owner open - single action panel */}
          {isOwner && request.status === 'open' ? (
            <div className={actionPanelClass} data-testid="request-owner-controls">
              <p className="text-[13.5px] font-semibold text-[#071330]">Your listing</p>
              <p className="mt-1 text-[14px] text-[#4A5568]">
                Cancel anytime before you hire a helper.
              </p>
              <CancelJobAction request={request} fullWidth className="mt-4" />

              <section className="mt-5 border-t border-[#E3E8EF] pt-5" data-testid="request-incoming-offers">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[18px] font-bold text-[#071330]">
                  Incoming {pluralNoun(offers.length === 1 ? 1 : 2, 'offer')}
                </h2>
                {offers.length > 0 ? (
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-[#EEF2F7] px-2 text-[12px] font-bold text-[#1D5CE5]">
                    {offers.length}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-[14px] text-[#4A5568]">
                Accept when the price and timing feel right.
              </p>

              {offers.length === 0 ? (
                <div className="mt-5 bg-transparent px-0 py-6 text-center">
                  <p className="text-[15px] font-semibold text-[#071330]">No offers yet</p>
                  <p className="mt-1 text-[13px] text-[#4A5568]">
                    Invite nearby matches. They&apos;ll show up here when they name a price.
                  </p>
                </div>
              ) : (
                <ul className="mt-5 divide-y divide-[#E3E8EF]">
                  {offers.map((offer) => {
                    const helper = getPerson(offer.helperId)
                    if (!helper) return null
                    return (
                      <li
                        key={offer.id}
                        className="border-0 bg-transparent py-4 first:pt-0"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <Link
                            href={`/people/${helper.id}`}
                            className="flex min-w-0 items-center gap-3"
                          >
                            <Avatar src={helper.avatar} name={helper.name} size={40} />
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-[#071330]">{helper.name}</p>
                              <p className="text-[12.5px] text-[#4A5568]">
                                {helper.rating > 0 && helper.reviewCount > 0
                                  ? `★ ${helper.rating.toFixed(1)}`
                                  : 'New'}{' '}
                                · ETA {offer.eta}
                              </p>
                            </div>
                          </Link>
                          <div className="shrink-0 text-right">
                            <p className="font-display text-[20px] font-bold tabular-nums text-[#071330]">
                              {formatMoney(offer.price)}
                            </p>
                            <p className="text-[12px] font-semibold capitalize text-[#4A5568]">
                              {offer.status}
                            </p>
                          </div>
                        </div>
                        {offer.note ? (
                          <p className="mt-3 text-[15px] leading-[1.55] text-[#071330]">
                            {offer.note}
                          </p>
                        ) : null}
                        <div className="mt-4 flex flex-wrap gap-2">
                          {offer.status === 'pending' ? (
                            <Button
                              type="button"
                              data-testid="accept-offer-button"
                              onClick={() => setConfirmAcceptOfferId(offer.id)}
                            >
                              Accept offer
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => void openThreadWith(offer.helperId)}
                          >
                            <MessageCircle className="h-4 w-4" />
                            Message
                          </Button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}

              <div className="mt-5 border-t border-[#E3E8EF] pt-4">
                <ButtonLink href="/post" className="w-full">
                  Post another task
                </ButtonLink>
              </div>
              </section>
            </div>
          ) : null}

          {/* Neighbor open: refer a helper (no offer chrome) */}
          {isNeighborViewer && request.status === 'open' ? (
            <section className="space-y-3" data-testid="request-refer-panel">
              <div className={actionPanelClass}>
                <ReferHelperButton onClick={() => void referHelper()} />
                <ReferHelperHint />
              </div>
              {referDialog}
            </section>
          ) : null}

          {/* Helper open - send offer (gated until address verification is approved) */}
          {!isOwner && !isNeighborViewer && request.status === 'open' ? (
            <section className="space-y-3" data-testid="request-offer-panel">
              {myInvite ? (
                <div className="border-0 border-b border-[#E3E8EF] bg-transparent px-0 py-3 text-[14px] font-semibold text-[#071330]">
                  You were invited to offer on this task
                </div>
              ) : null}

              <div className={actionPanelClass}>
                {canMakeOffer(helperVerification) ? (
                  <>
                    <h2 className="text-[18px] font-bold text-[#071330]">
                      {myOffer ? 'Update your offer' : 'Send an offer'}
                    </h2>
                    <p className="mt-1 text-[14px] text-[#4A5568]">
                      {firmPrice
                        ? 'Confirm the firm price and ETA before you show up.'
                        : 'Name a price and ETA before you show up.'}
                    </p>

                    <form className="mt-5 space-y-4" onSubmit={(e) => void submitOffer(e)}>
                      <div>
                        {firmPrice ? (
                          <>
                            <p className="mb-2 text-[13.5px] font-semibold text-[#071330]">
                              Your offer
                            </p>
                            <div
                              className="flex h-12 items-center rounded-lg border border-[#E3E8EF] bg-[#F7F9FC] px-3.5 text-[15px] font-semibold tabular-nums text-[#071330]"
                              data-testid="offer-firm-price"
                            >
                              Firm price ${firmPriceAmount}
                            </div>
                            <input
                              type="hidden"
                              value={firmPriceAmount}
                              data-testid="offer-price-input"
                              readOnly
                            />
                          </>
                        ) : (
                          <>
                            <label
                              htmlFor="offer-price"
                              className="mb-2 block text-[13.5px] font-semibold text-[#071330]"
                            >
                              Your offer
                            </label>
                            <div className="relative flex h-12 items-center rounded-lg border border-[#E3E8EF] bg-white focus-within:border-[#1D5CE5] focus-within:ring-4 focus-within:ring-[#1D5CE5]/15">
                              <span className="pl-3.5 text-[15px] font-semibold text-[#4A5568]" aria-hidden>
                                $
                              </span>
                              <input
                                id="offer-price"
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={offerPrice}
                                onChange={(e) =>
                                  setOfferPrice(e.target.value.replace(/[^\d]/g, '').slice(0, 5))
                                }
                                placeholder="60"
                                required
                                data-testid="offer-price-input"
                                className="h-full w-full min-w-0 bg-transparent px-2 pr-3.5 text-[15px] font-semibold tabular-nums text-[#071330] outline-none placeholder:font-normal placeholder:text-[#5B6576]"
                              />
                            </div>
                          </>
                        )}
                      </div>

                      <div>
                        <p className="mb-2 text-[13.5px] font-semibold text-[#071330]">
                          Arrival / start window
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {ETA_CHIPS.map((chip) => {
                            const selected = offerEta === chip
                            return (
                              <button
                                key={chip}
                                type="button"
                                onClick={() => setOfferEta(chip)}
                                className={`rounded-lg px-3 py-2.5 text-[13px] font-semibold transition ${
                                  selected
                                    ? 'border border-[#1D5CE5] bg-[#EEF4FF] text-[#1D5CE5]'
                                    : 'border border-[#E3E8EF] bg-white text-[#071330] hover:bg-white'
                                }`}
                              >
                                {chip}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="offer-note"
                          className="mb-2 block text-[13.5px] font-semibold text-[#071330]"
                        >
                          Message to requester{' '}
                          <span className="font-normal text-[#4A5568]">(optional)</span>
                        </label>
                        <TextArea
                          id="offer-note"
                          value={offerNote}
                          onChange={(e) => setOfferNote(e.target.value)}
                          rows={3}
                          placeholder="Experience, what you’ll bring, questions…"
                          className="rounded-lg"
                        />
                      </div>

                      {offerError ? (
                        <p className="flex items-start gap-2 rounded-lg border border-[#D7E0EC] bg-white px-3 py-2 text-[14px] text-[#071330]" role="alert">
                          {offerError}
                        </p>
                      ) : null}

                      <div className="flex flex-col gap-2">
                        <div
                          className={
                            myOffer?.status === 'pending'
                              ? 'flex flex-col gap-2 sm:flex-row sm:items-start'
                              : undefined
                          }
                        >
                          <Button
                            type="submit"
                            loading={offerPending}
                            className={`h-12 rounded-lg bg-[#1D5CE5] text-white shadow-none hover:bg-[#1649BD] ${
                              myOffer?.status === 'pending' ? 'w-full sm:flex-1' : 'w-full'
                            }`}
                          >
                            <Send className="h-4 w-4" />
                            {myOffer ? 'Update offer' : 'Submit offer'}
                          </Button>
                          {myOffer?.status === 'pending' ? (
                            <CancelOfferAction
                              offerId={myOffer.id}
                              className="w-full sm:flex-1"
                              fullWidth
                              testId="request-cancel-offer"
                              buttonClassName="inline-flex h-12 w-full items-center justify-center whitespace-nowrap rounded-lg border border-[#D7E0EC] bg-white px-[18px] text-[14px] font-semibold tracking-[-0.01em] text-[#071330] hover:bg-[#EEF2F7] disabled:cursor-not-allowed disabled:opacity-60"
                              onCancelled={() => {
                                setOfferError('')
                                setOfferPrice(initialOfferPrice(undefined, request.budget))
                                setOfferNote('')
                                setOfferEta('Within 1 hour')
                              }}
                            />
                          ) : null}
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-11 w-full rounded-lg"
                          onClick={() => void openThreadWith(request.requesterId)}
                        >
                          <MessageCircle className="h-4 w-4" />
                          Ask a question first
                        </Button>
                      </div>
                    </form>
                  </>
                ) : (
                  <>
                    <h2 className="text-[18px] font-bold text-[#071330]">
                      {myOffer?.status === 'pending' ? 'Your offer is pending' : 'Verification required'}
                    </h2>
                    <p className="mt-1 text-[14px] text-[#4A5568]">
                      {myOffer?.status === 'pending'
                        ? 'You can cancel this offer anytime. New offers unlock after Bunk confirms you are at your home address.'
                        : "Offering unlocks after Bunk confirms you're at your home address."}
                    </p>
                    {myOffer?.status === 'pending' ? (
                      <div className="mt-4">
                        <CancelOfferAction
                          offerId={myOffer.id}
                          fullWidth
                          testId="request-cancel-offer"
                          onCancelled={() => {
                            setOfferError('')
                            setOfferPrice(initialOfferPrice(undefined, request.budget))
                            setOfferNote('')
                            setOfferEta('Within 1 hour')
                          }}
                        />
                      </div>
                    ) : null}
                    <OfferGateNotice verification={helperVerification} />
                    <div className="mt-4 flex flex-col gap-2">
                      {(() => {
                        const kind = offerGateKind(helperVerification)
                        if (kind === 'approved') return null
                        return <OfferGatePrimaryButton kind={kind} narrow />
                      })()}
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-11 w-full rounded-lg"
                        onClick={() => void openThreadWith(request.requesterId)}
                      >
                        <MessageCircle className="h-4 w-4" />
                        Ask a question
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </section>
          ) : null}

          {/* Accepted - booked summary */}
          {request.status === 'accepted' && (isOwner || isAcceptedHelper) ? (
            <section className={actionPanelClass} data-testid="request-booked-panel">
              <p className="text-[13.5px] font-semibold text-[#071330]">You&apos;re booked</p>
              <p className="mt-1 text-[14px] text-[#4A5568]">
                Coordinate in chat and agree how you&apos;ll pay peer-to-peer.
              </p>

              <dl className="mt-5 space-y-4">
                <div>
                  <dt className="text-[13px] font-semibold text-[#4A5568]">Confirmed helper</dt>
                  <dd className="mt-1.5 flex items-center gap-2.5">
                    {acceptedHelper ? (
                      <>
                        <Avatar src={acceptedHelper.avatar} name={acceptedHelper.name} size={36} />
                        <span className="font-semibold text-[#071330]">{acceptedHelper.name}</span>
                      </>
                    ) : (
                      <span className="text-[#4A5568]">Not set</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-[13px] font-semibold text-[#4A5568]">Agreed price</dt>
                  <dd className="mt-1.5 font-display text-[24px] font-bold tabular-nums text-[#071330]">
                    {acceptedOffer ? formatMoney(acceptedOffer.price) : 'Not set'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[13px] font-semibold text-[#4A5568]">ETA</dt>
                  <dd className="mt-1.5 font-semibold text-[#071330]">
                    {acceptedOffer?.eta ?? request.whenLabel}
                  </dd>
                </div>
                <div>
                  <dt className="text-[13px] font-semibold text-[#4A5568]">Location</dt>
                  <dd className="mt-1.5 font-semibold text-[#071330]">{locationLabel}</dd>
                </div>
                {canSeeExactAddress && request.exactAddress ? (
                  <div>
                    <dt className="text-[13px] font-semibold text-[#4A5568]">Exact address</dt>
                    <dd className="mt-1.5 font-semibold text-[#071330]">{request.exactAddress}</dd>
                  </div>
                ) : null}
              </dl>

              <div className="mt-5 border-0 bg-transparent px-0 py-1 text-[13.5px] leading-relaxed text-[#4A5568]">
                Pay your helper peer-to-peer (Venmo, cash, Zelle, etc.). Bunk doesn&apos;t process
                payments yet. Agree on the method in chat before you start.
              </div>

              <div className="mt-5 flex flex-col gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() =>
                    void openThreadWith(isOwner ? request.helperId! : request.requesterId)
                  }
                >
                  <MessageCircle className="h-4 w-4" />
                  Open chat
                </Button>
                <Button
                  type="button"
                  className="w-full"
                  data-testid="mark-complete-button"
                  onClick={() => setConfirmComplete(true)}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Mark job complete
                </Button>
                {isOwner ? <CancelJobAction request={request} fullWidth /> : null}
              </div>
            </section>
          ) : null}

          {/* Cancelled */}
          {request.status === 'cancelled' ? (
            <section className={actionPanelClass} data-testid="request-cancelled-panel">
              <p className="text-[13.5px] font-semibold text-[#071330]">This job is cancelled</p>
              <p className="mt-1 text-[14px] text-[#4A5568]">
                {isOwner
                  ? 'Helpers with pending offers were told. It no longer appears in Browse.'
                  : 'The neighbor cancelled this job. It is no longer open for offers.'}
              </p>
              {isOwner ? (
                <ButtonLink href="/post" className="mt-5 w-full">
                  Post a new job
                </ButtonLink>
              ) : (
                <ButtonLink href="/browse" variant="secondary" className="mt-5 w-full">
                  Back to Browse
                </ButtonLink>
              )}
            </section>
          ) : null}

          {/* Completed - mutual review */}
          {request.status === 'completed' ? (
            <section className={actionPanelClass} data-testid="request-review-panel">
              <h2 className="text-[18px] font-bold text-[#071330]">Mutual review</h2>
              <p className="mt-1 text-[14px] text-[#4A5568]">
                Rate your experience so neighbors know who to trust next time.
              </p>

              {existingReview ? (
                <div className="mt-5 rounded-lg bg-white px-4 py-4">
                  <div className="flex items-center gap-1 text-[#071330]">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${
                          i < existingReview.rating
                            ? 'fill-[#071330] text-[#071330]'
                            : 'text-[#CBD5E1]'
                        }`}
                      />
                    ))}
                  </div>
                  {existingReview.comment.trim() ? (
                    <p className="mt-2 text-[15px] leading-[1.55] text-[#071330]" data-testid="review-comment-text">
                      “{existingReview.comment}”
                    </p>
                  ) : null}
                </div>
              ) : isOwner || isAcceptedHelper ? (
                <form className="mt-5 space-y-4" onSubmit={(e) => void submitReview(e)}>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setReviewRating(n)}
                        className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border transition ${
                          reviewRating >= n
                            ? 'border-[#071330] bg-white text-[#071330]'
                            : 'border-[rgba(7,19,48,0.12)] bg-white text-[#4A5568]'
                        }`}
                        aria-label={`${n} stars`}
                      >
                        <Star className={`h-5 w-5 ${reviewRating >= n ? 'fill-current' : ''}`} />
                      </button>
                    ))}
                  </div>
                  <div>
                    <label
                      htmlFor="review-comment"
                      className="mb-2 block text-[13.5px] font-semibold text-[#071330]"
                    >
                      Comment <span className="font-normal text-[#4A5568]">(optional)</span>
                    </label>
                    <TextArea
                      id="review-comment"
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="How did it go?"
                      className="rounded-lg"
                    />
                  </div>
                  <Button type="submit" loading={reviewPending} className="w-full">
                    Submit review
                  </Button>
                </form>
              ) : (
                <p className="mt-4 text-[14px] text-[#4A5568]">
                  Only the people on this job can review.
                </p>
              )}

              {isOwner && acceptedHelper ? (
                <div className="mt-6 flex flex-col gap-2 border-t border-[#E3E8EF] pt-5">
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    onClick={() => void toggleSavedHelper(acceptedHelper.id)}
                  >
                    <Heart
                      className={`h-4 w-4 ${helperSaved ? 'fill-[#1D5CE5] text-[#1D5CE5]' : ''}`}
                    />
                    {helperSaved ? 'Saved to favorites' : 'Save to favorites'}
                  </Button>
                  <ButtonLink
                    href={`/post?rebook=${acceptedHelper.id}&category=${request.category}`}
                    className="w-full"
                  >
                    Book again
                  </ButtonLink>
                </div>
              ) : null}
            </section>
          ) : null}
        </aside>
      </div>

      {/* Mobile sticky action bar (mirrors primary CTAs in the right rail). */}
      {request.status === 'open' && !isOwner ? (
        <div
          className="mobile-sticky-above-dock fixed inset-x-0 bottom-0 z-50 flex gap-2 border-t border-[#E3E8EF] bg-white px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
          data-testid="request-mobile-sticky"
        >
          {isNeighborViewer ? (
            <ReferHelperButton onClick={() => void referHelper()} className="w-full" />
          ) : (
            <>
              <Button
                type="button"
                variant="secondary"
                className="h-11 min-w-0 flex-1 rounded-lg"
                onClick={() => void openThreadWith(request.requesterId)}
              >
                <MessageCircle className="h-4 w-4" />
                Ask a question
              </Button>
              {canMakeOffer(helperVerification) ? (
                <Button
                  type="button"
                  className="h-11 min-w-0 flex-[1.15] rounded-lg"
                  onClick={() => {
                    document
                      .querySelector('[data-testid="request-offer-panel"]')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                >
                  {myOffer ? 'Update offer' : 'Make an offer'}
                </Button>
              ) : (
                (() => {
                  const kind = offerGateKind(helperVerification)
                  if (kind === 'approved') return null
                  return <OfferGatePrimaryButton kind={kind} className="!h-11 min-w-0 flex-[1.15]" />
                })()
              )}
            </>
          )}
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(confirmAcceptOfferId && pendingAcceptOffer)}
        title={`Hire ${hireFirstName} for ${hirePriceLabel}?`}
        body="Other offers will be declined."
        confirmLabel="Hire"
        pending={actionPending}
        onConfirm={() => void confirmAccept()}
        onClose={() => {
          if (!actionPending) setConfirmAcceptOfferId(null)
        }}
        testId="accept-offer-confirm"
      />

      <ConfirmDialog
        open={confirmComplete}
        title="Mark this job complete?"
        body="You'll both be asked for a review."
        confirmLabel="Mark complete"
        pending={actionPending}
        onConfirm={() => void confirmMarkComplete()}
        onClose={() => {
          if (!actionPending) setConfirmComplete(false)
        }}
        testId="mark-complete-confirm"
      />
    </div>
  )
}
