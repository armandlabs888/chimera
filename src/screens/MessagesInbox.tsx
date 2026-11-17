'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar, EmptyState, ButtonLink } from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import { jobThreadSubtitle } from '@/lib/messagesJobLabel'
import { compactRelativeTime } from '@/lib/messagesTime'
import { MessagesThread } from '@/screens/MessagesThread'

const panelSurface = 'border border-[#E3E8EF] bg-white'

export function MessagesInbox({ embedThreadId }: { embedThreadId?: string }) {
  const router = useRouter()
  const { state, currentUser, getPerson, getRequest } = useBeam()
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

  const selectedId = hasExplicitThread ? embedThreadId : undefined

  return (
    <div
      data-testid="messages-workspace"
      className={[
        'beam-container grid min-h-0 grid-cols-1 gap-0 overflow-hidden rounded-2xl',
        'h-[calc(100dvh-9.75rem)] min-h-[420px]',
        'lg:h-[calc(100dvh-10rem)] lg:min-h-[560px] lg:max-h-[840px]',
        'lg:grid-cols-[minmax(280px,320px)_minmax(0,1fr)]',
        panelSurface,
      ].join(' ')}
    >
      <aside
        data-testid="messages-inbox-rail"
        className={[
          'min-h-0 flex-col overflow-hidden lg:border-r lg:border-[#E3E8EF]',
          hasExplicitThread ? 'hidden lg:flex' : 'flex',
        ].join(' ')}
      >
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-[#E3E8EF] px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <h1 className="text-[18px] font-bold tracking-[-0.02em] text-[#071330]">Messages</h1>
            {threads.length > 0 && unreadCount > 0 ? (
              <span
                className="inline-flex min-w-6 items-center justify-center rounded-md bg-[#EEF4FF] px-2 py-0.5 text-[12px] font-semibold tabular-nums text-[#1D5CE5]"
                data-testid="messages-count"
                aria-label={`${unreadCount} unread`}
              >
                {unreadCount}
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
            <ul className="py-1.5" data-testid="messages-thread-list">
              {threads.map(({ thread, other, otherId, request, last }) => {
                const selected = selectedId === thread.id
                const name = other?.name ?? 'Neighbor'
                const mine = Boolean(last?.senderId && otherId && last.senderId !== otherId)
                const preview = last?.body ?? 'No messages yet'
                return (
                  <li key={thread.id}>
                    <Link
                      href={`/messages/${thread.id}`}
                      data-testid={`messages-thread-row-${thread.id}`}
                      className={`grid grid-cols-[40px_minmax(0,1fr)] gap-2.5 px-3.5 py-2.5 ${
                        selected ? 'bg-[#EEF2F7]' : 'bg-white hover:bg-[#EEF2F7]'
                      }`}
                    >
                      <Avatar src={other?.avatar} name={name} size={40} />
                      <span className="min-w-0">
                        <span className="flex items-baseline gap-2">
                          <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-[#071330]">
                            {name}
                          </span>
                          <span className="shrink-0 text-[11.5px] tabular-nums text-[#4A5568]">
                            {compactRelativeTime(last?.createdAt ?? thread.lastMessageAt)}
                          </span>
                        </span>
                        <span className="mt-px block truncate text-[12px] font-medium text-[#1649BD]">
                          {jobThreadSubtitle(request)}
                        </span>
                        <span className="mt-px block truncate text-[13px] text-[#4A5568]">
                          {last ? (
                            mine ? (
                              <>
                                <em className="font-medium not-italic text-[#4A5568]">You: </em>
                                {preview}
                              </>
                            ) : (
                              preview
                            )
                          ) : (
                            'No messages yet'
                          )}
                        </span>
                      </span>
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
            'flex h-full min-h-0 min-w-0 flex-col overflow-hidden',
            hasExplicitThread ? '' : 'hidden lg:flex',
          ].join(' ')}
          data-testid="messages-conversation-panel"
        >
          <MessagesThread
            threadId={selectedId}
            onBack={() => router.push('/messages')}
            onClose={() => router.push('/browse')}
            showDesktopChrome={false}
          />
        </div>
      ) : (
        <section
          data-testid="messages-conversation-panel"
          className="hidden min-h-[50vh] items-center justify-center p-8 lg:flex"
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
