'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Avatar, EmptyState, ButtonLink } from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import { relativeTime } from '@/lib/matching'
import { MessagesThread } from '@/screens/MessagesThread'

type InboxFilter = 'all' | 'open' | 'booked'

function statusLabel(status: string | undefined): string {
  if (status === 'open') return 'Open'
  if (status === 'accepted') return 'In progress'
  if (status === 'completed') return 'Completed'
  if (status === 'cancelled') return 'Cancelled'
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : ''
}

function statusDotClass(status: string | undefined): string {
  if (status === 'open') return 'bg-emerald-500'
  if (status === 'accepted') return 'bg-[#1D5CE5]'
  if (status === 'completed') return 'bg-[#94A3B8]'
  return 'bg-[#CBD5E1]'
}

export function MessagesInbox({ embedThreadId }: { embedThreadId?: string }) {
  const { state, currentUser, getPerson, getRequest } = useBeam()
  const [filter, setFilter] = useState<InboxFilter>('all')
  const hasExplicitThread = embedThreadId !== undefined

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

  const filteredThreads = useMemo(() => {
    if (filter === 'all') return threads
    if (filter === 'open') return threads.filter((t) => t.request?.status === 'open')
    return threads.filter(
      (t) => t.request?.status === 'accepted' || t.request?.status === 'completed',
    )
  }, [threads, filter])

  // Desktop smart default: land in the latest conversation when visiting /messages
  const selectedId = hasExplicitThread ? embedThreadId : threads[0]?.thread.id

  return (
    <div className="px-0 py-0 md:py-1">
      <div
        data-testid="messages-workspace"
        className={[
          'overflow-hidden rounded-xl border border-[rgba(7,19,48,0.08)] bg-white',
          'shadow-[0_8px_24px_-14px_rgba(12,42,102,0.08)]',
          // Mobile thread route: lock height so composer sits above BottomNav
          hasExplicitThread ? 'flex h-[calc(100dvh-9.75rem)] min-h-[420px] flex-col' : '',
          'md:grid md:h-[calc(100dvh-11.5rem)] md:min-h-[560px] md:max-h-[820px]',
          'md:grid-cols-[300px_minmax(0,1fr)] lg:grid-cols-[336px_minmax(0,1fr)]',
          'xl:grid-cols-[340px_minmax(0,1fr)_360px]',
        ].join(' ')}
      >
        <aside
          data-testid="messages-inbox-rail"
          className={[
            'min-h-0 flex-col border-[#E2E8F0] bg-white md:border-r',
            hasExplicitThread ? 'hidden md:flex md:flex-col' : 'flex flex-col',
          ].join(' ')}
        >
          <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-[#E2E8F0] px-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <h1 className="font-display text-[20px] font-bold tracking-[-0.02em] text-[#071330]">
                Messages
              </h1>
              {threads.length > 0 ? (
                <span
                  className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#F4F8FD] px-2 text-[12px] font-bold tabular-nums text-[#475569]"
                  data-testid="messages-count"
                >
                  {threads.length}
                </span>
              ) : null}
            </div>
            {threads.length > 1 ? (
              <div
                className="flex shrink-0 items-center gap-1 rounded-lg bg-[#F4F8FD] p-0.5"
                role="tablist"
                aria-label="Filter conversations"
              >
                {(
                  [
                    ['all', 'All'],
                    ['open', 'Open'],
                    ['booked', 'Booked'],
                  ] as const
                ).map(([id, label]) => {
                  const active = filter === id
                  return (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setFilter(id)}
                      className={`rounded-md px-2 py-1 text-[12px] font-semibold transition ${
                        active
                          ? 'bg-white text-[#071330] shadow-[0_1px_2px_rgba(7,19,48,0.08)]'
                          : 'text-[#64748B] hover:text-[#071330]'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {threads.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  title="No conversations yet"
                  body="Accept an offer on a request to open a dedicated thread."
                  action={<ButtonLink href="/browse">Browse requests</ButtonLink>}
                />
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-[14px] font-semibold text-[#071330]">No matching threads</p>
                <p className="mt-1 text-[13px] text-[#64748B]">Try another filter.</p>
              </div>
            ) : (
              <ul className="divide-y divide-[#F1F5F9]" data-testid="messages-thread-list">
                {filteredThreads.map(({ thread, other, request, last }) => {
                  const selected = selectedId === thread.id
                  const label = statusLabel(request?.status)
                  return (
                    <li key={thread.id}>
                      <Link
                        href={`/messages/${thread.id}`}
                        data-testid={`messages-thread-row-${thread.id}`}
                        className={`flex gap-3 px-4 py-3.5 transition hover:bg-[#F4F8FD] ${
                          selected ? 'bg-[#EEF4FF]/70' : 'bg-white'
                        }`}
                      >
                        <Avatar src={other?.avatar} name={other?.name ?? 'Neighbor'} size={42} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-[14.5px] font-semibold text-[#071330]">
                              {other?.name ?? 'Neighbor'}
                            </p>
                            <span className="shrink-0 text-[12px] tabular-nums text-[#94A3B8]">
                              {relativeTime(thread.lastMessageAt)}
                            </span>
                          </div>
                          <p className="truncate text-[13px] font-medium text-[#475569]">
                            {request?.title ?? 'Request'}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            {label ? (
                              <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-[#64748B]">
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${statusDotClass(request?.status)}`}
                                  aria-hidden
                                />
                                {label}
                              </span>
                            ) : null}
                            <p className="truncate text-[13px] text-[#64748B]">
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
          </div>
        </aside>

        {selectedId ? (
          <div className={hasExplicitThread ? 'contents' : 'hidden md:contents'}>
            <MessagesThread threadId={selectedId} inboxHref="/messages" />
          </div>
        ) : (
          <section
            className={[
              'min-h-[50vh] items-center justify-center bg-[#FAFBFD] p-8',
              hasExplicitThread ? 'flex' : 'hidden md:flex',
              'xl:col-span-2',
            ].join(' ')}
          >
            <EmptyState
              title="Select a conversation"
              body="Pick a thread from the list to continue coordinating."
            />
          </section>
        )}
      </div>
    </div>
  )
}
