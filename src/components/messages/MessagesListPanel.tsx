'use client'

import { Briefcase, MessageCircle, Search, X } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useInboxThreads } from '@/components/messages/useInboxThreads'
import { useMessagesDrawer } from '@/components/messages/useMessagesDrawer'
import { Avatar } from '@/components/ui'
import { relativeTime } from '@/lib/matching'

type Filter = 'all' | 'unread'

export function MessagesListPanel() {
  const { rows, unreadThreadCount } = useInboxThreads()
  const { threadId, openThread, closeAll } = useMessagesDrawer()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((row) => {
      if (filter === 'unread' && !row.unread) return false
      if (!q) return true
      const name = (row.other?.name ?? '').toLowerCase()
      const job = row.jobTitle.toLowerCase()
      return name.includes(q) || job.includes(q)
    })
  }, [rows, query, filter])

  const emptyInbox = rows.length === 0

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-white">
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-[#E3E8EF] px-3 pl-5">
        <h2
          id="messages-drawer-title"
          className="font-body text-[18px] font-bold tracking-[-0.02em] text-[#071330]"
        >
          Messages
        </h2>
        {unreadThreadCount > 0 ? (
          <span
            className="inline-flex h-[22px] items-center rounded-md border border-[#D6E2F5] bg-[#F4F8FD] px-2 text-[12px] font-semibold text-[#123E9E]"
            data-testid="messages-count"
          >
            {unreadThreadCount} unread
          </span>
        ) : null}
        <span className="flex-1" />
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-[9px] text-[#071330] hover:bg-[#F4F8FD]"
          aria-label="Close messages"
          data-testid="messages-close"
          onClick={closeAll}
        >
          <X className="h-[18px] w-[18px]" strokeWidth={1.9} />
        </button>
      </div>

      {emptyInbox ? (
        <div
          className="flex flex-1 flex-col items-center justify-center px-9 pb-16 text-center"
          data-testid="messages-empty"
        >
          <div className="mb-4 grid h-14 w-14 place-items-center rounded-[14px] border border-[#D6E2F5] bg-[#F4F8FD] text-[#1D5CE5]">
            <MessageCircle className="h-6 w-6" strokeWidth={1.9} />
          </div>
          <h3 className="font-body text-[18px] font-bold tracking-[-0.015em] text-[#071330]">
            No conversations yet
          </h3>
          <p className="mt-2 max-w-[290px] text-[14.5px] text-[#273449]">
            Accept an offer on a request to open a dedicated thread.
          </p>
          <Link
            href="/browse"
            className="mt-5 inline-flex h-10 items-center justify-center rounded-[10px] bg-[#1D5CE5] px-4 text-[14px] font-semibold text-white hover:bg-[#1649BD]"
          >
            Browse requests
          </Link>
        </div>
      ) : (
        <>
          <div className="grid shrink-0 gap-2.5 border-b border-[#E3E8EF] px-4 pb-2.5 pt-3.5">
            <label className="relative block">
              <span className="sr-only">Search messages</span>
              <Search
                className="pointer-events-none absolute left-3 top-2.5 h-[18px] w-[18px] text-[#3D4A5F]"
                strokeWidth={1.9}
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search people or jobs"
                data-testid="messages-search"
                className="h-[38px] w-full rounded-[10px] border border-[#CDD5E0] bg-white pl-9 pr-3 text-[14px] text-[#071330] outline-none placeholder:text-[#55627A] focus:border-[#1D5CE5] focus:shadow-[0_0_0_3px_rgba(29,92,229,0.14)]"
              />
            </label>
            <div className="flex gap-1" role="tablist" aria-label="Message filters">
              <FilterTab
                selected={filter === 'all'}
                testId="messages-filter-all"
                onClick={() => setFilter('all')}
                label="All"
                count={rows.length}
              />
              <FilterTab
                selected={filter === 'unread'}
                testId="messages-filter-unread"
                onClick={() => setFilter('unread')}
                label="Unread"
                count={unreadThreadCount}
              />
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
              <h3 className="font-body text-[16px] font-bold text-[#071330]">
                {filter === 'unread' ? 'No unread conversations' : 'No matching conversations'}
              </h3>
              <p className="mt-1.5 max-w-[260px] text-[13.5px] text-[#3D4A5F]">
                {filter === 'unread'
                  ? 'New messages will show up here.'
                  : 'Try a different name or job title.'}
              </p>
            </div>
          ) : (
            <ul className="min-h-0 flex-1 overflow-y-auto px-2 py-1.5" data-testid="messages-thread-list">
              {visible.map((row) => {
                const selected = threadId === row.thread.id
                const name = row.other?.name ?? 'Neighbor'
                const preview = row.last?.body ?? 'No messages yet'
                const mine = row.last?.senderId && row.otherId && row.last.senderId !== row.otherId
                const when = relativeTime(row.last?.createdAt ?? row.thread.lastMessageAt)
                return (
                  <li key={row.thread.id}>
                    <button
                      type="button"
                      data-testid={`messages-thread-row-${row.thread.id}`}
                      aria-current={selected ? 'true' : undefined}
                      onClick={() => openThread(row.thread.id)}
                      className={`relative grid w-full grid-cols-[44px_minmax(0,1fr)] gap-3 rounded-[10px] px-3 py-3 text-left ${
                        selected ? 'bg-[#F4F8FD]' : 'hover:bg-[#F7FAFE]'
                      } ${row.unread ? 'messages-thread-unread' : ''}`}
                    >
                      {selected ? (
                        <span
                          className="absolute bottom-3.5 left-0 top-3.5 w-[3px] rounded-sm bg-[#1D5CE5]"
                          aria-hidden
                        />
                      ) : null}
                      <Avatar src={row.other?.avatar} name={name} size={44} />
                      <span className="min-w-0">
                        <span className="flex items-baseline gap-2">
                          <span
                            className={`min-w-0 flex-1 truncate text-[14.5px] text-[#071330] ${
                              row.unread ? 'font-bold' : 'font-semibold'
                            }`}
                          >
                            {name}
                          </span>
                          <span
                            className={`shrink-0 text-[12.5px] tabular-nums ${
                              row.unread ? 'font-semibold text-[#1D5CE5]' : 'text-[#3D4A5F]'
                            }`}
                          >
                            {when}
                          </span>
                        </span>
                        {row.thread.requestId && row.jobTitle ? (
                          <span className="mt-0.5 flex min-w-0 items-center gap-1 text-[12.5px] font-medium text-[#1E3A6E]">
                            <Briefcase
                              className="h-[13px] w-[13px] shrink-0 text-[#1D5CE5]"
                              strokeWidth={1.9}
                            />
                            <span className="truncate">{row.jobTitle}</span>
                          </span>
                        ) : null}
                        <span className="mt-0.5 flex items-center gap-2">
                          <span
                            className={`min-w-0 flex-1 truncate text-[13.5px] ${
                              row.unread ? 'font-semibold text-[#071330]' : 'text-[#3D4A5F]'
                            }`}
                          >
                            {row.last ? (
                              mine ? (
                                <>
                                  <em className="font-medium text-[#3D4A5F] not-italic">You: </em>
                                  {preview}
                                </>
                              ) : (
                                preview
                              )
                            ) : (
                              <em className="font-medium not-italic text-[#3D4A5F]">No messages yet</em>
                            )}
                          </span>
                          {row.unread ? (
                            <span className="h-[9px] w-[9px] shrink-0 rounded-full bg-[#1D5CE5]" aria-label="Unread" />
                          ) : null}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

function FilterTab({
  selected,
  onClick,
  label,
  count,
  testId,
}: {
  selected: boolean
  onClick: () => void
  label: string
  count: number
  testId: string
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      data-testid={testId}
      onClick={onClick}
      className={`inline-flex h-[30px] items-center gap-1.5 rounded-lg px-2.5 text-[13.5px] font-semibold ${
        selected ? 'bg-[#071330] text-white' : 'text-[#273449] hover:bg-[#F4F8FD]'
      }`}
    >
      {label}
      <span className={`text-[12px] font-semibold ${selected ? 'text-white/85' : 'text-[#3D4A5F]'}`}>
        {count}
      </span>
    </button>
  )
}
