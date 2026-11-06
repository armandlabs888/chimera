'use client'

import { ArrowLeft, Send } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { Avatar, EmptyState, ButtonLink } from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import { getCategory } from '@/data/categories'
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

function statusBadgeClass(status: string): string {
  if (status === 'open') return 'bg-emerald-50 text-emerald-700'
  if (status === 'accepted') return 'bg-[#EEF4FF] text-[#1D5CE5]'
  if (status === 'completed') return 'bg-[#F1F5F9] text-[#475569]'
  return 'bg-[#F1F5F9] text-[#64748B]'
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
        className="flex min-h-[50vh] items-center justify-center bg-[#FAFBFD] p-6"
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

  return (
    <section
      className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-white"
      data-testid="messages-conversation"
    >
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[#E2E8F0] bg-white px-4 sm:px-5">
        <Link
          href={inboxHref}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#071330] transition hover:bg-[#F8FAFC] md:hidden"
          aria-label="Back to inbox"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Link
          href={`/people/${other.id}`}
          className="shrink-0 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D5CE5]"
        >
          <Avatar src={other.avatar} name={other.name} size={36} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14.5px] font-semibold text-[#071330]">{other.name}</p>
          <p className="truncate text-[12px] text-[#64748B]">{headerSubtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/people/${other.id}`}
            className="hidden h-8 items-center rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-[12.5px] font-semibold text-[#071330] transition hover:bg-[#F8FAFC] sm:inline-flex"
          >
            View profile
          </Link>
          <Link
            href={`/requests/${request.id}`}
            className="inline-flex h-8 items-center rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-[12.5px] font-semibold text-[#071330] transition hover:bg-[#F8FAFC]"
          >
            View request
          </Link>
        </div>
      </header>

      <div
        className="shrink-0 border-b border-[#E2E8F0] bg-[#FAFBFD] px-4 py-2.5 sm:px-5"
        data-testid="messages-task-bar"
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="inline-flex shrink-0 items-center rounded-md border border-[#E2E8F0] bg-white px-2 py-0.5 text-[11.5px] font-semibold text-[#071330]">
            {category.shortLabel}
          </span>
          <span
            className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[11.5px] font-semibold ${statusBadgeClass(request.status)}`}
          >
            {statusLabel(request.status)}
          </span>
          <Link
            href={`/requests/${request.id}`}
            className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-[#071330] hover:text-[#1D5CE5]"
          >
            {request.title}
          </Link>
          <p className="shrink-0 text-[12.5px] font-semibold tabular-nums text-[#334155]">
            {request.whenLabel}
            <span className="mx-1.5 text-[#CBD5E1]" aria-hidden>
              ·
            </span>
            {budgetLabel}
          </p>
        </div>

        {showIncomingAccept && pendingOffer ? (
          <div
            className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#DBEAFE] bg-[#EFF6FF]/70 px-3 py-2"
            data-testid="messages-incoming-offer"
          >
            <p className="min-w-0 text-[12.5px] text-[#334155]">
              <span className="font-medium">Incoming offer:</span>{' '}
              <span className="font-bold tabular-nums text-[#071330]">
                {formatMoney(pendingOffer.price)}
              </span>
              <span className="text-[#64748B]"> · ETA {pendingOffer.eta}</span>
              {pendingOffer.note ? (
                <span className="ml-1 truncate text-[#64748B]">· {pendingOffer.note}</span>
              ) : null}
            </p>
            <button
              type="button"
              onClick={() => void onAcceptOffer()}
              disabled={offerBusy}
              className="inline-flex h-8 shrink-0 items-center rounded-lg bg-[#1D5CE5] px-3.5 text-[12.5px] font-semibold text-white transition hover:bg-[#1649BD] disabled:opacity-60"
            >
              Accept offer
            </button>
          </div>
        ) : null}

        {canSendOffer ? (
          <form
            onSubmit={(e) => void onSendOffer(e)}
            className="mt-2 flex flex-wrap items-center gap-2"
            data-testid="messages-send-offer"
          >
            <label htmlFor="messages-offer-price" className="sr-only">
              Your offer
            </label>
            <div className="relative flex h-8 w-24 items-center rounded-lg border border-[#E2E8F0] bg-white focus-within:border-[#1D5CE5] focus-within:ring-2 focus-within:ring-[#1D5CE5]/20">
              <span className="pl-2.5 text-[13px] font-semibold text-[#64748B]" aria-hidden>
                $
              </span>
              <input
                id="messages-offer-price"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={offerPrice}
                onChange={(e) => setOfferPrice(e.target.value.replace(/[^\d]/g, '').slice(0, 5))}
                placeholder="60"
                required
                data-testid="messages-offer-price"
                className="h-full w-full min-w-0 bg-transparent pr-2 text-[13px] font-semibold tabular-nums text-[#071330] outline-none placeholder:font-normal placeholder:text-[#94A3B8]"
              />
            </div>
            {ETA_CHIPS.map((chip) => {
              const selected = offerEta === chip
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setOfferEta(chip)}
                  className={`inline-flex h-8 items-center rounded-lg px-2.5 text-[12px] font-medium transition ${
                    selected
                      ? 'border border-[#1D5CE5] bg-[#EEF4FF] text-[#1D5CE5]'
                      : 'border border-[#E2E8F0] bg-white text-[#071330] hover:bg-[#F8FAFC]'
                  }`}
                >
                  {chip}
                </button>
              )
            })}
            <button
              type="submit"
              disabled={offerBusy}
              className="inline-flex h-8 items-center rounded-lg bg-[#1D5CE5] px-3.5 text-[12.5px] font-semibold text-white transition hover:bg-[#1649BD] disabled:opacity-60"
            >
              Send offer
            </button>
            {offerError ? (
              <p className="w-full text-[12.5px] text-[#DC2626]" role="alert">
                {offerError}
              </p>
            ) : null}
          </form>
        ) : null}

        {showOfferSent && myPendingOrAny ? (
          <div
            className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[12.5px]"
            data-testid="messages-offer-sent"
          >
            <p className="text-[#334155]">
              <span className="font-semibold text-[#071330]">
                Offer sent · {formatMoney(myPendingOrAny.price)} · ETA {myPendingOrAny.eta}
              </span>
              <span className="text-[#64748B]"> · Waiting on requester</span>
            </p>
            <Link
              href={`/requests/${request.id}`}
              className="font-semibold text-[#1D5CE5] hover:text-[#1649BD]"
            >
              Update on request →
            </Link>
          </div>
        ) : null}

        {jobConfirmed && acceptedOffer ? (
          <div
            className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2"
            data-testid="messages-offer-confirmed"
          >
            <p className="min-w-0 text-[12.5px] text-[#334155]">
              <span className="font-semibold text-[#071330]">
                Confirmed · {formatMoney(acceptedOffer.price)} · ETA {acceptedOffer.eta}
              </span>
              {request.exactAddress ? (
                <span className="text-[#64748B]"> · Meet at {request.exactAddress}</span>
              ) : null}
            </p>
            {canMarkComplete ? (
              <button
                type="button"
                onClick={() => void onMarkComplete()}
                disabled={offerBusy}
                className="inline-flex h-8 shrink-0 items-center rounded-lg bg-[#1D5CE5] px-3.5 text-[12.5px] font-semibold text-white transition hover:bg-[#1649BD] disabled:opacity-60"
              >
                Mark job complete
              </button>
            ) : request.status === 'completed' ? (
              <span className="inline-flex items-center rounded-md bg-[#F1F5F9] px-2 py-0.5 text-[11.5px] font-semibold text-[#475569]">
                Completed
              </span>
            ) : null}
          </div>
        ) : null}

        {showNoOfferYet ? (
          <p className="mt-1.5 text-[12px] text-[#64748B]" data-testid="messages-no-offer-yet">
            No offer yet — coordinate details in chat; their offer will appear here when sent.
          </p>
        ) : null}
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
            <Avatar src={other.avatar} name={other.name} size={44} />
            <p className="mt-3 text-[14px] font-semibold text-[#071330]">{other.name}</p>
            <p className="mt-1 max-w-[36ch] text-[13px] leading-relaxed text-[#64748B]">
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
                    className={`max-w-[min(78%,34rem)] px-4 py-2.5 text-[14.5px] leading-[1.5] ${
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
  )
}
