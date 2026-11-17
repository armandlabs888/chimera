'use client'

import {
  ArrowLeft,
  ChevronDown,
  Settings,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { Avatar, EmptyState, FormErrorAlert } from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import { FORM_SEND_FAILED, humanizeSaveError } from '@/lib/formErrors'
import { jobThreadSubtitle } from '@/lib/messagesJobLabel'
import { clockTime, dayLabel } from '@/lib/messagesTime'
import { formatBudget } from '@/lib/matching'
import { formatCategoryLabel } from '@/lib/taxonomy'
import type { HelpRequest, Message } from '@/types'

type FeedItem =
  | { kind: 'sep'; label: string; key: string }
  | {
      kind: 'group'
      mine: boolean
      senderId: string
      name: string
      time: string
      bodies: string[]
      key: string
    }

function buildFeed(messages: Message[], myId: string, otherName: string): FeedItem[] {
  const items: FeedItem[] = []
  let lastDay = ''
  let group: Extract<FeedItem, { kind: 'group' }> | null = null
  const flush = () => {
    if (!group) return
    items.push(group)
    group = null
  }
  for (const message of messages) {
    const day = dayLabel(message.createdAt)
    if (day !== lastDay) {
      flush()
      items.push({ kind: 'sep', label: day, key: `sep-${message.id}` })
      lastDay = day
    }
    const mine = message.senderId === myId
    if (group && group.senderId === message.senderId) {
      group.bodies.push(message.body)
      group.time = clockTime(message.createdAt)
    } else {
      flush()
      group = {
        kind: 'group',
        mine,
        senderId: message.senderId,
        name: mine ? 'You' : otherName,
        time: clockTime(message.createdAt),
        bodies: [message.body],
        key: message.id,
      }
    }
  }
  flush()
  return items
}

function requestIdFromBody(body: string): string | null {
  const match = body.match(/\/requests\/([A-Za-z0-9_-]+)/)
  return match?.[1] ?? null
}

function OfferPill({
  label,
  tone,
}: {
  label: string
  tone: 'ok' | 'wait'
}) {
  return (
    <span
      data-testid="messages-offer-pill"
      className={`inline-flex h-5 shrink-0 items-center rounded-full px-1.5 text-[11px] font-bold ${
        tone === 'ok' ? 'bg-[#E8F6EC] text-[#166534]' : 'bg-[rgba(29,92,229,0.1)] text-[#1649BD]'
      }`}
    >
      {label}
    </span>
  )
}

function JobPreviewCard({ request }: { request: HelpRequest }) {
  const category = formatCategoryLabel(request.category, request.categoryCustom)
  const zip = (request.zip ?? '').trim()
  const budget = formatBudget(request)
  const meta = [category, zip || null, budget].filter(Boolean).join(' · ')
  return (
    <Link
      href={`/requests/${request.id}`}
      data-testid="messages-job-card"
      className="mt-2 grid max-w-[340px] grid-cols-[minmax(0,1fr)_64px] gap-2 overflow-hidden rounded-xl border border-[#D7E0EC] bg-[#F7F9FC] text-inherit no-underline hover:bg-[#EEF2F7]"
    >
      <span className="px-2.5 py-2">
        <span className="block text-[13.5px] font-bold tracking-[-0.01em] text-[#071330]">
          {request.title}
        </span>
        <span className="mt-0.5 block text-[12.5px] text-[#4A5568]">{meta}</span>
        <span className="mt-1.5 block text-[12.5px] font-bold text-[#1649BD]">View job</span>
      </span>
      {request.image ? (
        <img src={request.image} alt="" className="h-full min-h-[64px] w-full object-cover" />
      ) : (
        <span className="bg-[#EEF2F7]" aria-hidden />
      )}
    </Link>
  )
}

export function MessagesChatPanel({
  threadId,
  onBack,
  onClose,
  onMinimize,
  showDesktopChrome = true,
}: {
  threadId: string
  onBack: () => void
  onClose: () => void
  onMinimize?: () => void
  showDesktopChrome?: boolean
}) {
  const router = useRouter()
  const { state, currentUser, sendMessage, getPerson, getRequest } = useBeam()
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const emptyHintId = 'messages-composer-empty-hint'
  const feedRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const thread = state.threads.find((item) => item.id === threadId)
  const otherId = thread?.participantIds.find((id) => id !== currentUser.id)
  const other = otherId ? getPerson(otherId) : undefined
  const isDirect = Boolean(thread && thread.requestId == null)
  const request = thread?.requestId ? getRequest(thread.requestId) : undefined
  const categoryLabel = request
    ? formatCategoryLabel(request.category, request.categoryCustom)
    : undefined
  const jobSubtitle = jobThreadSubtitle(request)

  const offer = useMemo(() => {
    if (!request || !otherId) return null
    const related = state.offers.filter(
      (item) =>
        item.requestId === request.id &&
        (item.helperId === otherId || item.helperId === currentUser.id),
    )
    return (
      related.find((item) => item.status === 'accepted') ??
      related.find((item) => item.status === 'pending') ??
      null
    )
  }, [state.offers, request, otherId, currentUser.id])

  const offerPill =
    offer?.status === 'accepted'
      ? { label: 'Offer accepted', tone: 'ok' as const }
      : offer?.status === 'pending'
        ? { label: 'Offer pending', tone: 'wait' as const }
        : request?.status === 'accepted'
          ? { label: 'Offer accepted', tone: 'ok' as const }
          : null

  const messages = useMemo(
    () =>
      state.messages
        .filter((message) => message.threadId === threadId)
        .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
    [state.messages, threadId],
  )

  const feed = useMemo(
    () => buildFeed(messages, currentUser.id, other?.name ?? 'Neighbor'),
    [messages, currentUser.id, other?.name],
  )

  const fallbackJobCardGroupKey = useMemo(() => {
    if (!request) return null
    if (messages.some((message) => requestIdFromBody(message.body))) return null
    const firstOwn = feed.find(
      (item) =>
        item.kind === 'group' &&
        item.mine &&
        !item.bodies.some((text) => requestIdFromBody(text)),
    )
    return firstOwn && firstOwn.kind === 'group' ? firstOwn.key : null
  }, [feed, messages, request])

  useEffect(() => {
    const el = feedRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages.length, threadId])

  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 80)}px`
  }, [body])

  if (!thread || !other || (!isDirect && (!request || !categoryLabel))) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-white" data-testid="messages-thread-missing">
        <div className="flex h-14 shrink-0 items-center gap-1 border-b border-[#E3E8EF] px-2">
          <button
            type="button"
            className="messages-back grid h-8 w-8 place-items-center rounded-lg text-[#071330] hover:bg-[#EEF2F7]"
            aria-label="Back to messages"
            data-testid="messages-back"
            onClick={onBack}
          >
            <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={1.9} />
          </button>
          <span className="flex-1" />
          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-lg text-[#071330] hover:bg-[#EEF2F7]"
            aria-label="Close messages"
            data-testid="messages-chat-close"
            onClick={onClose}
          >
            <X className="h-[18px] w-[18px]" strokeWidth={1.9} />
          </button>
        </div>
        <div className="flex flex-1 items-center justify-center p-6">
          <EmptyState
            title="Thread not found"
            body="Open a conversation from a request or your inbox."
            action={
              <button
                type="button"
                onClick={onBack}
                className="inline-flex h-10 items-center justify-center rounded-[10px] bg-[#1D5CE5] px-4 text-[14px] font-semibold text-white hover:bg-[#1649BD]"
              >
                Back to inbox
              </button>
            }
          />
        </div>
      </div>
    )
  }

  async function onSend(event?: FormEvent) {
    event?.preventDefault()
    if (!body.trim() || sending) return
    const outgoing = body
    setBody('')
    setSending(true)
    setSendError('')
    try {
      await sendMessage(threadId, outgoing)
    } catch (err) {
      setBody(outgoing)
      setSendError(humanizeSaveError(err, FORM_SEND_FAILED))
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void onSend()
    }
  }

  const firstName = other.name.split(' ')[0] || other.name
  const canSend = Boolean(body.trim()) && !sending

  return (
    <section
      className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-white"
      data-testid="messages-conversation"
    >
      <header className="flex min-h-[60px] shrink-0 items-center gap-2.5 border-b border-[#E3E8EF] py-2 pl-3.5 pr-2">
        <button
          type="button"
          className="messages-back grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#071330] hover:bg-[#EEF2F7]"
          aria-label="Back to messages"
          data-testid="messages-back"
          onClick={onBack}
        >
          <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={1.9} />
        </button>
        <Link
          href={`/people/${other.id}`}
          aria-label={`View ${other.name}'s profile`}
          className="shrink-0 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D5CE5]"
        >
          <Avatar src={other.avatar} name={other.name} size={32} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 items-center gap-2 text-[15px] font-bold leading-tight tracking-[-0.01em] text-[#071330]">
            <span className="truncate">{other.name}</span>
            {offerPill ? <OfferPill label={offerPill.label} tone={offerPill.tone} /> : null}
          </p>
          <p
            className="mt-0.5 flex min-w-0 items-center gap-2 text-[12.5px] text-[#4A5568]"
            data-testid={request ? 'messages-job-strip' : 'messages-direct-strip'}
          >
            {request ? (
              <>
                <Link
                  href={`/requests/${request.id}`}
                  className="truncate font-semibold text-[#1649BD] hover:underline"
                >
                  {jobSubtitle}
                </Link>
                <Link
                  href={`/requests/${request.id}`}
                  data-testid="messages-view-request"
                  className="messages-view-job-extra shrink-0 font-semibold text-[#1649BD] hover:underline"
                >
                  View job
                </Link>
              </>
            ) : (
              <span>Direct message</span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-lg text-[#071330] hover:bg-[#EEF2F7]"
            aria-label="Conversation settings"
            data-testid="messages-settings"
            onClick={() => router.push(`/people/${other.id}`)}
          >
            <Settings className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </button>
          {showDesktopChrome ? (
            <button
              type="button"
              className="messages-hide-mobile grid h-8 w-8 place-items-center rounded-lg text-[#071330] hover:bg-[#EEF2F7]"
              aria-label="Minimize"
              data-testid="messages-minimize"
              onClick={onMinimize}
            >
              <ChevronDown className="h-[18px] w-[18px]" strokeWidth={1.9} />
            </button>
          ) : null}
          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-lg text-[#071330] hover:bg-[#EEF2F7]"
            aria-label="Close messages"
            data-testid="messages-chat-close"
            onClick={onClose}
          >
            <X className="h-[18px] w-[18px]" strokeWidth={1.9} />
          </button>
        </div>
      </header>

      <div
        ref={feedRef}
        className="min-h-0 flex-1 overflow-y-auto px-4 pb-1.5 pt-3"
        data-testid="messages-scroll"
      >
        {messages.length === 0 ? (
          <div
            className="flex h-full flex-col items-center justify-center px-4 py-8 text-center"
            data-testid="messages-empty-starter"
          >
            <Avatar src={other.avatar} name={other.name} size={44} />
            <p className="mt-3 text-[14px] font-semibold text-[#071330]">{other.name}</p>
            <p className="mt-1 max-w-[36ch] text-[13px] leading-relaxed text-[#4A5568]">
              {isDirect
                ? `Ask ${firstName} about timing, parking, stairs, or tools before you book.`
                : 'Ask about timing, parking, stairs, or tools. Open the request anytime for offers and details.'}
            </p>
          </div>
        ) : (
          feed.map((item) => {
            if (item.kind === 'sep') {
              return (
                <div
                  key={item.key}
                  className="my-1.5 mb-3 flex items-center gap-3 text-[12px] font-semibold text-[#4A5568]"
                >
                  <span className="h-px flex-1 bg-[#E3E8EF]" />
                  {item.label}
                  <span className="h-px flex-1 bg-[#E3E8EF]" />
                </div>
              )
            }
            const avatarPerson = item.mine ? currentUser : other
            const showFallbackCard = Boolean(request) && item.key === fallbackJobCardGroupKey
            return (
              <div
                key={item.key}
                className="mb-3 grid grid-cols-[32px_minmax(0,1fr)] gap-2.5"
              >
                <Avatar src={avatarPerson.avatar} name={avatarPerson.name} size={28} />
                <div className="min-w-0">
                  <div className="mb-0.5 flex items-baseline gap-2 leading-tight">
                    <span className="text-[13.5px] font-bold text-[#071330]">{item.name}</span>
                    <span className="text-[12px] tabular-nums text-[#4A5568]">{item.time}</span>
                  </div>
                  {item.bodies.map((text, index) => {
                    const linkedRequestId = requestIdFromBody(text)
                    const linkedRequest = linkedRequestId
                      ? getRequest(linkedRequestId)
                      : undefined
                    return (
                      <div key={`${item.key}-${index}`} className={index > 0 ? 'mt-1.5' : undefined}>
                        <p className="whitespace-pre-wrap text-[14.5px] leading-[1.45] text-[#071330]">
                          {text}
                        </p>
                        {linkedRequest ? <JobPreviewCard request={linkedRequest} /> : null}
                      </div>
                    )
                  })}
                  {showFallbackCard && request ? <JobPreviewCard request={request} /> : null}
                </div>
              </div>
            )
          })
        )}
      </div>

      <form
        onSubmit={(event) => void onSend(event)}
        className="shrink-0 px-3 pb-2.5 pt-2"
        data-testid="messages-composer"
      >
        {sendError ? (
          <FormErrorAlert
            className="mb-2"
            message={sendError}
            testId="messages-send-error"
          />
        ) : null}
        <div className="flex flex-col gap-1 rounded-[18px] bg-[#EEF2F7] px-3.5 py-2 focus-within:shadow-[0_0_0_2px_rgba(29,92,229,0.2)]">
          <textarea
            ref={inputRef}
            value={body}
            onChange={(event) => {
              setBody(event.target.value)
              if (sendError) setSendError('')
            }}
            onKeyDown={onComposerKeyDown}
            placeholder={`Message ${firstName}`}
            rows={1}
            className="max-h-20 min-h-6 w-full resize-none bg-transparent py-1 text-[14.5px] leading-[1.4] text-[#071330] outline-none placeholder:text-[#5B6576]"
            disabled={sending}
            aria-label="Message"
            aria-describedby={!canSend && !sending ? emptyHintId : undefined}
            data-testid="messages-composer-input"
          />
          <p id={emptyHintId} className="sr-only">
            Type a message to send.
          </p>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              className="grid h-[30px] w-[30px] place-items-center rounded-lg text-[#4A5568] hover:bg-white/70"
              aria-label="Attach a photo"
              data-testid="messages-attach"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <circle cx="8.5" cy="9.5" r="1.5" />
                <path d="m21 15-5-5L5 19" />
              </svg>
            </button>
            <button
              type="button"
              className="grid h-[30px] w-[30px] place-items-center rounded-lg text-[#4A5568] hover:bg-white/70"
              aria-label="Add an emoji"
              data-testid="messages-emoji"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <circle cx="9" cy="10" r="0.8" fill="currentColor" />
                <circle cx="15" cy="10" r="0.8" fill="currentColor" />
              </svg>
            </button>
            <button
              type="submit"
              data-testid="messages-send"
              className={`ml-auto grid h-[30px] w-[30px] place-items-center rounded-lg ${
                canSend ? 'text-[#1D5CE5] hover:bg-[rgba(29,92,229,0.1)]' : 'text-[#4A5568]'
              }`}
              disabled={!canSend}
              aria-label="Send"
              aria-describedby={!canSend && !sending ? emptyHintId : undefined}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </div>
      </form>
    </section>
  )
}
