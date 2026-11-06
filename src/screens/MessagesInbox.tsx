'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Avatar, Badge, EmptyState, ButtonLink, SectionHeader } from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import { relativeTime } from '@/lib/matching'
import { MessagesThread } from '@/screens/MessagesThread'

export function MessagesInbox({ embedThreadId }: { embedThreadId?: string }) {
  const { state, currentUser, getPerson, getRequest } = useBeam()
  const active = embedThreadId

  const threads = useMemo(() => {
    return state.threads
      .filter((t) => t.participantIds.includes(currentUser.id))
      .sort((a, b) => +new Date(b.lastMessageAt) - +new Date(a.lastMessageAt))
      .map((t) => {
        const otherId = t.participantIds.find((id) => id !== currentUser.id)
        const other = otherId ? getPerson(otherId) : undefined
        const request = getRequest(t.requestId)
        const last = state.messages
          .filter((m) => m.threadId === t.id)
          .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0]
        return { thread: t, other, request, last }
      })
  }, [state.threads, state.messages, currentUser.id, getPerson, getRequest])

  return (
    <div className="px-0 py-0 md:px-4 md:py-6">
      <div className="hidden px-4 pt-6 md:block md:px-0 md:pt-0">
        <SectionHeader
          title="Messages"
          subtitle="Conversations stay scoped to accepted requests."
        />
      </div>

      <div className="md:grid md:min-h-[70vh] md:grid-cols-[minmax(280px,34%)_1fr] md:overflow-hidden md:rounded-[14px] md:border md:border-[rgba(7,19,48,0.1)] md:bg-white">
        <aside
          className={`${active ? 'hidden md:block' : 'block'} border-b border-[rgba(7,19,48,0.1)] bg-white md:border-b-0 md:border-r`}
        >
          <div className="border-b border-[rgba(7,19,48,0.1)] px-4 py-3 md:hidden">
            <h1 className="type-h3 text-[#071330]">Messages</h1>
          </div>
          {threads.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="No conversations yet"
                body="Accept an offer on a request to open a dedicated thread."
                action={<ButtonLink href="/browse">Browse requests</ButtonLink>}
              />
            </div>
          ) : (
            <ul className="divide-y divide-[rgba(7,19,48,0.08)]">
              {threads.map(({ thread, other, request, last }) => {
                const selected = active === thread.id
                return (
                  <li key={thread.id}>
                    <Link
                      href={`/messages/${thread.id}`}
                      className={`flex gap-3 px-4 py-3.5 transition hover:bg-[#F4F8FD] ${
                        selected ? 'bg-[#EEF4FF]' : 'bg-white'
                      }`}
                    >
                      <Avatar src={other?.avatar} name={other?.name ?? 'Neighbor'} size={40} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[14px] font-semibold text-[#071330]">
                            {other?.name ?? 'Neighbor'}
                          </p>
                          <span className="shrink-0 tabular-nums type-meta text-[#94A3B8]">
                            {relativeTime(thread.lastMessageAt)}
                          </span>
                        </div>
                        <p className="truncate type-sec text-[#64748B]">
                          {request?.title ?? 'Request'}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          {request ? <Badge tone="outline">{request.status}</Badge> : null}
                          <p className="truncate type-sec text-[#475569]">
                            {last?.body ?? 'No messages yet'}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>

        <section className={`${active ? 'block' : 'hidden md:block'} min-h-[60vh] bg-[#F4F8FD]`}>
          {active ? (
            <MessagesThread threadId={active} inboxHref="/messages" />
          ) : (
            <div className="flex h-full min-h-[50vh] items-center justify-center p-8">
              <EmptyState
                title="Select a conversation"
                body="Pick a thread from the list to continue coordinating."
              />
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
