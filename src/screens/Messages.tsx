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
  const { state, currentUser, sendMessage, getPerson, getRequest } = useBeam()
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
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
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

  function onSend(e: FormEvent) {
    e.preventDefault()
    if (!body.trim() || !threadId) return
    sendMessage(threadId, body, { simulateReply: true })
    setBody('')
  }

  return (
    <div className="flex min-h-dvh flex-col bg-beam-base">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-beam-line bg-beam-base/95 px-3 py-3 backdrop-blur">
        <Link
          href={`/requests/${request.id}`}
          className="touch-target inline-flex items-center justify-center rounded-xl text-beam-cream"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <img src={other.avatar} alt="" className="h-10 w-10 rounded-xl object-cover" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-beam-cream">{other.name}</p>
          <p className="truncate text-xs text-beam-muted">{request.title}</p>
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((message) => {
          const mine = message.senderId === currentUser.id
          return (
            <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  mine
                    ? 'rounded-br-md bg-beam-amber text-beam-base'
                    : 'rounded-bl-md border border-beam-line bg-beam-raised text-beam-cream'
                }`}
              >
                <p>{message.body}</p>
                <p className={`mt-1 text-[10px] ${mine ? 'text-beam-base/70' : 'text-beam-muted'}`}>
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
        className="safe-bottom sticky bottom-0 border-t border-beam-line bg-beam-base/95 px-3 pt-3 backdrop-blur"
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
            className="touch-target inline-flex items-center justify-center rounded-xl bg-beam-amber px-4 text-beam-base disabled:opacity-40"
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
