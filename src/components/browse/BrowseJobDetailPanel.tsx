'use client'

import { Clock, MapPin } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'
import { JobSaveButton } from '@/components/jobs/JobSaveButton'
import { useMessagesDrawer } from '@/components/messages/useMessagesDrawer'
import {
  OfferGateNotice,
  OfferGatePrimaryButton,
} from '@/components/verification/OfferGateFooter'
import { useBeam } from '@/context/BeamContext'
import { JobTitleText } from '@/lib/displayTitle'
import {
  hasListedPrice,
  relativeTime,
  requestAcceptsOffers,
} from '@/lib/matching'
import { listingCoverImage, normalizeListingImages } from '@/lib/listingPhotos'
import { isHelperPerson } from '@/lib/roles'
import { formatCategoryLabel } from '@/lib/taxonomy'
import { canMakeOffer, offerGateKind } from '@/lib/verification/status'
import type { HelpRequest } from '@/types'
import { NeedsHelpNowLabel } from '@/components/urgent/NeedsHelpNowLabel'
import { CancelJobAction } from '@/components/jobs/CancelJobAction'
import { CancelOfferAction } from '@/components/jobs/CancelOfferAction'
import { JobAreaMap } from '@/components/jobs/JobAreaMap'
import { JobDetailPhoto } from '@/components/jobs/JobDetailPhoto'
import { JobDetailPriceLine } from '@/components/jobs/JobDetailPriceLine'
import { formatJobDetailsDisplay } from '@/lib/displayDetails'
import { formatJobAreaCaption } from '@/lib/location'
import { BrowseCategoryThumb } from './BrowseCategoryThumb'
import { SuggestedHelpersSection } from '@/components/refer/SuggestedHelpersSection'
import { ReferHelperFooterActions } from './ReferHelperActions'

const ETA_CHIPS = ['Within 30 min', 'Within 1 hour', 'Today afternoon', 'Flexible'] as const

