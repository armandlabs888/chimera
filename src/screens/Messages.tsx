'use client'

import { ArrowLeft, Send } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { EmptyState, ButtonLink, TextInput } from '../components/ui'
import { useBeam } from '../context/BeamContext'
import { relativeTime } from '../lib/matching'

function paramId(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

export function Messages() {
  const params = useParams()
  const threadId = paramId(params.threadId)
  const { state, currentUser, sendMessage, getPerson, getRequest, mode } = useBeam()
  const [body, setBody] = useState('')
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
          body="Open a conversation from a request or your You tab."
          action={<ButtonLink href="/you">Back to You</ButtonLink>}
        />
      </div>
    )
  }

  async function onSend(e: FormEvent) {
    e.preventDefault()
    if (!body.trim() || !threadId) return
    const outgoing = body
    setBody('')
    await sendMessage(threadId, outgoing, { simulateReply: mode === 'demo' })
  }

  return (
    <div className="flex min-h-dvh flex-col bg-beam-base">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-beam-line bg-beam-base/95 px-3 py-2.5 backdrop-blur-sm">
        <Link
          href={`/requests/${request.id}`}
          className="touch-target inline-flex items-center justify-center rounded-[8px] text-beam-cream"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <img src={other.avatar} alt="" className="h-9 w-9 rounded-[8px] object-cover" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-beam-cream">{other.name}</p>
          <p className="truncate type-meta text-beam-muted">{request.title}</p>
        </div>
      </header>

      <div className="flex-1 space-y-2.5 overflow-y-auto px-4 py-4">
        {messages.map((message) => {
          const mine = message.senderId === currentUser.id
          return (
            <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-[12px] px-3.5 py-2.5 type-sec leading-relaxed ${
                  mine
                    ? 'rounded-br-md bg-beam-amber text-beam-charcoal'
                    : 'rounded-bl-md border border-beam-line bg-beam-ink text-beam-cream'
                }`}
              >
                <p>{message.body}</p>
                <p className={`mt-1 type-meta ${mine ? 'text-beam-charcoal/70' : 'text-beam-muted'}`}>
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
          />
          <button
            type="submit"
            className="touch-target inline-flex items-center justify-center rounded-[10px] bg-beam-amber px-3.5 text-beam-charcoal disabled:opacity-40"
            disabled={!body.trim()}
            aria-label="Send"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  )
}
