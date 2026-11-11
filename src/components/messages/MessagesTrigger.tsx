'use client'

import { MessageCircle } from 'lucide-react'
import Link from 'next/link'
import type { MouseEvent } from 'react'
import { useInboxThreads } from '@/components/messages/useInboxThreads'
import { useMessagesDrawer } from '@/components/messages/useMessagesDrawer'

const GUEST_HREF = '/auth?next=%2Fmessages'

function UnreadBadge({ count, floating }: { count: number; floating?: boolean }) {
  if (count <= 0) return null
  const label = count > 9 ? '9+' : String(count)
  return (
    <span
      data-testid="messages-unread-badge"
      className={
        floating
          ? 'absolute -right-1.5 -top-1.5 inline-grid min-w-[17px] place-items-center rounded-[5px] bg-[#1D5CE5] px-1 text-[10.5px] font-semibold tabular-nums text-white shadow-[0_0_0_2px_#fff]'
          : 'inline-flex items-center justify-center rounded-[5px] bg-[#1D5CE5] px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white'
      }
    >
      {label}
    </span>
  )
}

/**
 * Signed-in control opens `?messages=1` on the current route.
 * The href stays `/messages` so a no-JS click still hits the redirect.
 * Guests go to auth.
 */
export function MessagesTrigger({
  appearance,
  hideFrom = 'md',
}: {
  appearance: 'nav' | 'float' | 'icon'
  /** Breakpoint at which the icon trigger hides (text trigger is already visible). */
  hideFrom?: 'sm' | 'md'
}) {
  const { open, toggle, isGuest } = useMessagesDrawer()
  const { unreadNotificationCount } = useInboxThreads()
  const unread = isGuest ? 0 : unreadNotificationCount

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (isGuest) return
    if (event.metaKey || event.altKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
    event.preventDefault()
    toggle()
  }

  if (appearance === 'icon') {
    const label = unread > 0 ? `Messages, ${unread} unread` : 'Messages'
    return (
      <Link
        href={isGuest ? GUEST_HREF : '/messages'}
        data-testid="messages-mobile-trigger"
        aria-label={label}
        aria-expanded={isGuest ? undefined : open}
        onClick={onClick}
        className={`relative grid h-[38px] w-[38px] place-items-center rounded-[10px] border border-[#E3E8EF] bg-white text-[#071330] hover:bg-[#F4F8FD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/40 ${
          hideFrom === 'sm' ? 'sm:hidden' : 'md:hidden'
        }`}
      >
        <MessageCircle className="h-[17px] w-[17px]" strokeWidth={1.9} aria-hidden />
        <UnreadBadge count={unread} floating />
      </Link>
    )
  }

  if (appearance === 'float') {
    return (
      <Link
        href={isGuest ? GUEST_HREF : '/messages'}
        data-testid="messages-nav-trigger"
        aria-expanded={isGuest ? undefined : open}
        onClick={onClick}
        className={`hidden h-9 items-center gap-1.5 rounded-[10px] px-2 text-[13.5px] font-medium sm:inline-flex ${
          open ? 'bg-[#F4F8FD] text-[#1D5CE5]' : 'text-[#071330] hover:bg-[#F4F8FD]'
        }`}
      >
        <MessageCircle className="h-[17px] w-[17px]" strokeWidth={1.9} aria-hidden />
        Messages
        <UnreadBadge count={unread} />
      </Link>
    )
  }

  return (
    <Link
      href={isGuest ? GUEST_HREF : '/messages'}
      data-testid="messages-nav-trigger"
      aria-current={open ? 'page' : undefined}
      aria-expanded={isGuest ? undefined : open}
      onClick={onClick}
      className={`relative inline-flex h-14 items-center gap-1.5 px-3 text-[13.5px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/40 ${
        open
          ? 'text-[#071330] after:absolute after:inset-x-2 after:bottom-0 after:h-[2px] after:bg-[#1D5CE5]'
          : 'text-[#475569] hover:text-[#071330]'
      }`}
    >
      Messages
      <UnreadBadge count={unread} />
    </Link>
  )
}
