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
import { useBeam } from '@/context/BeamContext'
import { formatBudget, relativeTime } from '@/lib/matching'
import { listingCoverImage, normalizeListingImages } from '@/lib/listingPhotos'
import { formatCategoryLabel } from '@/lib/taxonomy'
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
  const { state, currentUser, mode, authUser, createOffer, ensureThread } = useBeam()
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
  const [offerOpen, setOfferOpen] = useState(false)
  const [offerPrice, setOfferPrice] = useState(() =>
    myOffer ? String(myOffer.price) : request.budget > 0 ? String(Math.round(request.budget)) : '',
  )
  const [offerNote, setOfferNote] = useState(myOffer?.note ?? '')
  const [offerEta, setOfferEta] = useState(myOffer?.eta ?? 'Within 1 hour')
  const [offerError, setOfferError] = useState('')
  const [offerPending, setOfferPending] = useState(false)
  const [offerSent, setOfferSent] = useState(false)
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
        router.push(`/messages/${threadId}`)
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
          note: offerNote.trim() || 'Happy to help — message me to coordinate.',
          eta: offerEta,
        })
        await ensureThread(request.id, request.requesterId)
        setOfferSent(true)
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
    <div className={narrow ? 'min-h-0 flex-1 overflow-y-auto px-[18px] py-4' : 'min-h-0 flex-1 overflow-y-auto px-[22px] pb-7 pt-5'}>
      {cover ? (
        <img src={cover} alt="" className="aspect-[16/10] w-full rounded-[10px] object-cover" />
      ) : (
        <BrowseCategoryThumb categoryId={request.category} size="hero" />
      )}
      <div className="mt-[18px]">
        <span className="inline-flex h-[26px] items-center rounded-[7px] border border-[#D6E2F5] bg-[#F4F8FD] px-2 text-[12.5px] font-semibold text-[#123E9E]">
          {categoryLabel}
        </span>
      </div>
      <h2 id={titleId} className="mt-3 text-[21px] font-bold leading-[1.2] tracking-[-0.022em] text-[#071330] sm:text-[24px]">
        {request.title}
      </h2>
      <p className="mt-2 text-[14px] text-[#273449]">
        Posted {posted} by {firstName} · {place}
      </p>
      <dl className="mt-5 grid grid-cols-2 overflow-hidden rounded-xl border border-[#E3E8EF] sm:grid-cols-3">
        {facts.map((fact, index) => (
          <div
            key={fact.label}
            className={`px-3.5 py-3 ${index > 0 ? 'border-[#E3E8EF] sm:border-l' : ''} ${
              index === 2 ? 'col-span-2 border-t sm:col-span-1 sm:border-t-0' : ''
            }`}
          >
            <dt className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.05em] text-[#3D4A5F]">
              <fact.icon className="h-3.5 w-3.5 text-[#1D5CE5]" strokeWidth={2} aria-hidden />
              {fact.label}
            </dt>
            <dd className="mt-1 text-[15px] font-semibold leading-snug text-[#071330]">
              {fact.value}
              <small className="mt-0.5 block text-[13px] font-medium text-[#273449]">{fact.detail}</small>
            </dd>
          </div>
        ))}
      </dl>
      <section className="mt-6">
        <h3 className="text-[15px] font-bold text-[#071330]">About this job</h3>
        <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-[#273449]">
          {request.details}
        </p>
      </section>
      <section className="mt-6">
        <h3 className="text-[15px] font-bold text-[#071330]">Location</h3>
        <div className="mt-2 flex items-center gap-3 rounded-xl border border-[#E3E8EF] px-3.5 py-3 text-[14.5px] text-[#273449]">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-[#F4F8FD] text-[#1D5CE5]">
            <MapPin className="h-4 w-4" strokeWidth={2} aria-hidden />
          </span>
          <span>
            <span className="block font-semibold text-[#071330]">
              {place}
              {cityName && place !== cityName ? `, ${cityName}` : ''}
            </span>
            Exact address is shared after your offer is accepted.
          </span>
        </div>
      </section>
      {offerOpen && canOffer ? (
        <form
          className="mt-6 space-y-3 rounded-xl border border-[#E3E8EF] p-4"
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
            className="inline-flex h-11 items-center justify-center rounded-[10px] bg-[#1D5CE5] px-4 text-[14px] font-semibold text-white hover:bg-[#1649BD] disabled:opacity-60"
          >
            {offerPending ? 'Sending…' : myOffer ? 'Update offer' : 'Send offer'}
          </button>
        </form>
      ) : null}
      {offerSent ? (
        <p className="mt-4 text-[14px] font-semibold text-[#071330]" data-testid="browse-offer-sent">
          Offer sent. You can keep coordinating from Messages.
        </p>
      ) : null}
    </div>
  )

  const actions = (
    <div
      className={`flex shrink-0 flex-nowrap items-center gap-2 border-t border-[#E3E8EF] bg-white sm:gap-3 ${
        narrow ? 'px-3 pb-5 pt-3' : 'px-4 py-3.5 sm:px-[22px]'
      }`}
    >
      <div className="min-w-0 shrink leading-tight">
        <b className="block truncate text-[17px] font-bold text-[#071330] sm:text-[19px]">{budgetLabel}</b>
        <span className="block whitespace-nowrap text-[11.5px] text-[#3D4A5F] sm:text-[12.5px]">
          Customer budget
        </span>
      </div>
      <div className="min-w-2 flex-1" />
      {canOffer ? (
        <div className="flex shrink-0 flex-nowrap items-center gap-2">
          <button
            type="button"
            data-testid="browse-ask-question"
            disabled={askPending}
            onClick={() => void askQuestion()}
            className={`inline-flex h-11 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] border border-[#CDD5E0] bg-white font-semibold text-[#071330] hover:bg-[#F4F8FD] disabled:opacity-60 sm:h-12 ${
              narrow ? 'w-11 px-0' : 'px-3 text-[13.5px] sm:px-4 sm:text-[14px]'
            }`}
            aria-label="Ask a question"
          >
            <MessageCircle className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
            {narrow ? null : 'Ask a question'}
          </button>
          <button
            type="button"
            data-testid="browse-make-offer"
            onClick={() => {
              if (isGuest) {
                router.push(authHref)
                return
              }
              if (offerOpen) void submitOffer()
              else setOfferOpen(true)
            }}
            className={`inline-flex h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-[10px] bg-[#1D5CE5] px-3.5 text-[13.5px] font-semibold text-white hover:bg-[#1649BD] sm:h-12 sm:px-5 sm:text-[14px] ${
              narrow ? 'min-w-0 flex-1' : ''
            }`}
          >
            {offerOpen ? 'Send offer' : 'Make an offer'}
          </button>
        </div>
      ) : (
        <Link
          href={fullHref}
          className="inline-flex h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-[10px] bg-[#1D5CE5] px-4 text-[13.5px] font-semibold text-white hover:bg-[#1649BD] sm:h-12 sm:px-5 sm:text-[14px]"
        >
          {isOwner ? 'View your listing' : 'Open full page'}
        </Link>
      )}
    </div>
  )

  const toolbar = (
    <div className="flex items-center gap-0.5">
      <button type="button" className={iconBtn} aria-label="Share" onClick={() => void share()}>
        <Share2 className="h-[18px] w-[18px]" strokeWidth={1.9} />
      </button>
      <Link href={fullHref} className={iconBtn} aria-label="Open full page" data-testid="browse-open-full-page">
        <ExternalLink className="h-[18px] w-[18px]" strokeWidth={1.9} />
      </Link>
      <button type="button" className={iconBtn} aria-label="Close" onClick={onClose} data-testid="browse-drawer-close">
        <X className="h-[18px] w-[18px]" strokeWidth={1.9} />
      </button>
    </div>
  )

  if (narrow) {
    return (
      <div className="fixed inset-0 z-[80]" data-browse-job-layer="sheet">
        <button
          type="button"
          className="absolute inset-0 bg-[rgba(7,19,48,0.36)]"
          aria-label="Dismiss job details"
          onClick={onClose}
        />
        <section
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          data-testid="browse-job-sheet"
          className="absolute inset-x-0 bottom-0 top-7 flex flex-col rounded-t-2xl bg-white shadow-[0_-12px_40px_rgba(7,19,48,0.25)] outline-none"
        >
          <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-[#C3CCD9]" aria-hidden />
          <div className="flex h-11 shrink-0 items-center justify-between px-2.5 pl-[18px]">
            <span className="text-[15px] font-semibold text-[#071330]">Job details</span>
            {toolbar}
          </div>
          {body}
          {actions}
        </section>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[80]" data-browse-job-layer="drawer">
      <button
        type="button"
        className="absolute inset-0 bg-[rgba(7,19,48,0.36)]"
        aria-label="Dismiss job details"
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="browse-job-drawer"
        className="absolute bottom-3 right-3 top-3 flex w-[500px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-xl bg-white shadow-[-24px_0_60px_-20px_rgba(7,19,48,0.35)] outline-none"
      >
        <div className="flex h-[60px] shrink-0 items-center justify-between border-b border-[#E3E8EF] pl-[22px] pr-3.5">
          <span className="text-[14px] font-semibold text-[#071330]">Job details</span>
          {toolbar}
        </div>
        {body}
        {actions}
      </aside>
    </div>
  )
}

const iconBtn =
  'grid h-9 w-9 place-items-center rounded-[9px] text-[#071330] transition hover:bg-[#F4F8FD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/40'
