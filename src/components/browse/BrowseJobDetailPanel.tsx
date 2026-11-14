'use client'

import { Bookmark, Clock, MapPin } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
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
import { NeedsHelpNowLabel } from '@/components/urgent/NeedsHelpNowLabel'
import { BrowseCategoryThumb } from './BrowseCategoryThumb'

const ETA_CHIPS = ['Within 30 min', 'Within 1 hour', 'Today afternoon', 'Flexible'] as const

export function BrowseJobDetailPanel({
  request,
  areaLabel,
  cityName,
  authHref,
}: {
  request: HelpRequest
  areaLabel: string
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
    withdrawOffer,
    ensureThread,
    helperVerification,
  } = useBeam()
  const isGuest = mode === 'live' && !authUser
  const titleId = useId()

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
  const [saved, setSaved] = useState(false)
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
    setSaved(false)
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
  const openBudget = request.budgetType === 'open' || request.budget === 0
  const budgetLabel = formatBudget(request)
  const posted = relativeTime(request.createdAt)
  const place = areaLabel || cityName || 'Nearby'
  const canOffer = !isOwner && request.status === 'open'
  const pendingOffer =
    canOffer && !isGuest && myOffer?.status === 'pending' ? myOffer : undefined
  const timingValue =
    request.when === 'asap' ? 'As soon as possible' : request.whenLabel || 'Flexible'
  const fullHref = `/requests/${request.id}`

  const priceBlock = useMemo(() => {
    if (openBudget) {
      return (
        <>
          <div className="browse-hc-detail-price" style={{ fontSize: 22 }}>
            Open
          </div>
          <div className="browse-hc-detail-pay">Accepting offers</div>
        </>
      )
    }
    return (
      <>
        <div className="browse-hc-detail-price">{budgetLabel}</div>
        <div className="browse-hc-detail-pay">Fixed budget</div>
      </>
    )
  }, [budgetLabel, openBudget])

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

  const primaryButton =
    pendingOffer && !offerOpen && verified ? (
      <button
        type="button"
        data-testid="browse-cancel-offer"
        disabled={cancelPending}
        aria-busy={cancelPending || undefined}
        onClick={() => void cancelOffer()}
        className="browse-hc-btn-cancel"
      >
        {cancelPending ? 'Canceling…' : 'Cancel offer'}
      </button>
    ) : canOffer && !isGuest && !verified && gateKind !== 'approved' ? (
      <OfferGatePrimaryButton kind={gateKind} narrow={false} className="browse-hc-btn-offer !flex-[1.15]" />
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
        <div className="browse-hc-detail-photo">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" />
          ) : (
            <div className="browse-hc-detail-fallback">
              <BrowseCategoryThumb
                categoryId={request.category}
                size="hero"
                className="!aspect-auto h-full w-full !rounded-none"
              />
            </div>
          )}
          <div className="browse-hc-photo-caption">
            {categoryLabel} · Posted {posted}
          </div>
          <button
            type="button"
            className="browse-hc-save-btn"
            aria-pressed={saved}
            onClick={() => setSaved((v) => !v)}
          >
            <Bookmark
              className={`h-4 w-4 ${saved ? 'fill-[#1D5CE5]' : ''}`}
              strokeWidth={1.9}
              aria-hidden
            />
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>

        <div className="browse-hc-detail-body">
          <div className="browse-hc-detail-head">
            <h2 id={titleId} className="browse-hc-detail-title">
              {request.title}
            </h2>
            {request.isUrgent ? (
              <div className="mb-2">
                <NeedsHelpNowLabel />
              </div>
            ) : null}
            <div className="browse-hc-detail-price-block">{priceBlock}</div>
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

          <div className="browse-hc-about">
            <h3>About this job</h3>
            <p>{request.details}</p>
          </div>

          {offerOpen && canOffer && verified ? (
            <form
              ref={offerFormRef}
              className="mt-4 space-y-3 rounded-[12px] border border-[#E3E8EF] p-4"
              data-testid="browse-drawer-offer"
              onSubmit={(e) => {
                e.preventDefault()
                void submitOffer()
              }}
            >
              <p className="text-[15px] font-bold text-[#071330]">
                {myOffer ? 'Update your offer' : 'Your offer'}
              </p>
              <label className="block text-[13px] font-semibold text-[#071330]" htmlFor="browse-panel-offer-price">
                Price
              </label>
              <div className="flex h-11 items-center rounded-[10px] border border-[#CDD5E0] px-3 focus-within:border-[#1D5CE5]">
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
              <label className="block text-[13px] font-semibold text-[#071330]" htmlFor="browse-panel-offer-note">
                Note
              </label>
              <textarea
                id="browse-panel-offer-note"
                value={offerNote}
                onChange={(e) => setOfferNote(e.target.value)}
                rows={3}
                className="w-full rounded-[10px] border border-[#CDD5E0] px-3 py-2 text-[14px] text-[#071330] outline-none focus:border-[#1D5CE5]"
              />
              {offerError ? <p className="text-[13px] font-medium rounded-lg border border-[#D7E0EC] bg-[#F5F9FF] px-3 py-2 text-[#071330]">{offerError}</p> : null}
            </form>
          ) : null}

          {pendingOffer && !offerOpen ? (
            <p className="mt-3 text-[14px] font-semibold text-[#071330]" data-testid="browse-offer-sent">
              Offer sent. You can keep coordinating from Messages.
            </p>
          ) : null}
          {offerError && !offerOpen ? (
            <p className="mt-3 text-[13px] font-medium rounded-lg border border-[#D7E0EC] bg-[#F5F9FF] px-3 py-2 text-[#071330]" role="alert" data-testid="browse-offer-error">
              {offerError}
            </p>
          ) : null}

          {canOffer && !isGuest && !verified ? (
            <div className="mt-3">
              <OfferGateNotice verification={helperVerification} narrow={false} />
            </div>
          ) : null}
        </div>
      </div>

      <div className="browse-hc-detail-footer">
        {canOffer ? (
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
        ) : (
          <div className="browse-hc-detail-actions">{primaryButton}</div>
        )}
      </div>
    </aside>
  )
}
