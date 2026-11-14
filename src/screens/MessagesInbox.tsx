'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Avatar, EmptyState, ButtonLink } from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import { relativeTime } from '@/lib/matching'
import { formatCategoryLabel } from '@/lib/taxonomy'
import { useMessagesDrawer } from '@/components/messages/useMessagesDrawer'
import { MessagesThread } from '@/screens/MessagesThread'

const panelSurface =
  'rounded-lg border border-[#E2E8F0] bg-white shadow-[0_8px_24px_-14px_rgba(12,42,102,0.08)]'

export function MessagesInbox({ embedThreadId }: { embedThreadId?: string }) {
  const { state, currentUser, getPerson, getRequest } = useBeam()
  const { openThread, closeThread } = useMessagesDrawer()
  const hasExplicitThread = embedThreadId !== undefined

  const threads = useMemo(() => {
    return state.threads
      .filter((t) => t.participantIds.includes(currentUser.id))
      .sort((a, b) => +new Date(b.lastMessageAt) - +new Date(a.lastMessageAt))
      .map((t) => {
        const otherId = t.participantIds.find((id) => id !== currentUser.id)
        const other = otherId ? getPerson(otherId) : undefined
        const request = t.requestId ? getRequest(t.requestId) : undefined
        const last = state.messages
          .filter((m) => m.threadId === t.id)
          .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0]
        return { thread: t, other, otherId, request, last }
      })
  }, [state.threads, state.messages, currentUser.id, getPerson, getRequest])

  const multiThreadPeople = useMemo(() => {
    const counts = new Map<string, number>()
    for (const row of threads) {
      if (!row.otherId) continue
      counts.set(row.otherId, (counts.get(row.otherId) ?? 0) + 1)
    }
    return counts
  }, [threads])

  const unreadCount = useMemo(
    () =>
      (state.notifications ?? []).filter(
        (n) =>
          n.kind === 'new_message' &&
          !n.readAt &&
          (n.userId === currentUser.id || n.userId === undefined),
      ).length,
    [state.notifications, currentUser.id],
  )

  // Desktop smart default: land in the latest conversation when visiting /messages
  const selectedId = hasExplicitThread ? embedThreadId : threads[0]?.thread.id

  return (
    <div
      data-testid="messages-workspace"
      className={[
        'grid min-h-0 grid-cols-1 gap-5',
        hasExplicitThread ? 'h-[calc(100dvh-9.75rem)] min-h-[420px]' : '',
        'lg:h-[calc(100dvh-10rem)] lg:min-h-[560px] lg:max-h-[840px]',
        'lg:grid-cols-[minmax(280px,348px)_minmax(0,1fr)]',
        'xl:grid-cols-[minmax(300px,364px)_minmax(0,1fr)]',
      ].join(' ')}
    >
      <aside
        data-testid="messages-inbox-rail"
        className={[
          panelSurface,
          'min-h-0 flex-col overflow-hidden',
          hasExplicitThread ? 'hidden lg:flex' : 'flex',
        ].join(' ')}
      >
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-[#F1F5F9] px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <h1 className="text-[18px] font-bold tracking-[-0.02em] text-[#071330]">
              Messages
            </h1>
            {threads.length > 0 && unreadCount > 0 ? (
              <span
                className="inline-flex min-w-6 items-center justify-center rounded-md bg-[#EEF4FF] px-2 py-0.5 text-[12px] font-semibold tabular-nums text-[#1D5CE5]"
                data-testid="messages-count"
                aria-label={`${unreadCount} unread`}
              >
                {unreadCount}
              </span>
            ) : threads.length > 0 ? (
              <span
                className="inline-flex min-w-6 items-center justify-center rounded-md bg-[#F1F5F9] px-2 py-0.5 text-[12px] font-semibold tabular-nums text-[#334155]"
                data-testid="messages-count"
                aria-label={`${threads.length} conversations`}
              >
                {threads.length}
              </span>
            ) : null}
          </div>
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
          ) : (
            <ul className="divide-y divide-[#F1F5F9]" data-testid="messages-thread-list">
              {threads.map(({ thread, other, otherId, request, last }) => {
                const selected = selectedId === thread.id
                const needsDisambiguation = Boolean(
                  otherId && (multiThreadPeople.get(otherId) ?? 0) > 1,
                )
                return (
                  <li key={thread.id}>
                    <Link
                      href={`/messages/${thread.id}`}
                      onClick={(event) => {
                        if (event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return
                        event.preventDefault()
                        openThread(thread.id)
                      }}
                      data-testid={`messages-thread-row-${thread.id}`}
                      className={`flex gap-3 px-4 py-3.5 transition ${
                        selected ? 'bg-[#EFF6FF]/75' : 'bg-white hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <Avatar src={other?.avatar} name={other?.name ?? 'Neighbor'} size={40} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[14px] font-semibold text-[#071330]">
                            {other?.name ?? 'Neighbor'}
                          </p>
                          <span className="shrink-0 text-[12px] tabular-nums text-[#94A3B8]">
                            {relativeTime(thread.lastMessageAt)}
                          </span>
                        </div>
                        {needsDisambiguation ? (
                          <p className="truncate text-[12px] font-medium text-[#64748B]">
                            {request
                              ? formatCategoryLabel(
                                  request.category,
                                  request.categoryCustom,
                                ) || request.title
                              : 'Request'}
                          </p>
                        ) : null}
                        <p className="mt-0.5 truncate text-[13px] text-[#64748B]">
                          {last?.body ?? 'No messages yet'}
                        </p>
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
        <div
          className={[
            panelSurface,
            'flex h-full min-h-0 min-w-0 flex-col overflow-hidden',
            hasExplicitThread ? '' : 'hidden lg:flex',
          ].join(' ')}
          data-testid="messages-conversation-panel"
        >
          <MessagesThread threadId={selectedId} onBack={closeThread} onClose={closeThread} />
        </div>
      ) : (
        <section
          data-testid="messages-conversation-panel"
          className={[
            panelSurface,
            'min-h-[50vh] items-center justify-center p-8',
            hasExplicitThread ? 'flex' : 'hidden lg:flex',
          ].join(' ')}
        >
          <EmptyState
            title="Select a conversation"
            body="Pick a thread from the list to continue coordinating."
          />
        </section>
      )}
    </div>
  )
}
