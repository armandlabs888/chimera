'use client'

import { ArrowLeft, ExternalLink, Send, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Avatar, EmptyState } from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import { formatLocation } from '@/lib/location'
import { formatBudget } from '@/lib/matching'
import { formatCategoryLabel } from '@/lib/taxonomy'
import type { Message, RequestStatus } from '@/types'

function dayLabel(iso: string): string {
  const date = new Date(iso)
  const start = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime()
  const diff = Math.round((start(new Date()) - start(date)) / 86_400_000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function statusText(status: RequestStatus): string {
  if (status === 'open') return 'Open'
  if (status === 'accepted') return 'Accepted'
  if (status === 'completed') return 'Completed'
  if (status === 'cancelled') return 'Cancelled'
  return status
}

type FeedItem =
  | { kind: 'sep'; label: string; key: string }
  | { kind: 'group'; mine: boolean; time: string; bodies: string[]; key: string }

function buildFeed(messages: Message[], myId: string): FeedItem[] {
  const items: FeedItem[] = []
  let lastDay = ''
  let group: { mine: boolean; time: string; bodies: string[]; key: string } | null = null
  const flush = () => {
    if (!group) return
    items.push({ kind: 'group', ...group })
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
    if (group && group.mine === mine) {
      group.bodies.push(message.body)
      group.time = clockTime(message.createdAt)
    } else {
      flush()
      group = {
        mine,
        time: clockTime(message.createdAt),
        bodies: [message.body],
        key: message.id,
      }
    }
  }
  flush()
  return items
}

export function MessagesChatPanel({
  threadId,
  onBack,
  onClose,
}: {
  threadId: string
  onBack: () => void
  onClose: () => void
}) {
  const { state, currentUser, sendMessage, getPerson, getRequest } = useBeam()
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const feedRef = useRef<HTMLDivElement>(null)

  const thread = state.threads.find((item) => item.id === threadId)
  const otherId = thread?.participantIds.find((id) => id !== currentUser.id)
  const other = otherId ? getPerson(otherId) : undefined
  const isDirect = Boolean(thread && thread.requestId == null)
  const request = thread?.requestId ? getRequest(thread.requestId) : undefined
  const categoryLabel = request
    ? formatCategoryLabel(request.category, request.categoryCustom)
    : undefined

  const messages = useMemo(
    () =>
      state.messages
        .filter((message) => message.threadId === threadId)
        .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
    [state.messages, threadId],
  )

  const feed = useMemo(() => buildFeed(messages, currentUser.id), [messages, currentUser.id])

  useEffect(() => {
    const el = feedRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages.length, threadId])

  if (!thread || !other || (!isDirect && (!request || !categoryLabel))) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-white" data-testid="messages-thread-missing">
        <div className="flex h-16 shrink-0 items-center justify-end border-b border-[#E3E8EF] px-2">
          <button
            type="button"
            className="messages-back h-9 w-9 place-items-center rounded-[9px] text-[#071330] hover:bg-[#F4F8FD]"
            aria-label="Back to conversations"
            data-testid="messages-back"
            onClick={onBack}
          >
            <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={1.9} />
          </button>
          <span className="flex-1" />
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-[9px] text-[#071330] hover:bg-[#F4F8FD]"
            aria-label="Close conversation"
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

  async function onSend(event: FormEvent) {
    event.preventDefault()
    if (!body.trim() || sending) return
    const outgoing = body
    setBody('')
    setSending(true)
    try {
      await sendMessage(threadId, outgoing)
    } finally {
      setSending(false)
    }
  }

  const neighborhood = formatLocation(other)
  const firstName = other.name.split(' ')[0] || other.name
  const budgetLabel = request ? formatBudget(request) : ''
  const budgetText = budgetLabel.startsWith('$') ? `${budgetLabel} budget` : budgetLabel
  const status = request ? statusText(request.status) : ''
  const statusLive = request
    ? request.status === 'open' || request.status === 'accepted'
    : false

  return (
    <section
      className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-white"
      data-testid="messages-conversation"
    >
      <header className="flex h-16 shrink-0 items-center gap-2.5 border-b border-[#E3E8EF] px-2.5 sm:px-4">
        <button
          type="button"
          className="messages-back h-9 w-9 shrink-0 place-items-center rounded-[9px] text-[#071330] hover:bg-[#F4F8FD]"
          aria-label="Back to conversations"
          data-testid="messages-back"
          onClick={onBack}
        >
          <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={1.9} />
        </button>
        <Link
          href={`/people/${other.id}`}
          className="shrink-0 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D5CE5]"
        >
          <Avatar src={other.avatar} name={other.name} size={38} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold leading-tight text-[#071330]">{other.name}</p>
          <p className="truncate text-[12.5px] text-[#3D4A5F]">{neighborhood}</p>
        </div>
        <Link
          href={`/people/${other.id}`}
          data-testid="messages-view-profile"
          className="messages-view-profile shrink-0 rounded-lg px-2 py-1.5 text-[13px] font-semibold text-[#071330] hover:bg-[#F4F8FD]"
        >
          View profile
        </Link>
        <button
          type="button"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-[#071330] hover:bg-[#F4F8FD]"
          aria-label="Close conversation"
          data-testid="messages-chat-close"
          onClick={onClose}
        >
          <X className="h-[18px] w-[18px]" strokeWidth={1.9} />
        </button>
      </header>

      {request && categoryLabel ? (
        <div className="shrink-0 border-b border-[#E3E8EF] bg-[#FBFCFE] px-3 py-3 sm:px-4">
          <div
            className="flex items-center gap-3 rounded-xl border border-[#E3E8EF] bg-white p-2.5"
            data-testid="messages-job-strip"
          >
            {request.image ? (
              <img
                src={request.image}
                alt=""
                className="h-11 w-11 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <span className="h-11 w-11 shrink-0 rounded-lg bg-[#E8EEF7]" aria-hidden />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold text-[#071330]">{request.title}</p>
              <p className="mt-px truncate text-[12.5px] text-[#273449]">
                <span className="messages-job-category">{categoryLabel} · </span>
                {budgetText}
                {' · '}
                <span
                  className={`inline-flex items-center gap-1 font-semibold ${
                    statusLive ? 'text-[#0F5132]' : 'text-[#3D4A5F]'
                  }`}
                >
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      statusLive ? 'bg-[#1F9D55]' : 'bg-[#94A3B8]'
                    }`}
                    aria-hidden
                  />
                  {status}
                </span>
              </p>
            </div>
            <Link
              href={`/requests/${request.id}`}
              data-testid="messages-view-request"
              className="inline-flex h-[34px] shrink-0 items-center gap-1 rounded-[9px] border border-[#CDD5E0] px-2.5 text-[13px] font-semibold text-[#071330] hover:bg-[#F4F8FD]"
            >
              <span className="messages-view-request-full">View request</span>
              <span className="messages-view-request-short">View</span>
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.9} />
            </Link>
          </div>
        </div>
      ) : (
        <div className="shrink-0 border-b border-[#E3E8EF] bg-[#FBFCFE] px-3 py-3 sm:px-4">
          <div
            className="rounded-xl border border-[#E3E8EF] bg-white px-3 py-2.5"
            data-testid="messages-direct-strip"
          >
            <p className="text-[14px] font-semibold text-[#071330]">Direct message</p>
            <p className="mt-px text-[12.5px] text-[#273449]">
              Chat with {firstName} before booking a job.
            </p>
          </div>
        </div>
      )}

      <div
        ref={feedRef}
        className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-4 py-2"
        data-testid="messages-scroll"
      >
        {messages.length === 0 ? (
          <div
            className="flex flex-1 flex-col items-center justify-center px-4 py-8 text-center"
            data-testid="messages-empty-starter"
          >
            <Avatar src={other.avatar} name={other.name} size={44} />
            <p className="mt-3 text-[14px] font-semibold text-[#071330]">{other.name}</p>
            <p className="mt-1 max-w-[36ch] text-[13px] leading-relaxed text-[#64748B]">
              Ask about timing, parking, stairs, or tools — open the request anytime for offers
              and details.
            </p>
          </div>
        ) : (
          feed.map((item) => {
            if (item.kind === 'sep') {
              return (
                <div
                  key={item.key}
                  className="my-2.5 flex items-center gap-3 text-[12px] font-semibold tracking-[0.02em] text-[#3D4A5F]"
                >
                  <span className="h-px flex-1 bg-[#E3E8EF]" />
                  {item.label}
                  <span className="h-px flex-1 bg-[#E3E8EF]" />
                </div>
              )
            }
            return (
              <div
                key={item.key}
                className={`mt-1.5 flex flex-col gap-0.5 ${
                  item.mine ? 'items-end' : 'relative items-start pl-9'
                }`}
              >
                {item.mine ? null : (
                  <span className="absolute bottom-5 left-0">
                    <Avatar src={other.avatar} name={other.name} size={28} />
                  </span>
                )}
                {item.bodies.map((text, index) => {
                  const last = index === item.bodies.length - 1
                  return (
                    <div
                      key={`${item.key}-${index}`}
                      className={`max-w-[78%] px-3.5 py-2 text-[14.5px] leading-[1.48] break-words ${
                        item.mine
                          ? `bg-[#1D5CE5] text-white ${last ? 'rounded-xl rounded-br-[4px]' : 'rounded-xl'}`
                          : `border border-[#DCE6F5] bg-[#F4F8FD] text-[#071330] ${
                              last ? 'rounded-xl rounded-bl-[4px]' : 'rounded-xl'
                            }`
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{text}</p>
                    </div>
                  )
                })}
                <div className="mt-0.5 text-[11.5px] tabular-nums text-[#3D4A5F]">{item.time}</div>
              </div>
            )
          })
        )}
      </div>

      <form
        onSubmit={onSend}
        className="shrink-0 border-t border-[#E3E8EF] px-3 py-3 sm:px-4"
        data-testid="messages-composer"
      >
        <div className="flex items-center gap-2 rounded-xl border border-[#CDD5E0] bg-white py-1 pl-3.5 pr-1">
          <input
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={`Message ${firstName}…`}
            className="h-9 min-w-0 flex-1 bg-transparent text-[14.5px] text-[#071330] outline-none placeholder:text-[#55627A]"
            disabled={sending}
            aria-label="Message"
            data-testid="messages-composer-input"
          />
          <button
            type="submit"
            data-testid="messages-send"
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-[9px] ${
              body.trim() && !sending
                ? 'bg-[#1D5CE5] text-white hover:bg-[#1649BD]'
                : 'bg-[#E3E8EF] text-[#55627A]'
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
