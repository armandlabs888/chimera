'use client'

import { ChevronUp, X } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { MessagesChatPanel } from '@/components/messages/MessagesChatPanel'
import { MessagesListPanel } from '@/components/messages/MessagesListPanel'
import { useInboxThreads } from '@/components/messages/useInboxThreads'
import { useMessagesDrawer } from '@/components/messages/useMessagesDrawer'
import { Avatar } from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import { jobThreadSubtitle } from '@/lib/messagesJobLabel'
import { notificationMatchesThread } from '@/lib/messagesDrawer'

/**
 * Reddit-style floating messages panel docked bottom-right on desktop.
 * Mobile uses a full-screen list then conversation with back.
 * Escape closes (conversation first on mobile). Minimize persists in-session.
 */
export function MessagesDrawerHost() {
  const {
    open,
    threadId,
    isGuest,
    minimized,
    closeThread,
    closeAll,
    minimize,
    restore,
  } = useMessagesDrawer()
  const { ready, mode, currentUser, state, markNotificationsRead, getPerson, getRequest } =
    useBeam()
  const { unreadNotificationCount, rows } = useInboxThreads()
  const router = useRouter()
  const pathname = usePathname()
  const panelRef = useRef<HTMLElement>(null)
  const markedRef = useRef(new Set<string>())

  const onFullMessagesPage = pathname === '/messages' || pathname.startsWith('/messages/')
  const chatOpen = open && threadId.length > 0

  const activeRow = useMemo(
    () => rows.find((row) => row.thread.id === threadId) ?? rows[0],
    [rows, threadId],
  )
  const minibarPerson = activeRow?.other ?? (activeRow?.otherId ? getPerson(activeRow.otherId) : undefined)
  const minibarRequest = activeRow?.request ?? (activeRow?.thread.requestId
    ? getRequest(activeRow.thread.requestId)
    : undefined)
  const minibarName = minibarPerson?.name ?? 'Messages'
  const minibarSub = jobThreadSubtitle(minibarRequest)

  useEffect(() => {
    if (!ready || !isGuest || !open) return
    const next = `${pathname}${window.location.search}`
    router.replace(`/auth?next=${encodeURIComponent(next)}`)
  }, [ready, isGuest, open, pathname, router])

  useEffect(() => {
    if (!open || !threadId || !ready || isGuest) return
    const thread = state.threads.find((item) => item.id === threadId)
    const demo = mode === 'demo'
    const ids = (state.notifications ?? [])
      .filter((notification) =>
        notificationMatchesThread(
          notification,
          threadId,
          thread?.requestId,
          currentUser.id,
          demo,
        ),
      )
      .map((notification) => notification.id)
      .filter((id) => !markedRef.current.has(id))
    if (!ids.length) return
    for (const id of ids) markedRef.current.add(id)
    void markNotificationsRead(ids)
  }, [
    open,
    threadId,
    ready,
    isGuest,
    state.threads,
    state.notifications,
    mode,
    currentUser.id,
    markNotificationsRead,
  ])

  useEffect(() => {
    if (!open || isGuest || onFullMessagesPage) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      const mobile = window.matchMedia('(max-width: 767px)').matches
      if (mobile && threadId) closeThread()
      else closeAll()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, isGuest, onFullMessagesPage, threadId, closeThread, closeAll])

  if (!open || isGuest || onFullMessagesPage) return null

  if (minimized) {
    return (
      <div
        className="messages-minibar"
        data-testid="messages-minibar"
        role="dialog"
        aria-label="Messages minimized"
      >
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
          data-testid="messages-minibar-restore"
          aria-label={`Restore conversation with ${minibarName}`}
          onClick={restore}
        >
          {minibarPerson ? (
            <Avatar src={minibarPerson.avatar} name={minibarName} size={36} />
          ) : (
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#0E2A66] text-[12px] font-bold text-white">
              M
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-bold text-[#071330]">{minibarName}</span>
            <span className="mt-px block truncate text-[12px] text-[#4A5568]">{minibarSub}</span>
          </span>
        </button>
        {unreadNotificationCount > 0 ? (
          <span
            data-testid="messages-minibar-unread"
            className="inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-[5px] bg-[#1D5CE5] px-1 text-[10.5px] font-bold text-white"
          >
            {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
          </span>
        ) : null}
        <button
          type="button"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#071330] hover:bg-[#EEF2F7]"
          aria-label="Restore messages"
          onClick={restore}
        >
          <ChevronUp className="h-[18px] w-[18px]" strokeWidth={1.9} />
        </button>
        <button
          type="button"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#071330] hover:bg-[#EEF2F7]"
          aria-label="Close messages"
          data-testid="messages-minibar-close"
          onClick={closeAll}
        >
          <X className="h-[18px] w-[18px]" strokeWidth={1.9} />
        </button>
      </div>
    )
  }

  return (
    <>
      <div
        className="messages-drawer-scrim"
        data-testid="messages-drawer-scrim"
        onClick={closeAll}
      />
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="messages-drawer-title"
        tabIndex={-1}
        data-testid="messages-drawer"
        data-chat-open={chatOpen ? 'true' : 'false'}
        className="messages-drawer messages-drawer-motion"
      >
        <div
          className={`messages-list-panel ${chatOpen ? 'messages-list-when-chat' : ''}`}
          data-mobile-view={chatOpen ? 'hidden' : 'list'}
        >
          <MessagesListPanel showMobileClose />
        </div>
        {chatOpen ? (
          <div className="messages-chat-panel" data-testid="messages-chat-panel">
            <MessagesChatPanel
              key={threadId}
              threadId={threadId}
              onBack={closeThread}
              onClose={closeAll}
              onMinimize={minimize}
              showDesktopChrome
            />
          </div>
        ) : (
          <div className="messages-chat-panel messages-chat-empty" data-testid="messages-chat-empty">
            <div className="flex h-14 shrink-0 items-center justify-end gap-0.5 border-b border-[#E3E8EF] px-2">
              <button
                type="button"
                className="grid h-8 w-8 place-items-center rounded-lg text-[#071330] hover:bg-[#EEF2F7]"
                aria-label="Minimize"
                data-testid="messages-minimize"
                onClick={minimize}
              >
                <ChevronUp className="h-[18px] w-[18px] rotate-180" strokeWidth={1.9} />
              </button>
              <button
                type="button"
                className="grid h-8 w-8 place-items-center rounded-lg text-[#071330] hover:bg-[#EEF2F7]"
                aria-label="Close messages"
                data-testid="messages-close"
                onClick={closeAll}
              >
                <X className="h-[18px] w-[18px]" strokeWidth={1.9} />
              </button>
            </div>
            <div className="flex flex-1 items-center justify-center px-8 text-center">
              <div>
                <p className="text-[15px] font-bold text-[#071330]">Select a conversation</p>
                <p className="mt-1 text-[13.5px] text-[#4A5568]">
                  Pick someone from the list to keep coordinating.
                </p>
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  )
}
