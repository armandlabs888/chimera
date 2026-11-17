'use client'

import { Compass, Home, MessageCircle, PlusCircle, UserRound } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { MouseEvent } from 'react'
import { useMessagesDrawer } from '@/components/messages/useMessagesDrawer'

const tabs: {
  href: string
  label: string
  icon: typeof Home
  end?: boolean
  matchPrefix?: string
}[] = [
  { href: '/home', label: 'Home', icon: Home, end: true },
  { href: '/browse', label: 'Browse', icon: Compass },
  { href: '/post', label: 'Post', icon: PlusCircle },
  { href: '/messages', label: 'Messages', icon: MessageCircle },
  // Mobile You tab opens the settings-menu hub (profile, activity, settings).
  { href: '/settings', label: 'You', icon: UserRound, matchPrefix: '/settings' },
]

export function BottomNav() {
  const pathname = usePathname()
  const { open: messagesOpen, minimized, toggle, isGuest } = useMessagesDrawer()

  // Sticky save bar on edit profile replaces the dock (matches approved mock).
  if (pathname === '/settings/profile') return null
  // Full-screen mobile messages panel covers the dock.
  if (messagesOpen && !minimized) return null

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 md:hidden"
      aria-label="Primary"
      data-testid="bottom-dock"
    >
      <ul className="bottom-dock safe-bottom mx-auto grid max-w-lg grid-cols-5 px-1 pt-1">
        {tabs.map(({ href, label, icon: Icon, end, matchPrefix }) => {
          const isMessages = href === '/messages'
          const isYou = href === '/settings'
          const isActive = isMessages
            ? messagesOpen || pathname === '/messages' || pathname.startsWith('/messages/')
            : isYou
              ? pathname === '/you' ||
                pathname === '/settings' ||
                pathname.startsWith('/settings/')
              : end
                ? pathname === href
                : pathname === href ||
                  pathname.startsWith(`${href}/`) ||
                  (matchPrefix ? pathname.startsWith(matchPrefix) : false)
          function onClick(event: MouseEvent<HTMLAnchorElement>) {
            if (!isMessages || isGuest) return
            if (event.metaKey || event.altKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
            event.preventDefault()
            toggle()
          }
          return (
            <li key={href}>
              <Link
                href={isMessages && isGuest ? '/auth?next=%2Fmessages' : href}
                onClick={onClick}
                className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-semibold transition ${
                  isActive ? 'text-[#1D5CE5]' : 'text-[#4A5568] hover:text-[#071330]'
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={1.75} />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
