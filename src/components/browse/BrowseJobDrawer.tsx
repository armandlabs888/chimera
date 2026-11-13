'use client'

import {
  Banknote,
  Calendar,
  ExternalLink,
  MapPin,
  MessageCircle,
  Share2,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useId, useMemo, useRef, useState } from 'react'
import { useMessagesDrawer } from '@/components/messages/useMessagesDrawer'
import {
  OfferGateNotice,
  OfferGatePrimaryButton,
} from '@/components/verification/OfferGateFooter'
import { useBeam } from '@/context/BeamContext'
import { formatBudget, relativeTime } from '@/lib/matching'
import { listingCoverImage, normalizeListingImages } from '@/lib/listingPhotos'
import { formatCategoryLabel } from '@/lib/taxonomy'
import { canMakeOffer, offerGateKind } from '@/lib/verification/status'
import type { HelpRequest } from '@/types'
import { BrowseCategoryThumb } from './BrowseCategoryThumb'
import { useFocusTrap } from './useFocusTrap'

const ETA_CHIPS = ['Within 30 min', 'Within 1 hour', 'Today afternoon', 'Flexible'] as const

export function BrowseJobDrawer({
  request,
  narrow,
  milesLabel,
  areaLabel,
  cityName,
  authHref,
  onClose,
}: {
  request: HelpRequest
  narrow: boolean
  milesLabel: string | null
  areaLabel: string
  cityName: string
  authHref: string
  onClose: () => void
}) {
  const router = useRouter()
  const { openThread } = useMessagesDrawer()
  const {
    state,
    currentUser,
    mode,
    authUser,
    createOffer,
    withdrawOffer,
    ensureThread,
    helperVerification,
  } = useBeam()
  const isGuest = mode === 'live' && !authUser
  const panelRef = useRef<HTMLElement>(null)
  const titleId = useId()
  const close = useCallback(() => onClose(), [onClose])
  useFocusTrap(true, panelRef, close)

  const requester = state.people.find((p) => p.id === request.requesterId)
  const isOwner = request.requesterId === currentUser.id
  const myOffer = state.offers.find(
    (o) => o.requestId === request.id && o.helperId === currentUser.id && o.status !== 'withdrawn',
  )
  const verified = canMakeOffer(helperVerification)
  const gateKind = offerGateKind(helperVerification)
  const [offerOpen, setOfferOpen] = useState(false)
  const [offerPrice, setOfferPrice] = useState(() =>
    myOffer ? String(myOffer.price) : request.budget > 0 ? String(Math.round(request.budget)) : '',
  )
  const [offerNote, setOfferNote] = useState(myOffer?.note ?? '')
  const [offerEta, setOfferEta] = useState(myOffer?.eta ?? 'Within 1 hour')
  const [offerError, setOfferError] = useState('')
  const [offerPending, setOfferPending] = useState(false)
  const [cancelPending, setCancelPending] = useState(false)
  const [askPending, setAskPending] = useState(false)

  const images = normalizeListingImages(request.images, request.image)
  const cover = listingCoverImage(images)
  const categoryLabel = formatCategoryLabel(request.category, request.categoryCustom)
  const budgetLabel = formatBudget(request)
  const openBudget = request.budgetType === 'open' || request.budget === 0
  const firstName = requester?.name?.split(/\s+/)[0] || 'a neighbor'
  const posted = relativeTime(request.createdAt)
  const place = areaLabel || cityName || 'Nearby'
  const canOffer = !isOwner && request.status === 'open'
  /** Source of truth for the sent-offer footer: a pending offer from this helper on an open job. */
  const pendingOffer =
    canOffer && !isGuest && myOffer?.status === 'pending' ? myOffer : undefined
  const locationLine =
    cityName && place !== cityName ? `${place}, ${cityName}` : place

  const fullHref = `/requests/${request.id}`

  async function requireAuth(run: () => Promise<void> | void) {
    if (isGuest) {
      router.push(authHref)
      return
    }
    await run()
  }

  async function askQuestion() {
    await requireAuth(async () => {
      setAskPending(true)
      try {
        const threadId = await ensureThread(request.id, request.requesterId)
        openThread(threadId)
      } finally {
        setAskPending(false)
      }
    })
  }

  async function submitOffer() {
    await requireAuth(async () => {
      const priceNum = Number(offerPrice)
      if (!Number.isFinite(priceNum) || priceNum < 5) {
        setOfferError('Name a real price before you show up.')
        setOfferOpen(true)
        return
      }
      setOfferPending(true)
      setOfferError('')
      try {
        await createOffer({
          requestId: request.id,
          price: priceNum,
          note: offerNote.trim() || 'Happy to help. Message me to coordinate.',
          eta: offerEta,
        })
        await ensureThread(request.id, request.requesterId)
        setOfferOpen(false)
      } catch (err) {
        setOfferError(err instanceof Error ? err.message : 'Could not send offer')
      } finally {
        setOfferPending(false)
      }
    })
  }

  async function cancelOffer() {
    if (!pendingOffer || cancelPending) return
    setCancelPending(true)
    setOfferError('')
    try {
      await withdrawOffer(pendingOffer.id)
      setOfferOpen(false)
    } catch (err) {
      setOfferError(err instanceof Error ? err.message : 'Could not cancel offer')
    } finally {
      setCancelPending(false)
    }
  }

  async function share() {
    const url = `${window.location.origin}${fullHref}`
    try {
      if (navigator.share) {
        await navigator.share({ title: request.title, url })
        return
      }
    } catch {
      // User dismissed the share sheet.
    }
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // Clipboard may be blocked; the full-page link remains.
    }
  }

  const facts = useMemo(
    () => [
      {
        label: 'Budget',
        icon: Banknote,
        value: budgetLabel,
        detail: openBudget ? 'Open to offers' : 'Customer budget',
      },
      {
        label: 'When',
        icon: Calendar,
        value: request.whenLabel || 'Flexible',
        detail: request.when === 'asap' ? 'Looking for help now' : 'Requested timing',
      },
      {
        label: 'Distance',
        icon: MapPin,
        value: milesLabel || 'Nearby',
        detail: place,
      },
    ],
    [budgetLabel, milesLabel, openBudget, place, request.when, request.whenLabel],
  )

  const body = (
    <div className="min-h-0 flex-1 overflow-y-auto">
      {cover ? (
        // Listing photos may be arbitrary HTTPS hosts — plain img matches Browse rows.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover}
          alt=""
          className={`w-full object-cover ${narrow ? 'h-[148px]' : 'h-[210px]'}`}
        />
      ) : (
        <div className={narrow ? 'h-[148px]' : 'h-[210px]'}>
          <BrowseCategoryThumb
            categoryId={request.category}
            size="hero"
            className="!aspect-auto h-full w-full !rounded-none"
          />
        </div>
      )}

      <div className={narrow ? 'px-[18px] pb-6 pt-3.5' : 'px-6 pb-7 pt-[18px]'}>
        <span className="inline-flex h-6 items-center rounded-md border border-[#D6E2F5] bg-[#F4F8FD] px-2.5 text-[12px] font-semibold tracking-[-0.01em] text-[#123E9E]">
          {categoryLabel}
        </span>
        <h2
          id={titleId}
          className={`mt-3 font-bold leading-[1.18] tracking-[-0.028em] text-[#071330] ${
            narrow ? 'text-[22px]' : 'text-[24px]'
          }`}
        >
          {request.title}
        </h2>
        <p className="mt-2 text-[14px] text-[#273449]">
          Posted {posted} by {firstName} · {place}
        </p>

        <dl className={`mt-5 border-y border-[#E3E8EF] ${narrow ? '' : ''}`}>
          {facts.map((fact) => (
            <div
              key={fact.label}
              className="grid grid-cols-[22px_88px_minmax(0,1fr)] items-start gap-2.5 border-b border-[#E3E8EF] py-3 last:border-b-0"
            >
              <fact.icon
                className="mt-0.5 h-4 w-4 text-[#1D5CE5]"
                strokeWidth={2}
                aria-hidden
              />
              <dt className="pt-0.5 text-[12.5px] font-semibold uppercase tracking-[0.04em] text-[#3D4A5F]">
                {fact.label}
              </dt>
              <dd className="text-right text-[15px] font-semibold leading-snug tracking-[-0.015em] text-[#071330]">
                {fact.value}
                <small className="mt-0.5 block text-[13px] font-medium tracking-normal text-[#273449]">
                  {fact.detail}
                </small>
              </dd>
            </div>
          ))}
        </dl>

        <section className="mt-[22px]">
          <h3 className="text-[15px] font-bold tracking-[-0.015em] text-[#071330]">About this job</h3>
          <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-[#273449]">
            {request.details}
          </p>
        </section>

        <section className="mt-[22px]">
          <h3 className="text-[15px] font-bold tracking-[-0.015em] text-[#071330]">Location</h3>
          <div className="mt-2.5 flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#F4F8FD] text-[#1D5CE5]">
              <MapPin className="h-4 w-4" strokeWidth={2} aria-hidden />
            </span>
            <span className="min-w-0 pt-px">
              <span className="block text-[15px] font-semibold tracking-[-0.01em] text-[#071330]">
                {locationLine}
              </span>
              <span className="mt-0.5 block text-[13.5px] leading-snug text-[#3D4A5F]">
                Exact address is shared after your offer is accepted.
              </span>
            </span>
          </div>
        </section>

        {offerOpen && canOffer && verified ? (
          <form
            className="mt-6 space-y-3 rounded-[10px] border border-[#E3E8EF] p-4"
            data-testid="browse-drawer-offer"
            onSubmit={(e) => {
              e.preventDefault()
              void submitOffer()
            }}
          >
            <p className="text-[15px] font-bold text-[#071330]">
              {myOffer ? 'Update your offer' : 'Your offer'}
            </p>
            <label className="block text-[13px] font-semibold text-[#071330]" htmlFor="browse-offer-price">
              Price
            </label>
            <div className="flex h-11 items-center rounded-[10px] border border-[#CDD5E0] px-3 focus-within:border-[#1D5CE5] focus-within:ring-[3px] focus-within:ring-[#1D5CE5]/15">
              <span className="text-[15px] font-semibold text-[#3D4A5F]" aria-hidden>
                $
              </span>
              <input
                id="browse-offer-price"
                inputMode="numeric"
                value={offerPrice}
                onChange={(e) => setOfferPrice(e.target.value.replace(/[^\d]/g, '').slice(0, 5))}
                className="h-full w-full bg-transparent px-2 text-[15px] font-semibold text-[#071330] outline-none"
                data-testid="browse-offer-price"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {ETA_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setOfferEta(chip)}
                  className={`h-9 rounded-[9px] px-3 text-[13px] font-semibold ${
                    offerEta === chip
                      ? 'bg-[#071330] text-white'
                      : 'border border-[#CDD5E0] text-[#071330]'
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>
            <label className="block text-[13px] font-semibold text-[#071330]" htmlFor="browse-offer-note">
              Note
            </label>
            <textarea
              id="browse-offer-note"
              value={offerNote}
              onChange={(e) => setOfferNote(e.target.value)}
              rows={3}
              className="w-full rounded-[10px] border border-[#CDD5E0] px-3 py-2 text-[14px] text-[#071330] outline-none focus:border-[#1D5CE5]"
            />
            {offerError ? <p className="text-[13px] font-medium text-[#DC2626]">{offerError}</p> : null}
            <button
              type="submit"
              disabled={offerPending}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-[#1D5CE5] px-4 text-[14px] font-semibold text-white hover:bg-[#1649BD] disabled:opacity-60"
            >
              {offerPending ? 'Sending…' : myOffer ? 'Update offer' : 'Send offer'}
            </button>
          </form>
        ) : null}
        {pendingOffer && !offerOpen ? (
          <p className="mt-4 text-[14px] font-semibold text-[#071330]" data-testid="browse-offer-sent">
            Offer sent. You can keep coordinating from Messages.
          </p>
        ) : null}
        {offerError && !offerOpen ? (
          <p className="mt-3 text-[13px] font-medium text-[#DC2626]" role="alert" data-testid="browse-offer-error">
            {offerError}
          </p>
        ) : null}
      </div>
    </div>
  )

  const askButton = canOffer ? (
    <button
      type="button"
      data-testid="browse-ask-question"
      disabled={askPending}
      onClick={() => void askQuestion()}
      className={`inline-flex h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-[#CDD5E0] bg-white px-4 text-[14px] font-semibold tracking-[-0.01em] text-[#071330] hover:bg-[#F4F8FD] disabled:opacity-60 ${
        narrow ? 'w-full' : 'shrink-0'
      }`}
      aria-label="Ask a question"
    >
      <MessageCircle className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
      Ask a question
    </button>
  ) : null

  const primaryButton = pendingOffer && !offerOpen && verified ? (
    <button
      type="button"
      data-testid="browse-cancel-offer"
      disabled={cancelPending}
      aria-busy={cancelPending || undefined}
      onClick={() => void cancelOffer()}
      className={`inline-flex h-11 items-center justify-center whitespace-nowrap rounded-lg border-[1.5px] border-[#DC2626] bg-white px-[18px] text-[14px] font-semibold tracking-[-0.01em] text-[#B91C1C] hover:bg-[#FEF2F2] disabled:cursor-not-allowed disabled:opacity-60 ${
        narrow ? 'w-full' : 'shrink-0'
      }`}
    >
      {cancelPending ? 'Canceling…' : 'Cancel offer'}
    </button>
  ) : canOffer && !isGuest && !verified && gateKind !== 'approved' ? (
    <OfferGatePrimaryButton kind={gateKind} narrow={narrow} />
  ) : canOffer ? (
    <button
      type="button"
      data-testid="browse-make-offer"
      onClick={() => {
        if (isGuest) {
          router.push(authHref)
          return
        }
        if (!verified) {
          router.push('/verify')
          return
        }
        if (offerOpen) void submitOffer()
        else setOfferOpen(true)
      }}
      className={`inline-flex h-11 items-center justify-center whitespace-nowrap rounded-lg bg-[#1D5CE5] px-[18px] text-[14px] font-semibold tracking-[-0.01em] text-white hover:bg-[#1649BD] ${
        narrow ? 'w-full' : 'shrink-0'
      }`}
    >
      {offerOpen ? 'Send offer' : 'Make an offer'}
    </button>
  ) : (
    <Link
      href={fullHref}
      className={`inline-flex h-11 items-center justify-center whitespace-nowrap rounded-lg bg-[#1D5CE5] px-[18px] text-[14px] font-semibold text-white hover:bg-[#1649BD] ${
        narrow ? 'w-full' : 'shrink-0'
      }`}
    >
      {isOwner ? 'View your listing' : 'Open full page'}
    </Link>
  )

  const gateNotice =
    canOffer && !isGuest && !verified ? (
      <OfferGateNotice verification={helperVerification} narrow={narrow} />
    ) : null

  const actions = narrow ? (
    <div className="flex shrink-0 flex-col gap-2 border-t border-[#E3E8EF] bg-white px-4 pb-4 pt-2.5">
      {gateNotice}
      <div className="flex items-baseline gap-2">
        <b className="text-[18px] font-bold tracking-[-0.03em] text-[#071330]">{budgetLabel}</b>
        <span className="text-[13px] font-medium text-[#3D4A5F]">Customer budget</span>
      </div>
      {canOffer ? (
        <div className="grid grid-cols-2 gap-2">
          {askButton}
          {primaryButton}
        </div>
      ) : (
        primaryButton
      )}
    </div>
  ) : (
    <div className="flex shrink-0 flex-col gap-0 border-t border-[#E3E8EF] bg-white">
      {gateNotice ? <div className="px-5 pt-3 pl-6">{gateNotice}</div> : null}
      <div className="flex items-center gap-2.5 px-5 py-3.5 pl-6">
        <div className="min-w-0 shrink leading-tight">
          <b className="block truncate text-[18px] font-bold tracking-[-0.03em] text-[#071330]">
            {budgetLabel}
          </b>
          <span className="block whitespace-nowrap text-[12px] font-medium text-[#3D4A5F]">
            Customer budget
          </span>
        </div>
        <div className="min-w-2 flex-1" />
        {askButton}
        {primaryButton}
      </div>
    </div>
  )

  const toolbar = (
    <div className="flex items-center gap-0">
      <button type="button" className={iconBtn} aria-label="Share" onClick={() => void share()}>
        <Share2 className="h-[18px] w-[18px]" strokeWidth={1.9} />
      </button>
      <Link href={fullHref} className={iconBtn} aria-label="Open full page" data-testid="browse-open-full-page">
        <ExternalLink className="h-[18px] w-[18px]" strokeWidth={1.9} />
      </Link>
      <button
        type="button"
        className={iconBtn}
        aria-label="Close"
        onClick={onClose}
        data-testid="browse-drawer-close"
      >
        <X className="h-[18px] w-[18px]" strokeWidth={1.9} />
      </button>
    </div>
  )

  if (narrow) {
    return (
      <div className="fixed inset-0 z-[80]" data-browse-job-layer="sheet">
        <section
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          data-testid="browse-job-sheet"
          className="absolute inset-0 flex flex-col bg-white outline-none"
        >
          <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-[#E3E8EF] pl-[18px] pr-1.5">
            <span className="text-[15px] font-semibold tracking-[-0.01em] text-[#071330]">
              Job details
            </span>
            {toolbar}
          </div>
          {body}
          {actions}
        </section>
      </div>
    )
  }

  return (
    <aside
      ref={panelRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-testid="browse-job-drawer"
      data-browse-job-layer="drawer"
      className="fixed bottom-0 right-0 top-0 z-[80] flex w-[500px] max-w-full flex-col border-l border-[#E3E8EF] bg-white outline-none"
    >
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#E3E8EF] pl-[22px] pr-2.5">
        <span className="text-[14.5px] font-semibold tracking-[-0.01em] text-[#071330]">
          Job details
        </span>
        {toolbar}
      </div>
      {body}
      {actions}
    </aside>
  )
}

const iconBtn =
  'grid h-9 w-9 place-items-center rounded-lg text-[#071330] transition hover:bg-[#F4F8FD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/40'
