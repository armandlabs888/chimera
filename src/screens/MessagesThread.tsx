'use client'

import { ArrowLeft, CheckCircle2, MessageCircle, Send } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { Avatar, EmptyState, Button, ButtonLink } from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import { getCategory } from '@/data/categories'
import { CATEGORY_ICONS } from '@/lib/categoryIcons'
import { formatLocation } from '@/lib/location'
import { formatBudget, formatMoney, relativeTime } from '@/lib/matching'

const ETA_CHIPS = ['Within 30 min', 'Within 1 hour', 'Today afternoon', 'Flexible'] as const

function statusLabel(status: string): string {
  if (status === 'open') return 'Open'
  if (status === 'accepted') return 'In progress'
  if (status === 'completed') return 'Completed'
  if (status === 'cancelled') return 'Cancelled'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function statusPillClass(status: string): string {
  if (status === 'open') return 'bg-emerald-50 text-emerald-700'
  if (status === 'accepted') return 'bg-[#EEF4FF] text-[#1D5CE5]'
  if (status === 'completed') return 'bg-[#F4F8FD] text-[#475569]'
  return 'bg-[#F4F8FD] text-[#64748B]'
}

function initialOfferPrice(budget: number | undefined): string {
  if (budget && budget > 0) return String(budget)
  return ''
}

export function MessagesThread({
  threadId,
  inboxHref = '/messages',
}: {
  threadId: string
  inboxHref?: string
}) {
  const {
    state,
    currentUser,
    sendMessage,
    getPerson,
    getRequest,
    acceptOffer,
    createOffer,
    markComplete,
    ensureThread,
  } = useBeam()
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [offerPrice, setOfferPrice] = useState('')
  const [offerEta, setOfferEta] = useState<string>('Within 1 hour')
  const [offerBusy, setOfferBusy] = useState(false)
  const [offerError, setOfferError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const seededRequestId = useRef<string | null>(null)

  const thread = state.threads.find((t) => t.id === threadId)
  const otherId = thread?.participantIds.find((id) => id !== currentUser.id)
  const other = otherId ? getPerson(otherId) : undefined
  const request = thread ? getRequest(thread.requestId) : undefined
  const category = request ? getCategory(request.category) : undefined
  const CategoryIcon = request ? CATEGORY_ICONS[request.category] : null
  const isRequester = request?.requesterId === currentUser.id
  const helperParticipantId = request
    ? thread?.participantIds.find((id) => id !== request.requesterId)
    : undefined

  const participantOffers = useMemo(() => {
    if (!request || !thread) return []
    return state.offers
      .filter(
        (o) =>
          o.requestId === request.id &&
          thread.participantIds.includes(o.helperId) &&
          o.status !== 'withdrawn' &&
          o.status !== 'declined',
      )
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
  }, [state.offers, request, thread])

  const pendingOffer = participantOffers.find((o) => o.status === 'pending')
  const acceptedOffer =
    participantOffers.find((o) => o.status === 'accepted') ??
    (request?.acceptedOfferId
      ? state.offers.find((o) => o.id === request.acceptedOfferId)
      : undefined)
  const myPendingOrAny = participantOffers.find((o) => o.helperId === currentUser.id)
  const jobConfirmed =
    request?.status === 'accepted' ||
    request?.status === 'completed' ||
    Boolean(acceptedOffer)

  const messages = useMemo(
    () =>
      state.messages
        .filter((m) => m.threadId === threadId)
        .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
    [state.messages, threadId],
  )

  useEffect(() => {
    if (!request?.id) return
    if (seededRequestId.current === request.id) return
    seededRequestId.current = request.id
    setOfferPrice(initialOfferPrice(request.budget))
    setOfferEta('Within 1 hour')
    setOfferError('')
  }, [request?.id, request?.budget])

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    bottomRef.current?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth' })
  }, [messages.length])

  if (!thread || !other || !request || !category) {
    return (
      <div
        className="flex min-h-[50vh] items-center justify-center bg-[#FAFBFD] p-6 xl:col-span-2"
        data-testid="messages-thread-missing"
      >
        <EmptyState
          title="Thread not found"
          body="Open a conversation from a request or your inbox."
          action={<ButtonLink href={inboxHref}>Back to inbox</ButtonLink>}
        />
      </div>
    )
  }

  async function onSend(e: FormEvent) {
    e.preventDefault()
    if (!body.trim() || !threadId || sending) return
    const outgoing = body
    setBody('')
    setSending(true)
    try {
      await sendMessage(threadId, outgoing)
    } finally {
      setSending(false)
    }
  }

  async function onAcceptOffer() {
    if (!pendingOffer || offerBusy || !request) return
    setOfferBusy(true)
    try {
      await acceptOffer(pendingOffer.id)
      if (helperParticipantId) await ensureThread(request.id, helperParticipantId)
    } finally {
      setOfferBusy(false)
    }
  }

  async function onSendOffer(e: FormEvent) {
    e.preventDefault()
    if (offerBusy || isRequester || !request) return
    const priceNum = Number(offerPrice)
    if (!offerPrice.trim() || Number.isNaN(priceNum) || priceNum < 5) {
      setOfferError('Name a real price before you show up.')
      return
    }
    setOfferBusy(true)
    setOfferError('')
    try {
      await createOffer({
        requestId: request.id,
        price: priceNum,
        note: 'Happy to help — coordinating in this thread.',
        eta: offerEta.trim() || 'Flexible',
      })
      await ensureThread(request.id, request.requesterId)
    } catch (err) {
      setOfferError(err instanceof Error ? err.message : 'Could not send offer')
    } finally {
      setOfferBusy(false)
    }
  }

  async function onMarkComplete() {
    if (offerBusy || !request) return
    setOfferBusy(true)
    try {
      await markComplete(request.id)
    } finally {
      setOfferBusy(false)
    }
  }

  const locationLabel = formatLocation(request)
  const budgetLabel = formatBudget(request)
  const canMarkComplete =
    jobConfirmed &&
    request.status === 'accepted' &&
    (isRequester || request.helperId === currentUser.id)
  const firstName = other.name.split(' ')[0] || other.name
  const headerSubtitle = `${category.shortLabel} · ${locationLabel}`
  const canSendOffer =
    !isRequester && request.status === 'open' && !myPendingOrAny && !jobConfirmed
  const showIncomingAccept =
    isRequester && request.status === 'open' && Boolean(pendingOffer) && !jobConfirmed
  const showOfferSent =
    !isRequester && Boolean(myPendingOrAny) && myPendingOrAny?.status === 'pending' && !jobConfirmed
  const showNoOfferYet =
    isRequester && request.status === 'open' && !pendingOffer && !jobConfirmed

  const offerPanel = (
    <OfferPanel
      compact={false}
      canSendOffer={canSendOffer}
      showIncomingAccept={showIncomingAccept}
      showOfferSent={showOfferSent}
      showNoOfferYet={showNoOfferYet}
      jobConfirmed={jobConfirmed}
      acceptedOffer={acceptedOffer}
      pendingOffer={pendingOffer}
      myPendingOrAny={myPendingOrAny}
      request={request}
      canMarkComplete={canMarkComplete}
      offerPrice={offerPrice}
      setOfferPrice={setOfferPrice}
      offerEta={offerEta}
      setOfferEta={setOfferEta}
      offerError={offerError}
      offerBusy={offerBusy}
      onSendOffer={onSendOffer}
      onAcceptOffer={onAcceptOffer}
      onMarkComplete={onMarkComplete}
    />
  )

  const compactOfferPanel = (
    <OfferPanel
      compact
      canSendOffer={canSendOffer}
      showIncomingAccept={showIncomingAccept}
      showOfferSent={showOfferSent}
      showNoOfferYet={showNoOfferYet}
      jobConfirmed={jobConfirmed}
      acceptedOffer={acceptedOffer}
      pendingOffer={pendingOffer}
      myPendingOrAny={myPendingOrAny}
      request={request}
      canMarkComplete={canMarkComplete}
      offerPrice={offerPrice}
      setOfferPrice={setOfferPrice}
      offerEta={offerEta}
      setOfferEta={setOfferEta}
      offerError={offerError}
      offerBusy={offerBusy}
      onSendOffer={onSendOffer}
      onAcceptOffer={onAcceptOffer}
      onMarkComplete={onMarkComplete}
    />
  )

  return (
    <>
      <section
        className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-white"
        data-testid="messages-conversation"
      >
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-[#E2E8F0] bg-white px-4 sm:px-5">
          <Link
            href={inboxHref}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#071330] transition hover:bg-[#F4F8FD] md:hidden"
            aria-label="Back to inbox"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Link
            href={`/people/${other.id}`}
            className="shrink-0 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D5CE5]"
          >
            <Avatar src={other.avatar} name={other.name} size={38} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-[#071330]">{other.name}</p>
            <p className="truncate text-[12.5px] text-[#64748B]">{headerSubtitle}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-semibold xl:hidden ${statusPillClass(request.status)}`}
            >
              {statusLabel(request.status)}
            </span>
            <Link
              href={`/requests/${request.id}`}
              className="hidden text-[13px] font-semibold text-[#1D5CE5] transition hover:text-[#1649BD] sm:inline xl:hidden"
            >
              View request
            </Link>
            <Link
              href={`/people/${other.id}`}
              className="hidden text-[13px] font-semibold text-[#64748B] transition hover:text-[#071330] xl:inline"
            >
              View profile
            </Link>
          </div>
        </header>

        {/* Compact task + offer strip for < xl */}
        <div
          className="max-h-[42%] shrink-0 overflow-y-auto border-b border-[#E2E8F0] bg-[#FAFBFD] px-3 py-2.5 sm:px-4 sm:py-3 xl:hidden"
          data-testid="messages-compact-task-strip"
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11.5px] font-semibold text-[#071330] ring-1 ring-[#E2E8F0]">
              {CategoryIcon ? (
                <CategoryIcon className="h-3 w-3 text-[#1D5CE5]" strokeWidth={2} aria-hidden />
              ) : null}
              {category.shortLabel}
            </span>
            <span
              className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${statusPillClass(request.status)}`}
            >
              {statusLabel(request.status)}
            </span>
            <Link
              href={`/requests/${request.id}`}
              className="min-w-0 flex-1 truncate text-[13.5px] font-bold text-[#071330] hover:text-[#1D5CE5]"
            >
              {request.title}
            </Link>
          </div>
          <p className="mt-1 truncate text-[12px] text-[#64748B]">
            {request.whenLabel}
            <span className="mx-1.5 text-[#CBD5E1]" aria-hidden>
              ·
            </span>
            {budgetLabel}
          </p>
          <div className="mt-2.5">{compactOfferPanel}</div>
        </div>

        <div
          className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-5 sm:px-6"
          data-testid="messages-scroll"
        >
          {messages.length === 0 ? (
            <div
              className="flex flex-1 flex-col items-center justify-center px-3 py-6 text-center sm:px-4 sm:py-10"
              data-testid="messages-empty-starter"
            >
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#F4F8FD] text-[#1D5CE5] sm:mb-4 sm:h-14 sm:w-14">
                <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.75} aria-hidden />
              </div>
              <div className="hidden sm:block">
                <Avatar src={other.avatar} name={other.name} size={48} />
              </div>
              <p className="mt-2 text-[14px] font-semibold text-[#071330] sm:mt-3 sm:text-[15px]">
                {other.name}
              </p>
              <p className="mt-1 max-w-[32ch] text-[13px] leading-relaxed text-[#64748B] sm:mt-1.5 sm:text-[13.5px]">
                Ask about timing, parking, stairs, or tools — or send an offer to lock in the task.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => {
                const mine = message.senderId === currentUser.id
                return (
                  <div
                    key={message.id}
                    className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[min(85%,28rem)] px-4 py-2.5 text-[14.5px] leading-[1.5] ${
                        mine
                          ? 'rounded-xl rounded-br-sm bg-[#1D5CE5] text-white'
                          : 'rounded-xl rounded-bl-sm border border-[rgba(7,19,48,0.06)] bg-[#F4F8FD] text-[#071330]'
                      }`}
                    >
                      <p>{message.body}</p>
                      <p
                        className={`mt-1 text-[11.5px] tabular-nums ${
                          mine ? 'text-white/70' : 'text-[#94A3B8]'
                        }`}
                      >
                        {relativeTime(message.createdAt)}
                        {message.isSimulated ? ' · reply' : ''}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <form
          onSubmit={onSend}
          className="shrink-0 border-t border-[#E2E8F0] bg-white px-4 py-3 sm:px-5"
          data-testid="messages-composer"
        >
          <div className="flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] py-1.5 pl-3.5 pr-1.5 transition focus-within:border-[#1D5CE5] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#1D5CE5]/12">
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={`Message ${firstName}…`}
              className="h-9 min-w-0 flex-1 bg-transparent text-[14.5px] text-[#071330] outline-none placeholder:text-[#94A3B8]"
              disabled={sending}
              aria-label="Message"
            />
            <button
              type="submit"
              className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition ${
                body.trim() && !sending
                  ? 'bg-[#1D5CE5] text-white hover:bg-[#1649BD]'
                  : 'bg-[#E2E8F0] text-[#94A3B8]'
              }`}
              disabled={!body.trim() || sending}
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </section>

      <aside
        className="hidden min-h-0 flex-col overflow-y-auto border-l border-[#E2E8F0] bg-[#FAFBFD] xl:flex"
        data-testid="messages-task-rail"
      >
        <div className="border-b border-[#E2E8F0] bg-white p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F4F8FD] px-3 py-1.5 text-[12.5px] font-semibold text-[#071330]">
              {CategoryIcon ? (
                <CategoryIcon className="h-3.5 w-3.5 text-[#1D5CE5]" strokeWidth={2} aria-hidden />
              ) : null}
              {category.shortLabel}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-semibold ${statusPillClass(request.status)}`}
            >
              {statusLabel(request.status)}
            </span>
          </div>
          <Link
            href={`/requests/${request.id}`}
            className="mt-3 block font-display text-[17px] font-bold leading-snug text-[#071330] transition hover:text-[#1D5CE5]"
          >
            {request.title}
          </Link>
          <p className="mt-2 text-[13px] text-[#64748B]">
            {request.whenLabel}
            <span className="mx-1.5 text-[#CBD5E1]" aria-hidden>
              ·
            </span>
            {locationLabel}
          </p>
          <p className="mt-1 text-[13.5px] font-semibold tabular-nums text-[#071330]">
            {budgetLabel}
          </p>
          {request.image ? (
            <div className="mt-4 aspect-[16/9] overflow-hidden rounded-lg bg-[#E8EEF7]">
              <img src={request.image} alt="" className="h-full w-full object-cover" />
            </div>
          ) : null}
          <Link
            href={`/requests/${request.id}`}
            className="mt-3 inline-flex text-[13px] font-semibold text-[#1D5CE5] hover:text-[#1649BD]"
          >
            View full request →
          </Link>
        </div>
        <div className="p-5">{offerPanel}</div>
      </aside>
    </>
  )
}

type OfferLike = {
  id: string
  price: number
  eta: string
  note?: string
  helperId: string
  status: string
} | undefined

function OfferPanel({
  compact,
  canSendOffer,
  showIncomingAccept,
  showOfferSent,
  showNoOfferYet,
  jobConfirmed,
  acceptedOffer,
  pendingOffer,
  myPendingOrAny,
  request,
  canMarkComplete,
  offerPrice,
  setOfferPrice,
  offerEta,
  setOfferEta,
  offerError,
  offerBusy,
  onSendOffer,
  onAcceptOffer,
  onMarkComplete,
}: {
  compact: boolean
  canSendOffer: boolean
  showIncomingAccept: boolean
  showOfferSent: boolean
  showNoOfferYet: boolean
  jobConfirmed: boolean
  acceptedOffer: OfferLike
  pendingOffer: OfferLike
  myPendingOrAny: OfferLike
  request: { id: string; status: string; exactAddress?: string }
  canMarkComplete: boolean
  offerPrice: string
  setOfferPrice: (v: string) => void
  offerEta: string
  setOfferEta: (v: string) => void
  offerError: string
  offerBusy: boolean
  onSendOffer: (e: FormEvent) => void | Promise<void>
  onAcceptOffer: () => void | Promise<void>
  onMarkComplete: () => void | Promise<void>
}) {
  if (jobConfirmed && acceptedOffer) {
    return (
      <div className={compact ? 'space-y-2' : 'space-y-3'} data-testid="messages-offer-confirmed">
        {!compact ? (
          <h2 className="text-[15px] font-bold text-[#071330]">Confirmed</h2>
        ) : null}
        <p className="text-[14px] font-semibold text-[#071330]">
          {formatMoney(acceptedOffer.price)}
          <span className="font-medium text-[#64748B]"> · ETA {acceptedOffer.eta}</span>
        </p>
        {request.exactAddress ? (
          <p className="text-[13px] text-[#475569]">
            Meet at <span className="font-medium text-[#071330]">{request.exactAddress}</span>
          </p>
        ) : null}
        {canMarkComplete ? (
          <Button
            type="button"
            onClick={() => void onMarkComplete()}
            loading={offerBusy}
            className={
              compact
                ? 'h-10 rounded-full'
                : 'h-11 w-full rounded-full bg-[#1D5CE5] text-white hover:bg-[#1649BD]'
            }
          >
            <CheckCircle2 className="h-4 w-4" />
            Mark job complete
          </Button>
        ) : request.status === 'completed' ? (
          <span className="inline-flex items-center rounded-full bg-[#F4F8FD] px-2.5 py-1 text-[12px] font-semibold text-[#475569]">
            Completed
          </span>
        ) : null}
      </div>
    )
  }

  if (canSendOffer) {
    return (
      <form
        onSubmit={(e) => void onSendOffer(e)}
        className={compact ? 'space-y-2' : 'space-y-4'}
        data-testid="messages-send-offer"
      >
        <div className={compact ? 'flex items-baseline justify-between gap-2' : undefined}>
          <h2 className={`font-bold text-[#071330] ${compact ? 'text-[13.5px]' : 'text-[15px]'}`}>
            Send an offer
          </h2>
          {!compact ? (
            <p className="mt-1 text-[13px] text-[#64748B]">
              Name your price and arrival window.
            </p>
          ) : (
            <p className="text-[12px] text-[#64748B]">Price + arrival</p>
          )}
        </div>

        <div className={compact ? 'flex items-end gap-2' : undefined}>
          <div className={compact ? 'min-w-0 flex-1' : undefined}>
            <label
              htmlFor={compact ? 'messages-offer-price-compact' : 'messages-offer-price'}
              className={`mb-1.5 block font-semibold text-[#071330] ${compact ? 'text-[12.5px]' : 'text-[13px]'}`}
            >
              Your offer
            </label>
            <div
              className={`relative flex items-center rounded-xl border border-[#E2E8F0] bg-white focus-within:border-[#1D5CE5] focus-within:ring-4 focus-within:ring-[#1D5CE5]/15 ${
                compact ? 'h-10' : 'h-11'
              }`}
            >
              <span className="pl-3 text-[15px] font-semibold text-[#64748B]" aria-hidden>
                $
              </span>
              <input
                id={compact ? 'messages-offer-price-compact' : 'messages-offer-price'}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={offerPrice}
                onChange={(e) => setOfferPrice(e.target.value.replace(/[^\d]/g, '').slice(0, 5))}
                placeholder="60"
                required
                data-testid={compact ? 'messages-offer-price-compact' : 'messages-offer-price'}
                className="h-full w-full min-w-0 bg-transparent px-2 pr-3 text-[15px] font-semibold tabular-nums text-[#071330] outline-none placeholder:font-normal placeholder:text-[#94A3B8]"
              />
            </div>
          </div>
          {compact ? (
            <Button
              type="submit"
              loading={offerBusy}
              className="h-10 shrink-0 rounded-full bg-[#1D5CE5] px-4 text-[13px] font-semibold text-white shadow-none hover:bg-[#1649BD]"
            >
              Send
            </Button>
          ) : null}
        </div>

        <div>
          {!compact ? (
            <p className="mb-1.5 text-[13px] font-semibold text-[#071330]">Arrival window</p>
          ) : null}
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
            {ETA_CHIPS.map((chip) => {
              const selected = offerEta === chip
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setOfferEta(chip)}
                  className={`rounded-lg px-2 py-1.5 text-[12px] font-semibold transition sm:px-2.5 sm:py-2 sm:text-[12.5px] ${
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

        {offerError ? (
          <p className="text-[13px] text-[#DC2626]" role="alert">
            {offerError}
          </p>
        ) : null}

        {!compact ? (
          <Button
            type="submit"
            loading={offerBusy}
            className="h-11 w-full rounded-full bg-[#1D5CE5] font-semibold text-white shadow-none hover:bg-[#1649BD]"
          >
            Send offer
          </Button>
        ) : null}
      </form>
    )
  }

  if (showOfferSent && myPendingOrAny) {
    return (
      <div className="space-y-2" data-testid="messages-offer-sent">
        <h2 className={`font-bold text-[#071330] ${compact ? 'text-[14px]' : 'text-[15px]'}`}>
          Offer sent
        </h2>
        <p className="text-[14px] font-semibold text-[#071330]">
          {formatMoney(myPendingOrAny.price)}
          <span className="font-medium text-[#64748B]"> · ETA {myPendingOrAny.eta}</span>
        </p>
        <p className="text-[13px] text-[#64748B]">Waiting on requester</p>
        <Link
          href={`/requests/${request.id}`}
          className="inline-flex text-[13px] font-semibold text-[#1D5CE5] hover:text-[#1649BD]"
        >
          Update on request →
        </Link>
      </div>
    )
  }

  if (showIncomingAccept && pendingOffer) {
    return (
      <div className="space-y-3" data-testid="messages-incoming-offer">
        <h2 className={`font-bold text-[#071330] ${compact ? 'text-[14px]' : 'text-[15px]'}`}>
          Incoming offer
        </h2>
        <p className="text-[14px] font-semibold text-[#071330]">
          {formatMoney(pendingOffer.price)}
          <span className="font-medium text-[#64748B]"> · ETA {pendingOffer.eta}</span>
        </p>
        {pendingOffer.note ? (
          <p className="text-[13px] leading-relaxed text-[#475569]">{pendingOffer.note}</p>
        ) : null}
        <Button
          type="button"
          onClick={() => void onAcceptOffer()}
          loading={offerBusy}
          className={`w-full rounded-full bg-[#1D5CE5] font-semibold text-white hover:bg-[#1649BD] ${
            compact ? 'h-10' : 'h-11'
          }`}
        >
          Accept offer
        </Button>
      </div>
    )
  }

  if (showNoOfferYet) {
    return (
      <div
        className="rounded-xl border border-[#E2E8F0] bg-white p-4"
        data-testid="messages-no-offer-yet"
      >
        <p className="text-[14px] font-bold text-[#071330]">No offer yet</p>
        <p className="mt-1 text-[13px] leading-relaxed text-[#64748B]">
          Coordinate details in chat — their offer will appear here when ready.
        </p>
      </div>
    )
  }

  return null
}
