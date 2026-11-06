'use client'

import { ArrowLeft, Send } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { EmptyState, ButtonLink, TextInput, Badge } from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import { relativeTime } from '@/lib/matching'

export function MessagesThread({
  threadId,
  inboxHref = '/messages',
}: {
  threadId: string
  inboxHref?: string
}) {
  const { state, currentUser, sendMessage, getPerson, getRequest, mode } = useBeam()
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const thread = state.threads.find((t) => t.id === threadId)
  const otherId = thread?.participantIds.find((id) => id !== currentUser.id)
  const other = otherId ? getPerson(otherId) : undefined
  const request = thread ? getRequest(thread.requestId) : undefined

  const messages = useMemo(
    () =>
      state.messages
        .filter((m) => m.threadId === threadId)
        .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
    [state.messages, threadId],
  )

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    bottomRef.current?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth' })
  }, [messages.length])

  if (!thread || !other || !request) {
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
      await sendMessage(threadId, outgoing, { simulateReply: mode === 'demo' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex h-full min-h-[60vh] flex-col bg-beam-base md:min-h-[70vh]">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-beam-line bg-beam-base/95 px-3 py-2.5 backdrop-blur-sm">
        <Link
          href={inboxHref}
          className="touch-target inline-flex items-center justify-center rounded-[8px] text-beam-cream md:hidden"
          aria-label="Back to inbox"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <img src={other.avatar} alt="" className="h-9 w-9 rounded-[8px] object-cover" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-beam-cream">{other.name}</p>
          <p className="truncate type-meta text-beam-muted">{request.title}</p>
        </div>
        <Badge tone="outline">{request.status}</Badge>
        <Link
          href={`/requests/${request.id}`}
          className="btn-compact hidden rounded-[8px] border border-beam-line px-3 text-[12px] font-medium text-beam-cream-dim hover:bg-beam-surface-2 sm:inline-flex"
        >
          Request
        </Link>
      </header>

      <div className="flex-1 space-y-2.5 overflow-y-auto px-4 py-4">
        {messages.map((message) => {
          const mine = message.senderId === currentUser.id
          return (
            <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-[12px] px-3.5 py-2.5 type-sec leading-relaxed ${
                  mine
                    ? 'rounded-br-md bg-beam-charcoal text-white'
                    : 'rounded-bl-md border border-beam-line bg-beam-surface-2 text-beam-cream'
                }`}
              >
                <p>{message.body}</p>
                <p className={`mt-1 type-meta ${mine ? 'text-white/70' : 'text-beam-muted'}`}>
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
        className="safe-bottom sticky bottom-0 border-t border-beam-line bg-beam-base/95 px-3 pt-2.5 backdrop-blur-sm"
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
            className="touch-target inline-flex items-center justify-center rounded-[10px] bg-beam-amber px-3.5 text-[#FAF8F4] disabled:opacity-40"
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
