'use client'

import { Compass, Home, MessageCircle, PlusCircle, UserRound } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { MouseEvent } from 'react'
import { useMessagesDrawer } from '@/components/messages/useMessagesDrawer'

const tabs = [
  { href: '/home', label: 'Home', icon: Home, end: true },
  { href: '/browse', label: 'Browse', icon: Compass },
  { href: '/post', label: 'Post', icon: PlusCircle },
  { href: '/messages', label: 'Messages', icon: MessageCircle },
  { href: '/you', label: 'You', icon: UserRound },
]

export function BottomNav() {
  const pathname = usePathname()
  const { open: messagesOpen, toggle, isGuest } = useMessagesDrawer()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 md:hidden"
      aria-label="Primary"
      data-testid="bottom-dock"
    >
      <ul className="bottom-dock safe-bottom mx-auto grid max-w-lg grid-cols-5 px-1 pt-1">
        {tabs.map(({ href, label, icon: Icon, end }) => {
          const isMessages = href === '/messages'
          const isActive = isMessages
            ? messagesOpen || pathname === '/messages' || pathname.startsWith('/messages/')
            : end
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`)
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
                  isActive ? 'text-[#1D5CE5]' : 'text-[#64748B] hover:text-[#071330]'
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
