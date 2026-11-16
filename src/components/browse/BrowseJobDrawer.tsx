'use client'

import {
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
import { JobTitleText } from '@/lib/displayTitle'
import {
  formatMoney,
  hasListedPrice,
  relativeTime,
  requestAcceptsOffers,
} from '@/lib/matching'
import { listingCoverImage, normalizeListingImages } from '@/lib/listingPhotos'
import { isHelperPerson } from '@/lib/roles'
import { formatCategoryLabel } from '@/lib/taxonomy'
import { canMakeOffer, offerGateKind } from '@/lib/verification/status'
import type { HelpRequest } from '@/types'
import { CancelJobAction } from '@/components/jobs/CancelJobAction'
import { CancelOfferAction } from '@/components/jobs/CancelOfferAction'
import { dangerOutlineButtonClass } from '@/components/ui/button'
import { JobAreaMap } from '@/components/jobs/JobAreaMap'
import { JobDetailPhoto } from '@/components/jobs/JobDetailPhoto'
import { JobDetailPriceLine } from '@/components/jobs/JobDetailPriceLine'
import { JobSaveButton } from '@/components/jobs/JobSaveButton'
import { formatJobDetailsDisplay } from '@/lib/displayDetails'
import { formatJobAreaCaption } from '@/lib/location'
import { BrowseCategoryThumb } from './BrowseCategoryThumb'
import {
  ReferHelperButton,
  ReferHelperHint,
  useReferHelperShare,
} from './ReferHelperActions'
import { useFocusTrap } from './useFocusTrap'

const ETA_CHIPS = ['Within 30 min', 'Within 1 hour', 'Today afternoon', 'Flexible'] as const

export function BrowseJobDrawer({
  request,
  narrow,
  milesLabel,
  areaLabel,
  authHref,
  onClose,
}: {
  request: HelpRequest
  narrow: boolean
  milesLabel: string | null
  areaLabel: string
  /** Viewer browse city; kept for Browse callers, not used for job captions. */
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
  const isNeighborViewer = !isGuest && !isOwner && !isHelperPerson(currentUser)
  const myOffer = state.offers.find(
    (o) =>
      o.requestId === request.id &&
      o.helperId === currentUser.id &&
      o.status !== 'withdrawn' &&
      o.status !== 'declined',
  )
  const verified = canMakeOffer(helperVerification)
  const gateKind = offerGateKind(helperVerification)
  const { referHelper, dialog: referDialog } = useReferHelperShare(
    request.id,
    request.title,
    request.requesterId,
  )
  const [offerOpen, setOfferOpen] = useState(false)
  const [offerPrice, setOfferPrice] = useState(() =>
    myOffer ? String(myOffer.price) : request.budget > 0 ? String(Math.round(request.budget)) : '',
  )
  const [offerNote, setOfferNote] = useState(myOffer?.note ?? '')
  const [offerEta, setOfferEta] = useState(myOffer?.eta ?? 'Within 1 hour')
  const [offerError, setOfferError] = useState('')
  const [offerPending, setOfferPending] = useState(false)
  const [askPending, setAskPending] = useState(false)

  const images = normalizeListingImages(request.images, request.image)
  const cover = listingCoverImage(images)
  const categoryLabel = formatCategoryLabel(request.category, request.categoryCustom)
  const listedPrice = hasListedPrice(request)
  const firmPrice = listedPrice && !requestAcceptsOffers(request)
  const firmPriceAmount = listedPrice ? Math.round(request.budget) : 0
  const firstName = requester?.name?.split(/\s+/)[0] || 'a neighbor'
  const posted = relativeTime(request.createdAt)
  const jobAreaCaption = formatJobAreaCaption(request)
  // Job area only; never combine with the viewer browse city (guest "you").
  const place =
    areaLabel && areaLabel.toLowerCase() !== 'you' && areaLabel.toLowerCase() !== 'your area'
      ? areaLabel
      : jobAreaCaption.split(',')[0]?.trim() || jobAreaCaption || 'Nearby'
  const canOffer = !isOwner && request.status === 'open'
  const ownerCanCancel =
    isOwner && (request.status === 'open' || request.status === 'accepted')
  /** Source of truth for the sent-offer footer: a pending offer from this helper on an open job. */
  const pendingOffer =
    canOffer && !isGuest && myOffer?.status === 'pending' ? myOffer : undefined
  const locationLine = jobAreaCaption

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
      const priceNum = firmPrice ? firmPriceAmount : Number(offerPrice)
      if (!Number.isFinite(priceNum) || priceNum < 5) {
        setOfferError('Name a real price before you show up.')
        setOfferOpen(true)
        return
      }
      if (firmPrice && Math.round(priceNum) !== firmPriceAmount) {
        setOfferError(`This job has a firm price of $${firmPriceAmount}.`)
        setOfferOpen(true)
        return
      }
      setOfferPending(true)
      setOfferError('')
      try {
        await createOffer({
          requestId: request.id,
          price: priceNum,
          note: offerNote.trim(),
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
    [milesLabel, place, request.when, request.whenLabel],
  )

  const body = (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <JobDetailPhoto
        src={cover}
        showBottomScrim
        fallback={
          <BrowseCategoryThumb
            categoryId={request.category}
            size="hero"
            className="!aspect-auto h-full w-full !rounded-none"
          />
        }
      >
        <div className="browse-hc-photo-caption">
          {categoryLabel} · Posted {posted}
        </div>
        <JobSaveButton requestId={request.id} testId="browse-drawer-job-save" />
      </JobDetailPhoto>

      <div
        className={
          narrow
            ? 'flex flex-col gap-[22px] px-[18px] pb-6 pt-3.5'
            : 'flex flex-col gap-7 px-6 pb-7 pt-[18px]'
        }
      >
        <div>
          <span className="inline-flex h-6 items-center rounded-md border border-[#E3E8EF] bg-white px-2.5 text-[12px] font-semibold tracking-[-0.01em] text-[#123E9E]">
            {categoryLabel}
          </span>
          <h2
            id={titleId}
            className={`mt-3 font-bold leading-[1.18] tracking-[-0.028em] text-[#071330] [text-wrap:balance] ${
              narrow ? 'text-[22px]' : 'text-[24px]'
            }`}
          >
            <JobTitleText title={request.title} />
          </h2>
          <JobDetailPriceLine
            request={request}
            className="mt-2"
            testId="browse-drawer-job-price"
          />
          <p className="mt-2 text-[14px] text-[#273449]">
            Posted {posted} by {firstName} · {place}
          </p>
        </div>

        <dl className="border-y border-[#E3E8EF]">
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

        <JobAreaMap
          jobId={request.id}
          lat={request.lat}
          lng={request.lng}
          locationLabel={request.locationLabel}
          neighborhood={request.neighborhood}
          city={request.city}
          radiusMiles={request.radiusMiles}
          height={narrow ? 160 : 180}
        />

        <section>
          <h3 className="text-[15px] font-bold tracking-[-0.015em] text-[#071330]">About this job</h3>
          <p className="mt-2.5 whitespace-pre-wrap text-[15px] leading-[1.65] text-[#273449]">
            {formatJobDetailsDisplay(request.details)}
          </p>
        </section>

        <section>
          <h3 className="text-[15px] font-bold tracking-[-0.015em] text-[#071330]">Location</h3>
          <div className="mt-2.5 flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-[#1D5CE5]">
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

        {offerOpen && canOffer && !isNeighborViewer && verified ? (
          <form
            className="space-y-3 rounded-[10px] border border-[#E3E8EF] p-4"
            data-testid="browse-drawer-offer"
            onSubmit={(e) => {
              e.preventDefault()
              void submitOffer()
            }}
          >
            <p className="text-[15px] font-bold text-[#071330]">
              {myOffer ? 'Update your offer' : 'Your offer'}
            </p>
            {firmPrice ? (
              <div
                className="flex h-11 items-center rounded-[10px] border border-[#D7E0EC] bg-[#F7F9FC] px-3 text-[15px] font-semibold tabular-nums text-[#071330]"
                data-testid="browse-offer-firm-price"
              >
                Firm price ${firmPriceAmount}
              </div>
            ) : (
              <>
                <label className="block text-[13px] font-semibold text-[#071330]" htmlFor="browse-offer-price">
                  Price
                </label>
                <div className="flex h-11 items-center rounded-[10px] border border-[#D7E0EC] px-3 focus-within:border-[#1D5CE5] focus-within:ring-[3px] focus-within:ring-[#1D5CE5]/15">
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
              </>
            )}
            <div className="flex flex-wrap gap-2">
              {ETA_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setOfferEta(chip)}
                  className={`h-9 rounded-[9px] px-3 text-[13px] font-semibold ${
                    offerEta === chip
                      ? 'bg-[#071330] text-white'
                      : 'border border-[#D7E0EC] text-[#071330]'
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
              className="w-full rounded-[10px] border border-[#D7E0EC] px-3 py-2 text-[14px] text-[#071330] outline-none focus:border-[#1D5CE5]"
            />
            {offerError ? <p className="text-[13px] font-medium rounded-lg border border-[#D7E0EC] bg-white px-3 py-2 text-[#071330]">{offerError}</p> : null}
          </form>
        ) : null}
        {pendingOffer && !offerOpen ? (
          <p className="text-[14px] font-semibold text-[#071330]" data-testid="browse-offer-sent">
            Offer sent. You can keep coordinating from Messages.
          </p>
        ) : null}
        {offerError && !offerOpen ? (
          <p className="text-[13px] font-medium rounded-lg border border-[#D7E0EC] bg-white px-3 py-2 text-[#071330]" role="alert" data-testid="browse-offer-error">
            {offerError}
          </p>
        ) : null}
      </div>
    </div>
  )

  const showHelperOfferChrome = canOffer && !isNeighborViewer

  const askButton = showHelperOfferChrome ? (
    <button
      type="button"
      data-testid="browse-ask-question"
      disabled={askPending}
      onClick={() => void askQuestion()}
      className={`inline-flex h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-[#D7E0EC] bg-white px-4 text-[14px] font-semibold tracking-[-0.01em] text-[#071330] hover:bg-white disabled:opacity-60 ${
        narrow ? 'w-full' : 'shrink-0'
      }`}
      aria-label="Ask a question"
    >
      <MessageCircle className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
      Ask a question
    </button>
  ) : null

  const primaryButton = pendingOffer && !offerOpen ? (
    <CancelOfferAction
      offerId={pendingOffer.id}
      testId="browse-cancel-offer"
      className={narrow ? 'w-full' : 'min-w-0 shrink-0'}
      buttonClassName={`inline-flex h-11 items-center justify-center whitespace-nowrap rounded-lg border border-[#D7E0EC] bg-white px-[18px] text-[14px] font-semibold tracking-[-0.01em] text-[#071330] hover:bg-[#EEF2F7] disabled:cursor-not-allowed disabled:opacity-60 ${
        narrow ? 'w-full' : 'shrink-0'
      }`}
      showInlineError={false}
      onCancelled={() => {
        setOfferOpen(false)
        setOfferError('')
        setOfferPrice(request.budget > 0 ? String(Math.round(request.budget)) : '')
        setOfferNote('')
        setOfferEta('Within 1 hour')
      }}
      onError={(message) => setOfferError(message)}
    />
  ) : showHelperOfferChrome && !isGuest && !verified && gateKind !== 'approved' ? (
    <OfferGatePrimaryButton kind={gateKind} narrow={narrow} />
  ) : showHelperOfferChrome ? (
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
      {offerOpen ? (offerPending ? 'Sending…' : 'Send offer') : 'Make an offer'}
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
    showHelperOfferChrome && !isGuest && !verified ? (
      <OfferGateNotice verification={helperVerification} narrow={narrow} />
    ) : null

  const referActions = (
    <div className="flex w-full flex-col gap-2">
      <ReferHelperButton onClick={() => void referHelper()} />
      <ReferHelperHint />
    </div>
  )

  const ownerCancelButton = ownerCanCancel ? (
    <CancelJobAction
      request={request}
      className={narrow ? 'w-full' : 'min-w-0 shrink-0'}
      buttonClassName={`${dangerOutlineButtonClass}${
        narrow ? ' w-full' : ' shrink-0'
      }`}
      onCancelled={onClose}
    />
  ) : null

  const footerPrice = listedPrice ? (
    <div className="flex flex-wrap items-center gap-2">
      <b className="text-[18px] font-bold tracking-[-0.03em] text-[#071330] tabular-nums">
        {formatMoney(request.budget)}
      </b>
      {requestAcceptsOffers(request) ? (
        <span className="inline-flex items-center rounded-md bg-[#EEF2F7] px-2 py-0.5 text-[12px] font-semibold text-[#071330]">
          Open to offers
        </span>
      ) : (
        <span className="text-[12px] font-medium text-[#3D4A5F]">Firm price</span>
      )}
    </div>
  ) : (
    <span className="inline-flex items-center rounded-md bg-[#EEF2F7] px-2 py-0.5 text-[12px] font-semibold text-[#071330]">
      Open to offers
    </span>
  )

  const actions = narrow ? (
    <div className="flex shrink-0 flex-col gap-2 border-t border-[#E3E8EF] bg-white px-4 pb-4 pt-2.5">
      {gateNotice}
      {footerPrice}
      {canOffer && isNeighborViewer ? (
        referActions
      ) : showHelperOfferChrome ? (
        <div className="grid grid-cols-2 gap-2">
          {askButton}
          {primaryButton}
        </div>
      ) : ownerCanCancel ? (
        <div className="grid grid-cols-2 gap-2" data-testid="browse-owner-controls">
          {ownerCancelButton}
          {primaryButton}
        </div>
      ) : (
        primaryButton
      )}
      {referDialog}
    </div>
  ) : (
    <div className="flex shrink-0 flex-col gap-0 border-t border-[#E3E8EF] bg-white">
      {gateNotice ? <div className="px-5 pt-3 pl-6">{gateNotice}</div> : null}
      {canOffer && isNeighborViewer ? (
        <div className="px-5 py-3.5 pl-6">
          {referActions}
          {referDialog}
        </div>
      ) : (
        <div
          className="flex items-center gap-2.5 px-5 py-3.5 pl-6"
          data-testid={ownerCanCancel ? 'browse-owner-controls' : undefined}
        >
          <div className="min-w-0 shrink leading-tight">{footerPrice}</div>
          <div className="min-w-2 flex-1" />
          {ownerCanCancel ? ownerCancelButton : askButton}
          {primaryButton}
        </div>
      )}
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
  'grid h-9 w-9 place-items-center rounded-lg text-[#071330] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/40'
