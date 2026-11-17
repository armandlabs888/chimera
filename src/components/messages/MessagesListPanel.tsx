'use client'

import { MessageCircle, Plus, Search, X } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useInboxThreads } from '@/components/messages/useInboxThreads'
import { useMessagesDrawer } from '@/components/messages/useMessagesDrawer'
import { ReferralInboxCard } from '@/components/refer/ReferralInboxCard'
import { Avatar } from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import { inboundReferralsForHelper } from '@/lib/jobReferrals'
import { jobThreadSubtitle } from '@/lib/messagesJobLabel'
import { compactRelativeTime } from '@/lib/messagesTime'

export function MessagesListPanel({
  showMobileClose = false,
}: {
  showMobileClose?: boolean
}) {
  const { rows } = useInboxThreads()
  const { threadId, openThread, closeAll } = useMessagesDrawer()
  const { state, currentUser } = useBeam()
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)

  const referralCards = useMemo(() => {
    const q = query.trim().toLowerCase()
    return inboundReferralsForHelper(state.jobReferrals, currentUser.id).filter((ref) => {
      if (!q) return true
      const job = state.requests.find((r) => r.id === ref.jobId)
      const referrer = state.people.find((p) => p.id === ref.referrerId)
      const hay = `${referrer?.name ?? ''} ${job?.title ?? ''} ${ref.note}`.toLowerCase()
      return hay.includes(q)
    })
  }, [state.jobReferrals, state.requests, state.people, currentUser.id, query])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((row) => {
      if (!q) return true
      const name = (row.other?.name ?? '').toLowerCase()
      const job = jobThreadSubtitle(row.request).toLowerCase()
      const title = row.jobTitle.toLowerCase()
      return name.includes(q) || job.includes(q) || title.includes(q)
    })
  }, [rows, query])

  const emptyInbox = rows.length === 0 && referralCards.length === 0

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-white" data-testid="messages-list-panel">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-[#E3E8EF] pl-4 pr-2.5">
        <h2
          id="messages-drawer-title"
          className="min-w-0 flex-1 text-[20px] font-bold tracking-[-0.02em] text-[#071330]"
        >
          Messages
        </h2>
        <button
          type="button"
          className="grid h-8 w-8 place-items-center rounded-lg text-[#071330] hover:bg-[#EEF2F7]"
          aria-label="Search messages"
          aria-pressed={searchOpen}
          data-testid="messages-search-toggle"
          onClick={() => setSearchOpen((value) => !value)}
        >
          <Search className="h-[18px] w-[18px]" strokeWidth={1.9} />
        </button>
        <button
          type="button"
          className="grid h-8 w-8 place-items-center rounded-lg text-[#071330] hover:bg-[#EEF2F7]"
          aria-label="New message"
          data-testid="messages-new"
          onClick={() => {
            /* Composer for new DMs is not shipped; keep control for mock parity. */
          }}
        >
          <Plus className="h-[18px] w-[18px]" strokeWidth={1.9} />
        </button>
        {showMobileClose ? (
          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-lg text-[#071330] hover:bg-[#EEF2F7] md:hidden"
            aria-label="Close messages"
            data-testid="messages-close"
            onClick={closeAll}
          >
            <X className="h-[18px] w-[18px]" strokeWidth={1.9} />
          </button>
        ) : null}
      </div>

      {searchOpen ? (
        <div className="shrink-0 border-b border-[#E3E8EF] px-3 py-2.5">
          <label className="relative block">
            <span className="sr-only">Search messages</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4A5568]"
              strokeWidth={1.9}
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search people or jobs"
              data-testid="messages-search"
              autoFocus
              className="h-10 w-full rounded-[10px] border border-[#D7E0EC] bg-white pl-9 pr-3 text-[14px] text-[#071330] outline-none placeholder:text-[#5B6576] focus:border-[#1D5CE5] focus:shadow-[0_0_0_3px_rgba(29,92,229,0.14)]"
            />
          </label>
        </div>
      ) : null}

      {emptyInbox ? (
        <div
          className="flex flex-1 flex-col items-center justify-center px-9 pb-16 text-center"
          data-testid="messages-empty"
        >
          <div className="mb-4 grid h-14 w-14 place-items-center rounded-[14px] border border-[#E3E8EF] bg-white text-[#1D5CE5]">
            <MessageCircle className="h-6 w-6" strokeWidth={1.9} />
          </div>
          <h3 className="text-[18px] font-bold tracking-[-0.015em] text-[#071330]">
            No conversations yet
          </h3>
          <p className="mt-2 max-w-[290px] text-[14.5px] text-[#4A5568]">
            Accept an offer on a request to open a dedicated thread.
          </p>
          <Link
            href="/browse"
            className="mt-5 inline-flex h-10 items-center justify-center rounded-[10px] bg-[#1D5CE5] px-4 text-[14px] font-semibold text-white hover:bg-[#1649BD]"
          >
            Browse requests
          </Link>
        </div>
      ) : visible.length === 0 && referralCards.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <h3 className="text-[16px] font-bold text-[#071330]">No matching conversations</h3>
          <p className="mt-1.5 max-w-[260px] text-[13.5px] text-[#4A5568]">
            Try a different name or job title.
          </p>
        </div>
      ) : (
        <ul
          className="min-h-0 flex-1 list-none overflow-y-auto py-1.5"
          data-testid="messages-thread-list"
        >
          {referralCards.length > 0 ? (
            <li className="px-3 pb-2 pt-1" data-testid="messages-referral-section">
              <p className="mb-2 px-2 text-[12.5px] font-bold uppercase tracking-[0.04em] text-[#4A5568]">
                Job suggestions
              </p>
              <div className="space-y-2.5">
                {referralCards.map((ref) => (
                  <ReferralInboxCard key={ref.id} referral={ref} />
                ))}
              </div>
            </li>
          ) : null}
          {visible.map((row) => {
            const selected = threadId === row.thread.id
            const name = row.other?.name ?? 'Neighbor'
            const preview = row.last?.body ?? 'No messages yet'
            const mine = Boolean(
              row.last?.senderId && row.otherId && row.last.senderId !== row.otherId,
            )
            const when = compactRelativeTime(row.last?.createdAt ?? row.thread.lastMessageAt)
            const subtitle = jobThreadSubtitle(row.request)
            return (
              <li key={row.thread.id}>
                <button
                  type="button"
                  data-testid={`messages-thread-row-${row.thread.id}`}
                  aria-current={selected ? 'true' : undefined}
                  onClick={() => openThread(row.thread.id)}
                  className={`grid w-full grid-cols-[40px_minmax(0,1fr)] gap-2.5 px-3.5 py-2.5 text-left ${
                    selected ? 'bg-[#EEF2F7]' : 'hover:bg-[#EEF2F7]'
                  } ${row.unread ? 'messages-thread-unread' : ''}`}
                >
                  <Avatar src={row.other?.avatar} name={name} size={40} />
                  <span className="min-w-0">
                    <span className="flex items-baseline gap-2">
                      <span
                        className={`min-w-0 flex-1 truncate text-[14px] text-[#071330] ${
                          row.unread ? 'font-bold' : 'font-semibold'
                        }`}
                      >
                        {name}
                      </span>
                      <span
                        className={`shrink-0 text-[11.5px] tabular-nums ${
                          row.unread ? 'font-semibold text-[#1D5CE5]' : 'text-[#4A5568]'
                        }`}
                      >
                        {when}
                      </span>
                    </span>
                    <span className="mt-px block truncate text-[12px] font-medium text-[#1649BD]">
                      {subtitle}
                    </span>
                    <span className="mt-px flex items-center gap-2">
                      <span
                        className={`min-w-0 flex-1 truncate text-[13px] ${
                          row.unread ? 'font-semibold text-[#071330]' : 'text-[#4A5568]'
                        }`}
                      >
                        {row.last ? (
                          mine ? (
                            <>
                              <em className="font-medium not-italic text-[#4A5568]">You: </em>
                              {preview}
                            </>
                          ) : (
                            preview
                          )
                        ) : (
                          <em className="font-medium not-italic text-[#4A5568]">No messages yet</em>
                        )}
                      </span>
                      {row.unread ? (
                        <span
                          className="h-2 w-2 shrink-0 rounded-full bg-[#1D5CE5]"
                          aria-label="Unread"
                        />
                      ) : null}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
