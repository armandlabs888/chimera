'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { MessagesChatPanel } from '@/components/messages/MessagesChatPanel'
import { MessagesListPanel } from '@/components/messages/MessagesListPanel'
import { useMessagesDrawer } from '@/components/messages/useMessagesDrawer'
import { useFocusTrap } from '@/components/browse/useFocusTrap'
import { useBeam } from '@/context/BeamContext'
import { notificationMatchesThread } from '@/lib/messagesDrawer'

function visibleMessagesTrigger(): HTMLElement | null {
  const nodes = document.querySelectorAll<HTMLElement>(
    '[data-testid="messages-nav-trigger"], [data-testid="messages-mobile-trigger"]',
  )
  for (const el of nodes) {
    const rect = el.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) return el
  }
  return null
}

/**
 * Right-side messages drawer. The page underneath stays mounted.
 * Escape closes the conversation layer first, then the list.
 */
export function MessagesDrawerHost() {
  const { open, threadId, isGuest, closeThread, closeAll } = useMessagesDrawer()
  const { ready, mode, currentUser, state, markNotificationsRead } = useBeam()
  const router = useRouter()
  const pathname = usePathname()
  const panelRef = useRef<HTMLElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const closeRef = useRef<() => void>(() => {})
  const markedRef = useRef(new Set<string>())

  const chatOpen = open && threadId.length > 0

  closeRef.current = () => {
    if (chatOpen) closeThread()
    else closeAll()
  }

  const onEscape = useRef(() => {
    closeRef.current()
  }).current

  useFocusTrap(open && !isGuest, panelRef, onEscape, returnFocusRef)

  const threadWasOpen = useRef(false)
  useEffect(() => {
    if (!open) {
      returnFocusRef.current = null
      threadWasOpen.current = false
      return
    }
    returnFocusRef.current = visibleMessagesTrigger()
    const root = panelRef.current
    if (!root) return
    if (threadId && !threadWasOpen.current) {
      const back = root.querySelector<HTMLElement>('[data-testid="messages-back"]')
      const closeChat = root.querySelector<HTMLElement>('[data-testid="messages-chat-close"]')
      const backVisible = back && back.getClientRects().length > 0
      ;(backVisible ? back : closeChat)?.focus()
    } else if (!threadId && threadWasOpen.current) {
      const search = root.querySelector<HTMLElement>(
        '[data-testid="messages-search"], [data-testid="messages-close"]',
      )
      search?.focus()
    }
    threadWasOpen.current = Boolean(threadId)
  }, [open, threadId])

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

  if (!open || isGuest) return null

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
        aria-label={chatOpen ? 'Conversation' : 'Messages'}
        tabIndex={-1}
        data-testid="messages-drawer"
        data-chat-open={chatOpen ? 'true' : 'false'}
        className="messages-drawer messages-drawer-motion"
      >
        {chatOpen ? (
          <div className="messages-chat-panel" data-testid="messages-chat-panel">
            <MessagesChatPanel
              key={threadId}
              threadId={threadId}
              onBack={closeThread}
              onClose={closeThread}
            />
          </div>
        ) : null}
        <div className="messages-list-panel" data-testid="messages-list-panel">
          <MessagesListPanel />
        </div>
      </section>
    </>
  )
}
