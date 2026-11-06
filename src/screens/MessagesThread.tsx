'use client'

import { ArrowLeft, CheckCircle2, Send } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { EmptyState, Button, ButtonLink, TextInput, Badge } from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import { getCategory } from '@/data/categories'
import { formatLocation } from '@/lib/location'
import { formatMoney, relativeTime } from '@/lib/matching'

function statusTone(
  status: string,
): 'neutral' | 'amber' | 'live' | 'success' | 'outline' {
  if (status === 'open') return 'amber'
  if (status === 'accepted') return 'live'
  if (status === 'completed') return 'success'
  return 'outline'
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
  const [offerPrice, setOfferPrice] = useState(40)
  const [offerEta, setOfferEta] = useState('Within 1 hour')
  const [offerBusy, setOfferBusy] = useState(false)
  const [offerError, setOfferError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

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
    if (request?.budget && request.budget > 0) setOfferPrice(request.budget)
  }, [request?.budget, request?.id])

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    bottomRef.current?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth' })
  }, [messages.length])

  if (!thread || !other || !request || !category) {
    return (
      <div className="px-4 py-10">
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
    if (offerPrice < 5) {
      setOfferError('Name a real price before you show up.')
      return
    }
    setOfferBusy(true)
    setOfferError('')
    try {
      await createOffer({
        requestId: request.id,
        price: offerPrice,
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

  const locationLabel = request ? formatLocation(request) : 'Local area'
  const canMarkComplete =
    jobConfirmed &&
    request.status === 'accepted' &&
    (isRequester || request.helperId === currentUser.id)

  return (
    <div className="flex h-full min-h-[60vh] flex-col bg-[#F4F8FD] md:min-h-[70vh]">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-[rgba(7,19,48,0.1)] bg-white/95 px-3 py-2.5 backdrop-blur-sm">
        <Link
          href={inboxHref}
          className="touch-target inline-flex items-center justify-center rounded-[8px] text-[#071330] md:hidden"
          aria-label="Back to inbox"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <img src={other.avatar} alt="" className="h-9 w-9 rounded-[8px] object-cover" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-[#071330]">{other.name}</p>
          <p className="truncate type-meta text-[#64748B]">{request.title}</p>
        </div>
        <Badge tone={statusTone(request.status)}>{request.status}</Badge>
        <Link
          href={`/requests/${request.id}`}
          className="btn-compact hidden rounded-full border border-[rgba(7,19,48,0.12)] bg-white px-3 text-[12px] font-semibold text-[#475569] hover:bg-[#F4F8FD] sm:inline-flex"
        >
          Request
        </Link>
      </header>

      {/* Pinned Job & Offer Context Card */}
      <div className="border-b border-[rgba(7,19,48,0.08)] bg-white px-4 py-3">
        <div className="rounded-[14px] border border-[rgba(7,19,48,0.1)] bg-[#F4F8FD] p-3.5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold text-[#071330]">{request.title}</p>
              <p className="mt-1 text-[13px] text-[#64748B]">
                {category.shortLabel}
                <span className="mx-1.5 text-[#CBD5E1]" aria-hidden>
                  ·
                </span>
                {locationLabel}
              </p>
            </div>
            <Badge tone={statusTone(request.status)}>{request.status}</Badge>
          </div>

          {jobConfirmed && acceptedOffer ? (
            <div className="mt-3 space-y-2 border-t border-[rgba(7,19,48,0.08)] pt-3">
              <p className="text-[14px] font-semibold text-[#071330]">
                Confirmed {formatMoney(acceptedOffer.price)}
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
                  size="sm"
                  onClick={() => void onMarkComplete()}
                  loading={offerBusy}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Mark complete
                </Button>
              ) : request.status === 'completed' ? (
                <p className="text-[13px] font-medium text-emerald-700">Job completed</p>
              ) : null}
            </div>
          ) : pendingOffer ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[rgba(7,19,48,0.08)] pt-3">
              <p className="text-[14px] font-semibold text-[#071330]">
                Offer {formatMoney(pendingOffer.price)}
                <span className="font-medium text-[#64748B]"> · ETA {pendingOffer.eta}</span>
              </p>
              {isRequester && request.status === 'open' ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void onAcceptOffer()}
                  loading={offerBusy}
                >
                  Accept offer
                </Button>
              ) : pendingOffer.helperId === currentUser.id ? (
                <span className="text-[12px] font-semibold text-[#64748B]">Waiting on requester</span>
              ) : null}
            </div>
          ) : !isRequester && request.status === 'open' && !myPendingOrAny ? (
            <form
              onSubmit={(e) => void onSendOffer(e)}
              className="mt-3 space-y-2 border-t border-[rgba(7,19,48,0.08)] pt-3"
            >
              <p className="text-[13px] font-semibold text-[#071330]">Send offer</p>
              <div className="flex flex-wrap items-end gap-2">
                <label className="min-w-[5.5rem] flex-1">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                    Price
                  </span>
                  <TextInput
                    type="number"
                    min={5}
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(Number(e.target.value))}
                    className="!rounded-xl !py-1.5 text-[14px]"
                    required
                  />
                </label>
                <label className="min-w-[8rem] flex-[1.4]">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                    ETA
                  </span>
                  <TextInput
                    value={offerEta}
                    onChange={(e) => setOfferEta(e.target.value)}
                    placeholder="Within 1 hour"
                    className="!rounded-xl !py-1.5 text-[14px]"
                    required
                  />
                </label>
                <Button type="submit" size="sm" loading={offerBusy}>
                  Send offer
                </Button>
              </div>
              {offerError ? (
                <p className="text-[13px] text-red-600" role="alert">
                  {offerError}
                </p>
              ) : null}
            </form>
          ) : null}
        </div>
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto px-4 py-4">
        {messages.map((message) => {
          const mine = message.senderId === currentUser.id
          return (
            <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-[12px] px-3.5 py-2.5 type-sec leading-relaxed ${
                  mine
                    ? 'rounded-br-md bg-[#1D5CE5] text-white'
                    : 'rounded-bl-md border border-[rgba(7,19,48,0.1)] bg-white text-[#071330]'
                }`}
              >
                <p>{message.body}</p>
                <p className={`mt-1 type-meta ${mine ? 'text-white/70' : 'text-[#94A3B8]'}`}>
                  {relativeTime(message.createdAt)}
                  {message.isSimulated ? ' · reply' : ''}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={onSend}
        className="safe-bottom sticky bottom-0 border-t border-[rgba(7,19,48,0.1)] bg-white/95 px-3 pt-2.5 backdrop-blur-sm"
      >
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <TextInput
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Message about timing, access, details…"
            className="flex-1"
            disabled={sending}
          />
          <button
            type="submit"
            className="touch-target inline-flex items-center justify-center rounded-[10px] bg-[#1D5CE5] px-3.5 text-white disabled:opacity-40"
            disabled={!body.trim() || sending}
            aria-label="Send"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  )
}
