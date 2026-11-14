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
import { NeedsHelpNowLabel } from '@/components/urgent/NeedsHelpNowLabel'
import { Avatar, Button, ButtonLink, ConfirmDialog, TextArea } from '@/components/ui'
import { pluralNoun, pluralize } from '@/lib/pluralize'
import { useMessagesDrawer } from '@/components/messages/useMessagesDrawer'
import {
  OfferGateNotice,
  OfferGatePrimaryButton,
} from '@/components/verification/OfferGateFooter'
import { useBeam } from '@/context/BeamContext'
import { CATEGORY_ICONS } from '@/lib/categoryIcons'
import { listingCoverImage, normalizeListingImages } from '@/lib/listingPhotos'
import {
  formatCategoryLabel,
  isServiceCategoryId,
} from '@/lib/taxonomy'
import {
  formatBudget,
  formatLocation,
  formatMoney,
  formatRate,
  rankHelpersForRequest,
  relativeTime,
} from '@/lib/matching'
import { canMakeOffer, offerGateKind } from '@/lib/verification/status'

const ETA_CHIPS = ['Within 30 min', 'Within 1 hour', 'Today afternoon', 'Flexible'] as const

const cardClass =
  'rounded-lg border border-[rgba(7,19,48,0.08)] bg-white shadow-[0_8px_24px_-14px_rgba(12,42,102,0.1)]'

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
  const isAcceptedHelper = Boolean(request?.helperId && request.helperId === currentUser.id)
  const canSeeExactAddress = Boolean(isOwner || isAcceptedHelper)

  const offers = useMemo(
    () =>
      state.offers
        .filter((o) => o.requestId === request?.id && o.status !== 'withdrawn')
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [state.offers, request?.id],
  )

  const myOffer = offers.find((o) => o.helperId === currentUser.id)
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
      <div className="py-10" data-testid="request-not-found">
        <div className="rounded-[10px] border border-[#C7D7F0] bg-[#FBFDFF] px-6 py-12 text-center">
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
  const budgetLabel = formatBudget(request)
  const locationLabel = formatLocation(request)
  const listingImages = normalizeListingImages(request.images, request.image)
  const coverImage = listingCoverImage(listingImages, request.image)
  const isOpenBudget = request.budgetType === 'open' || request.budget === 0
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
    const priceNum = Number(offerPrice)
    if (!Number.isFinite(priceNum) || priceNum < 5) {
      setOfferError('Name a real price before you show up.')
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
      className="mx-auto max-w-[1160px] space-y-5 py-2 pb-16 sm:py-4"
      data-testid="request-detail-root"
    >
      <Link
        href="/browse"
        className="inline-flex min-h-[44px] items-center py-2 text-[13.5px] font-medium text-[#64748B] transition hover:text-[#071330]"
        data-testid="request-detail-back"
      >
        ← Back to browse
      </Link>

      <div
        className="lg:grid lg:grid-cols-[minmax(0,1.45fr)_minmax(360px,420px)] lg:items-start lg:gap-8 xl:gap-10"
        data-testid="request-detail-grid"
      >
        {/* Left column — task overview */}
        <div className="space-y-5" data-testid="request-detail-left">
          <article className={`overflow-hidden ${cardClass}`}>
            <div className="space-y-4 p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-[#F4F8FD] px-3 py-1.5 text-[12.5px] font-semibold text-[#071330]">
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
                          ? 'bg-[#F4F8FD] text-[#475569]'
                          : 'bg-[#F4F8FD] text-[#64748B]'
                  }`}
                >
                  {statusLabel(request.status)}
                </span>
                <span className="text-[12.5px] text-[#64748B]">
                  Posted {relativeTime(request.createdAt)}
                </span>
              </div>

              {isOwner && request.isUrgent ? (
                (request.urgentHelpersNotifiedCount ?? 0) > 0 ? (
                  <p
                    className="rounded-lg border border-[#D7E0EC] bg-[#F5F9FF] px-3.5 py-2.5 text-[13.5px] font-medium text-[#071330]"
                    data-testid="urgent-texted-helpers"
                  >
                    We texted{' '}
                    {pluralize(request.urgentHelpersNotifiedCount ?? 0, 'helper')} nearby
                  </p>
                ) : (
                  <p
                    className="rounded-lg border border-[#D7E0EC] bg-[#F5F9FF] px-3.5 py-2.5 text-[13.5px] font-medium text-[#071330]"
                    data-testid="urgent-texted-helpers-pending"
                  >
                    We&apos;ll text helpers nearby as they become available
                  </p>
                )
              ) : null}

              <h1 className="font-display text-[26px] font-bold leading-[1.15] tracking-[-0.025em] text-[#071330] sm:text-[32px]">
                {request.title}
              </h1>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[14px] text-[#475569]">
                <span className="inline-flex items-center gap-1.5 font-medium text-[#071330]">
                  {request.whenLabel}
                </span>
                <span aria-hidden className="text-[#CBD5E1]">
                  ·
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-[#94A3B8]" aria-hidden />
                  {locationLabel}
                </span>
              </div>

              {listingImages.length > 0 ? (
                <div className="mt-1 space-y-2" data-testid="request-detail-photos">
                  <div className="relative aspect-[16/10] max-h-[380px] w-full overflow-hidden rounded-lg bg-[#F4F8FD]">
                    <Image
                      src={coverImage ?? listingImages[0]}
                      alt=""
                      fill
                      sizes="(min-width:1024px) 640px, 100vw"
                      className="object-cover"
                      priority
                    />
                  </div>
                  {listingImages.length > 1 ? (
                    <ul className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                      {listingImages.map((src, i) => (
                        <li
                          key={`${src}-${i}`}
                          className="relative aspect-square overflow-hidden rounded-md bg-[#F4F8FD]"
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
              ) : null}

              <div className="border-t border-[#E2E8F0] pt-5">
                <h2 className="text-[13.5px] font-semibold text-[#071330]">About this task</h2>
                <p className="mt-2 whitespace-pre-wrap text-[15px] leading-[1.6] text-[#475569]">
                  {request.details}
                </p>
              </div>

              <div className="flex items-center gap-3 border-t border-[#E2E8F0] pt-5">
                <Avatar src={requester.avatar} name={requester.name} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-[#071330]">
                    {requester.name}
                    {isOwner ? ' (you)' : ''}
                  </p>
                  <p className="truncate text-[13px] text-[#64748B]">
                    {formatLocation(requester)}
                    {' · '}
                    {requester.rating > 0 && requester.reviewCount > 0
                      ? `★ ${requester.rating.toFixed(1)}`
                      : 'New'}
                    {' · '}
                    {requester.jobsCompleted} jobs
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

          {/* Nearby matches for owner — left column */}
          {isOwner && request.status === 'open' ? (
            <section className={`${cardClass} p-5 sm:p-6`} data-testid="request-nearby-matches">
              <h2 className="text-[18px] font-bold text-[#071330]">Instant Nearby Matches</h2>
              <p className="mt-1 text-[14px] text-[#64748B]">
                Ranked by skill, distance, and availability for this task.
              </p>

              {matches.length === 0 ? (
                <div className="mt-5 rounded-lg bg-[#F8FAFC] px-4 py-8 text-center">
                  <p className="text-[15px] font-semibold text-[#071330]">No matches in range</p>
                  <p className="mt-1 text-[13px] text-[#64748B]">
                    Helpers will appear as they come online nearby.
                  </p>
                </div>
              ) : (
                <ul className="mt-5 space-y-3">
                  {matches.map((match) => {
                    const { person } = match
                    const invited = invitedHelperIds.has(person.id)
                    return (
                      <li
                        key={person.id}
                        className="rounded-lg border border-[rgba(7,19,48,0.08)] bg-white p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <Link
                            href={`/people/${person.id}`}
                            className="flex min-w-0 items-center gap-3"
                          >
                            <Avatar src={person.avatar} name={person.name} size={44} />
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-[#071330]">{person.name}</p>
                              <p className="text-[12.5px] text-[#64748B]">
                                {authUser ? `${match.distanceMiles.toFixed(1)} mi · ` : ''}
                                {formatRate(person)}
                                {' · '}
                                {person.rating > 0 && person.reviewCount > 0
                                  ? `★ ${person.rating.toFixed(1)}`
                                  : 'New'}
                              </p>
                              {match.reasons.length ? (
                                <p className="mt-1 line-clamp-1 text-[12px] text-[#64748B]">
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

        {/* Right column — sticky action rail */}
        <aside
          className="mt-5 space-y-4 lg:sticky lg:top-24 lg:mt-0"
          data-testid="request-detail-right"
        >
          {/* Budget strip card (always) */}
          <div className={`${cardClass} p-5`} data-testid="request-budget-card">
            <p className="text-[13.5px] font-semibold text-[#071330]">Budget</p>
            <p
              className={`mt-1 font-display font-bold leading-none text-[#071330] ${
                isOpenBudget ? 'text-[20px]' : 'text-[28px] tabular-nums'
              }`}
            >
              {budgetLabel}
            </p>
            <p className="mt-2 text-[13px] leading-[1.45] text-[#64748B]">
              No lead fees · Agree in chat
            </p>
          </div>

          {justPosted && isOwner && request.status === 'open' ? (
            <div
              className="rounded-lg border border-[#D7E0EC] bg-[#F5F9FF] px-4 py-3.5 text-[14px] leading-relaxed text-[#071330]"
              role="status"
            >
              <p className="font-semibold text-[#071330]">Your request is live nearby.</p>
              <p className="mt-1">
                Nearby helpers can send offers now. Invite strong matches to speed things up.
              </p>
            </div>
          ) : null}

          {/* Owner open — incoming offers */}
          {isOwner && request.status === 'open' ? (
            <section className={`${cardClass} p-5`} data-testid="request-incoming-offers">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[18px] font-bold text-[#071330]">
                  Incoming {pluralNoun(offers.length === 1 ? 1 : 2, 'offer')}
                </h2>
                {offers.length > 0 ? (
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-[#EEF4FF] px-2 text-[12px] font-bold text-[#1D5CE5]">
                    {offers.length}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-[14px] text-[#64748B]">
                Accept when the price and timing feel right.
              </p>

              {offers.length === 0 ? (
                <div className="mt-5 rounded-lg bg-[#F8FAFC] px-4 py-8 text-center">
                  <p className="text-[15px] font-semibold text-[#071330]">No offers yet</p>
                  <p className="mt-1 text-[13px] text-[#64748B]">
                    Invite nearby matches. They’ll show up here when they name a price.
                  </p>
                </div>
              ) : (
                <ul className="mt-5 space-y-3">
                  {offers.map((offer) => {
                    const helper = getPerson(offer.helperId)
                    if (!helper) return null
                    return (
                      <li
                        key={offer.id}
                        className="rounded-lg border border-[rgba(7,19,48,0.08)] bg-white p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <Link
                            href={`/people/${helper.id}`}
                            className="flex min-w-0 items-center gap-3"
                          >
                            <Avatar src={helper.avatar} name={helper.name} size={40} />
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-[#071330]">{helper.name}</p>
                              <p className="text-[12.5px] text-[#64748B]">
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
                            <p className="text-[12px] font-semibold capitalize text-[#64748B]">
                              {offer.status}
                            </p>
                          </div>
                        </div>
                        {offer.note ? (
                          <p className="mt-3 text-[14px] leading-relaxed text-[#475569]">
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

              <div className="mt-5 border-t border-[#E2E8F0] pt-4">
                <ButtonLink href="/post" variant="secondary" className="w-full">
                  Post another task
                </ButtonLink>
              </div>
            </section>
          ) : null}

          {/* Helper open — send offer (gated until address verification is approved) */}
          {!isOwner && request.status === 'open' ? (
            <section className="space-y-3" data-testid="request-offer-panel">
              {myInvite ? (
                <div className="rounded-lg border border-[#D7E0EC] bg-[#F5F9FF] px-4 py-3 text-[14px] font-semibold text-[#071330]">
                  You were invited to offer on this task
                </div>
              ) : null}

              <div className={`${cardClass} p-5`}>
                {canMakeOffer(helperVerification) ? (
                  <>
                    <h2 className="text-[18px] font-bold text-[#071330]">
                      {myOffer ? 'Update your offer' : 'Send an offer'}
                    </h2>
                    <p className="mt-1 text-[14px] text-[#64748B]">
                      Name a price and ETA before you show up.
                    </p>

                    <form className="mt-5 space-y-4" onSubmit={(e) => void submitOffer(e)}>
                      <div>
                        <label
                          htmlFor="offer-price"
                          className="mb-2 block text-[13.5px] font-semibold text-[#071330]"
                        >
                          Your offer
                        </label>
                        <div className="relative flex h-12 items-center rounded-lg border border-[#E2E8F0] bg-white focus-within:border-[#1D5CE5] focus-within:ring-4 focus-within:ring-[#1D5CE5]/15">
                          <span className="pl-3.5 text-[15px] font-semibold text-[#64748B]" aria-hidden>
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
                            className="h-full w-full min-w-0 bg-transparent px-2 pr-3.5 text-[15px] font-semibold tabular-nums text-[#071330] outline-none placeholder:font-normal placeholder:text-[#94A3B8]"
                          />
                        </div>
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
                                    : 'border border-[#E2E8F0] bg-white text-[#071330] hover:bg-[#F8FAFC]'
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
                          <span className="font-normal text-[#64748B]">(optional)</span>
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
                        <p className="flex items-start gap-2 rounded-lg border border-[#D7E0EC] bg-[#F5F9FF] px-3 py-2 text-[14px] text-[#071330]" role="alert">
                          {offerError}
                        </p>
                      ) : null}

                      <div className="flex flex-col gap-2">
                        <Button
                          type="submit"
                          loading={offerPending}
                          className="h-12 w-full rounded-lg bg-[#1D5CE5] text-white shadow-none hover:bg-[#1649BD]"
                        >
                          <Send className="h-4 w-4" />
                          {myOffer ? 'Update offer' : 'Submit offer'}
                        </Button>
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
                    <h2 className="text-[18px] font-bold text-[#071330]">Verification required</h2>
                    <p className="mt-1 text-[14px] text-[#64748B]">
                      Offering unlocks after HouseCall confirms you&apos;re at your home address.
                    </p>
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

          {/* Accepted — booked summary */}
          {request.status === 'accepted' && (isOwner || isAcceptedHelper) ? (
            <section className={`${cardClass} p-5`} data-testid="request-booked-panel">
              <p className="text-[13.5px] font-semibold text-[#071330]">You’re booked</p>
              <p className="mt-1 text-[14px] text-[#64748B]">
                Coordinate in chat and agree how you’ll pay peer-to-peer.
              </p>

              <dl className="mt-5 space-y-4">
                <div>
                  <dt className="text-[13px] font-semibold text-[#64748B]">Confirmed helper</dt>
                  <dd className="mt-1.5 flex items-center gap-2.5">
                    {acceptedHelper ? (
                      <>
                        <Avatar src={acceptedHelper.avatar} name={acceptedHelper.name} size={36} />
                        <span className="font-semibold text-[#071330]">{acceptedHelper.name}</span>
                      </>
                    ) : (
                      <span className="text-[#64748B]">Not set</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-[13px] font-semibold text-[#64748B]">Agreed price</dt>
                  <dd className="mt-1.5 font-display text-[24px] font-bold tabular-nums text-[#071330]">
                    {acceptedOffer ? formatMoney(acceptedOffer.price) : 'Not set'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[13px] font-semibold text-[#64748B]">ETA</dt>
                  <dd className="mt-1.5 font-semibold text-[#071330]">
                    {acceptedOffer?.eta ?? request.whenLabel}
                  </dd>
                </div>
                <div>
                  <dt className="text-[13px] font-semibold text-[#64748B]">Location</dt>
                  <dd className="mt-1.5 font-semibold text-[#071330]">{locationLabel}</dd>
                </div>
                {canSeeExactAddress && request.exactAddress ? (
                  <div>
                    <dt className="text-[13px] font-semibold text-[#64748B]">Exact address</dt>
                    <dd className="mt-1.5 font-semibold text-[#071330]">{request.exactAddress}</dd>
                  </div>
                ) : null}
              </dl>

              <div className="mt-5 rounded-lg border border-[#D7E0EC] bg-[#F5F9FF] px-4 py-3 text-[13.5px] leading-relaxed text-[#071330]">
                Pay your helper peer-to-peer (Venmo, cash, Zelle, etc.). HouseCall doesn’t process
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
              </div>
            </section>
          ) : null}

          {/* Completed — mutual review */}
          {request.status === 'completed' ? (
            <section className={`${cardClass} p-5`} data-testid="request-review-panel">
              <h2 className="text-[18px] font-bold text-[#071330]">Mutual review</h2>
              <p className="mt-1 text-[14px] text-[#64748B]">
                Rate your experience so neighbors know who to trust next time.
              </p>

              {existingReview ? (
                <div className="mt-5 rounded-lg bg-[#F8FAFC] px-4 py-4">
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
                    <p className="mt-2 text-[14px] text-[#475569]" data-testid="review-comment-text">
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
                            ? 'border-[#071330] bg-[#F5F9FF] text-[#071330]'
                            : 'border-[rgba(7,19,48,0.12)] bg-white text-[#64748B]'
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
                      Comment <span className="font-normal text-[#64748B]">(optional)</span>
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
                <p className="mt-4 text-[14px] text-[#64748B]">
                  Only the people on this job can review.
                </p>
              )}

              {isOwner && acceptedHelper ? (
                <div className="mt-6 flex flex-col gap-2 border-t border-[#E2E8F0] pt-5">
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