export function BrowseJobDetailPanel({
  request,
  areaLabel,
  milesLabel,
  authHref,
}: {
  request: HelpRequest
  areaLabel: string
  /** Rounded miles only, e.g. "0.4 mi". */
  milesLabel?: string | null
  /** Viewer browse city; kept for Browse callers, not used for job captions. */
  cityName: string
  authHref: string
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
  const titleId = useId()

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
  const [offerOpen, setOfferOpen] = useState(false)
  const [offerPrice, setOfferPrice] = useState(() =>
    myOffer ? String(myOffer.price) : request.budget > 0 ? String(Math.round(request.budget)) : '',
  )
  const [offerNote, setOfferNote] = useState(myOffer?.note ?? '')
  const [offerEta, setOfferEta] = useState(myOffer?.eta ?? 'Within 1 hour')
  const [offerError, setOfferError] = useState('')
  const [offerPending, setOfferPending] = useState(false)
  const [askPending, setAskPending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const offerFormRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    setOfferOpen(false)
    setOfferPrice(
      myOffer ? String(myOffer.price) : request.budget > 0 ? String(Math.round(request.budget)) : '',
    )
    setOfferNote(myOffer?.note ?? '')
    setOfferEta(myOffer?.eta ?? 'Within 1 hour')
    setOfferError('')
    // Reset form when switching jobs; myOffer is derived from request.id + offers.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional job-id sync
  }, [request.id])

  useEffect(() => {
    if (!offerOpen) return
    offerFormRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [offerOpen])

  const images = normalizeListingImages(request.images, request.image)
  const cover = listingCoverImage(images)
  const categoryLabel = formatCategoryLabel(request.category, request.categoryCustom)
  const listedPrice = hasListedPrice(request)
  const firmPrice = listedPrice && !requestAcceptsOffers(request)
  const firmPriceAmount = listedPrice ? Math.round(request.budget) : 0
  const posted = relativeTime(request.createdAt)
  const jobAreaCaption = formatJobAreaCaption(request)
  // Job area only; never fall back to the viewer browse city (guest "you").
  const placeBase =
    areaLabel && areaLabel.toLowerCase() !== 'you' && areaLabel.toLowerCase() !== 'your area'
      ? areaLabel
      : jobAreaCaption.split(',')[0]?.trim() || jobAreaCaption || 'Nearby'
  const place =
    milesLabel && placeBase
      ? `${placeBase} · ${milesLabel}`
      : milesLabel
        ? milesLabel
        : placeBase
  const canOffer = !isOwner && request.status === 'open'
  const pendingOffer =
    canOffer && !isGuest && myOffer?.status === 'pending' ? myOffer : undefined
  const timingValue =
    request.when === 'asap' ? 'As soon as possible' : request.whenLabel || 'Flexible'
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

  const showHelperOfferChrome = canOffer && !isNeighborViewer

  const ownerCanCancel =
    isOwner && (request.status === 'open' || request.status === 'accepted')

  const primaryButton =
    pendingOffer && !offerOpen ? (
      <CancelOfferAction
        offerId={pendingOffer.id}
        testId="browse-cancel-offer"
        className="min-w-0 flex-[1.15]"
        buttonClassName="browse-hc-btn-cancel"
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
      <OfferGatePrimaryButton kind={gateKind} narrow={false} className="browse-hc-btn-offer !flex-[1.15]" />
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
        className="browse-hc-btn-offer"
      >
        {offerOpen ? (offerPending ? 'Sending…' : 'Send offer') : 'Make an offer'}
      </button>
    ) : (
      <Link href={fullHref} className="browse-hc-btn-offer inline-flex items-center justify-center">
        {isOwner ? 'View your listing' : 'Open full page'}
      </Link>
    )

  return (
    <aside
      className="browse-hc-detail"
      data-testid="browse-job-detail"
      aria-labelledby={titleId}
    >
      <div className="browse-hc-detail-scroll" ref={scrollRef}>
        <JobDetailPhoto
          src={cover}
          showBottomScrim
          className="browse-hc-detail-photo"
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
          <JobSaveButton requestId={request.id} testId="browse-job-save" />
        </JobDetailPhoto>

        <div className="browse-hc-detail-body">
          <div className="browse-hc-detail-head">
            <h2 id={titleId} className="browse-hc-detail-title">
              <JobTitleText title={request.title} />
            </h2>
            {request.isUrgent ? <NeedsHelpNowLabel /> : null}
            <div className="browse-hc-detail-price-block">
              <JobDetailPriceLine request={request} testId="browse-job-detail-price" />
            </div>
          </div>

          <div className="browse-hc-info-card">
            <div className="browse-hc-info-item">
              <span className="browse-hc-info-icon">
                <Clock className="h-4 w-4" strokeWidth={2} aria-hidden />
              </span>
              <div>
                <div className="browse-hc-info-k">Timing</div>
                <div className="browse-hc-info-v">{timingValue}</div>
              </div>
            </div>
            <div className="browse-hc-info-item">
              <span className="browse-hc-info-icon">
                <MapPin className="h-4 w-4" strokeWidth={2} aria-hidden />
              </span>
              <div>
                <div className="browse-hc-info-k">Area</div>
                <div className="browse-hc-info-v">{place}</div>
              </div>
            </div>
          </div>

          <JobAreaMap
            jobId={request.id}
            lat={request.lat}
            lng={request.lng}
            locationLabel={request.locationLabel}
            neighborhood={request.neighborhood}
            city={request.city}
            radiusMiles={request.radiusMiles}
          />

          <div className="browse-hc-about">
            <h3>About this job</h3>
            <p>{formatJobDetailsDisplay(request.details)}</p>
          </div>

          {isOwner && request.status === 'open' ? (
            <SuggestedHelpersSection jobId={request.id} compact />
          ) : null}

          {offerOpen && showHelperOfferChrome && verified ? (
            <form
              ref={offerFormRef}
              className="space-y-3 border-0 border-t border-[#E3E8EF] p-0 pt-4"
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
                  <label className="block text-[13px] font-semibold text-[#071330]" htmlFor="browse-panel-offer-price">
                    Price
                  </label>
                  <div className="flex h-11 items-center rounded-[10px] border border-[#D7E0EC] px-3 focus-within:border-[#1D5CE5]">
                    <span className="text-[15px] font-semibold text-[#3D4A5F]" aria-hidden>
                      $
                    </span>
                    <input
                      id="browse-panel-offer-price"
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
              <label className="block text-[13px] font-semibold text-[#071330]" htmlFor="browse-panel-offer-note">
                Note
              </label>
              <textarea
                id="browse-panel-offer-note"
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

          {showHelperOfferChrome && !isGuest && !verified ? (
            <div>
              <OfferGateNotice verification={helperVerification} narrow={false} />
            </div>
          ) : null}
        </div>
      </div>

      <div className="browse-hc-detail-footer">
        {canOffer && isNeighborViewer ? (
          <ReferHelperFooterActions
            jobId={request.id}
            title={request.title}
            jobOwnerId={request.requesterId}
          />
        ) : showHelperOfferChrome ? (
          <div className="browse-hc-detail-actions">
            <button
              type="button"
              data-testid="browse-ask-question"
              disabled={askPending}
              onClick={() => void askQuestion()}
              className="browse-hc-btn-ask"
            >
              Ask a question
            </button>
            {primaryButton}
          </div>
        ) : ownerCanCancel ? (
          <div className="browse-hc-detail-actions" data-testid="browse-owner-controls">
            <CancelJobAction
              request={request}
              className="min-w-0 flex-1"
              buttonClassName="browse-hc-btn-ask w-full"
            />
            {primaryButton}
          </div>
        ) : (
          <div className="browse-hc-detail-actions">{primaryButton}</div>
        )}
      </div>
    </aside>
  )
}
