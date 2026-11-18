'use client'

import { Compass, MessageCircle, PlusCircle, UserRound } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs: {
  href: string
  label: string
  icon: typeof Compass
  matchPrefix?: string
}[] = [
  { href: '/browse', label: 'Browse', icon: Compass },
  { href: '/post', label: 'Post', icon: PlusCircle },
  { href: '/messages', label: 'Messages', icon: MessageCircle },
  // Profile tab opens the settings hub (activity, verify, help, sign out).
  { href: '/settings', label: 'Profile', icon: UserRound, matchPrefix: '/settings' },
]

export function BottomNav() {
  const pathname = usePathname()

  // Sticky save bar on edit profile replaces the dock (matches approved mock).
  if (pathname === '/settings/profile') return null
  // Full-screen conversation replaces the dock.
  if (pathname.startsWith('/messages/')) return null

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 md:hidden"
      aria-label="Primary"
      data-testid="bottom-dock"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <ul className="bottom-dock mx-auto grid max-w-lg grid-cols-4 px-1 pt-1">
        {tabs.map(({ href, label, icon: Icon, matchPrefix }) => {
          const isProfile = href === '/settings'
          const isActive = isProfile
            ? pathname === '/you' ||
              pathname === '/settings' ||
              pathname.startsWith('/settings/') ||
              pathname === '/verify' ||
              pathname === '/help' ||
              pathname === '/home' ||
              pathname.startsWith('/home')
            : pathname === href ||
              pathname.startsWith(`${href}/`) ||
              (matchPrefix ? pathname.startsWith(matchPrefix) : false)
          return (
            <li key={href}>
              <Link
                href={href}
                className={`touch-press flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-semibold transition-colors ${
                  isActive ? 'text-[#1D5CE5]' : 'text-[#4A5568]'
                }`}
                aria-current={isActive ? 'page' : undefined}
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
