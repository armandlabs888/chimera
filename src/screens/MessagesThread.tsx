'use client'

import { ArrowLeft, Send } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { Avatar, EmptyState, ButtonLink } from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import { getCategory } from '@/data/categories'
import { formatLocation } from '@/lib/location'
import { relativeTime } from '@/lib/matching'

export function MessagesThread({
  threadId,
  inboxHref = '/messages',
}: {
  threadId: string
  inboxHref?: string
}) {
  const { state, currentUser, sendMessage, getPerson, getRequest } = useBeam()
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const thread = state.threads.find((t) => t.id === threadId)
  const otherId = thread?.participantIds.find((id) => id !== currentUser.id)
  const other = otherId ? getPerson(otherId) : undefined
  const request = thread ? getRequest(thread.requestId) : undefined
  const category = request ? getCategory(request.category) : undefined

  const messages = useMemo(
    () =>
      state.messages
        .filter((m) => m.threadId === threadId)
        .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
    [state.messages, threadId],
  )

  const samePersonThreadCount = !otherId
    ? 0
    : state.threads.filter(
        (t) =>
          t.participantIds.includes(currentUser.id) && t.participantIds.includes(otherId),
      ).length

  useEffect(() => {
    const el = bottomRef.current
    if (!el) return
    const container = el.closest('[data-testid="messages-scroll"]')
    if (container instanceof HTMLElement) {
      container.scrollTop = container.scrollHeight
      return
    }
    // Fallback: never scroll the document (would clip the person header).
    el.scrollIntoView({ block: 'nearest', behavior: 'instant' })
  }, [messages.length])

  if (!thread || !other || !request || !category) {
    return (
      <div
        className="flex min-h-[50vh] flex-1 items-center justify-center bg-white p-6"
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

  const locationLabel = formatLocation(request)
  const firstName = other.name.split(' ')[0] || other.name
  const identityBits = [
    samePersonThreadCount > 1 ? category.shortLabel : null,
    locationLabel,
  ].filter(Boolean)
  const headerSubtitle = identityBits.join(' · ')

  return (
    <section
      className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-white"
      data-testid="messages-conversation"
    >
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[#F1F5F9] bg-white px-4 sm:px-5">
        <Link
          href={inboxHref}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#071330] transition hover:bg-[#F8FAFC] lg:hidden"
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
          {headerSubtitle ? (
            <p className="truncate text-[12px] text-[#64748B]">{headerSubtitle}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Link
            href={`/people/${other.id}`}
            className="hidden text-[12.5px] font-semibold text-[#071330] transition hover:text-[#1D5CE5] sm:inline"
          >
            View profile
          </Link>
          <Link
            href={`/requests/${request.id}`}
            className="text-[12.5px] font-semibold text-[#1D5CE5] transition hover:text-[#1649BD]"
            data-testid="messages-view-request"
          >
            View request
          </Link>
        </div>
      </header>

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
              Ask about timing, parking, stairs, or tools — open the request anytime for offers
              and details.
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
                    className={`max-w-[min(78%,34rem)] px-4 py-2.5 text-[14.5px] leading-[1.5] break-words ${
                      mine
                        ? 'rounded-lg rounded-br-sm bg-[#1D5CE5] text-white'
                        : 'rounded-lg rounded-bl-sm border border-[rgba(7,19,48,0.06)] bg-[#F4F8FD] text-[#071330]'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.body}</p>
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
        className="shrink-0 border-t border-[#F1F5F9] bg-white px-4 py-3 sm:px-5"
        data-testid="messages-composer"
      >
        <div className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] py-1.5 pl-3.5 pr-1.5 transition focus-within:border-[#1D5CE5] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#1D5CE5]/12">
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
