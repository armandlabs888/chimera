'use client'

import {
  List,
  LogOut,
  MessageSquare,
  Settings,
  UserRound,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { Avatar } from '@/components/ui'
import { useMessagesDrawer } from '@/components/messages/useMessagesDrawer'
import { useBeam } from '@/context/BeamContext'
import { formatLocation } from '@/lib/location'
import { isHelperPerson } from '@/lib/roles'
import './account-hc.css'

export type AccountMenuLink = {
  href: string
  label: string
  match: (path: string) => boolean
  icon: ReactNode
  testId?: string
  kind?: 'link' | 'messages'
}

export const ACCOUNT_MENU_LINKS: AccountMenuLink[] = [
  {
    href: '/you',
    label: 'Your profile',
    match: (path) => path === '/you',
    icon: <UserRound className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />,
    testId: 'account-menu-profile',
  },
  {
    href: '/home',
    label: 'My activity',
    match: (path) => path === '/home',
    icon: <List className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />,
    testId: 'account-menu-activity',
  },
  {
    href: '/messages',
    label: 'Messages',
    match: (path) => path === '/messages' || path.startsWith('/messages/'),
    icon: <MessageSquare className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />,
    testId: 'account-menu-messages',
    kind: 'messages',
  },
  {
    href: '/settings/account',
    label: 'Settings',
    match: (path) => path === '/settings' || path.startsWith('/settings/'),
    icon: <Settings className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />,
    testId: 'account-menu-settings',
  },
]

export function getAccountMenuLinks(_isHelper: boolean): AccountMenuLink[] {
  return ACCOUNT_MENU_LINKS
}

export function useAccountMenuCurrent() {
  const pathname = usePathname()
  return (href: string) => {
    const item = ACCOUNT_MENU_LINKS.find((l) => l.href === href)
    return item ? item.match(pathname) : false
  }
}

function useAccountMenuItems() {
  const { currentUser } = useBeam()
  return getAccountMenuLinks(isHelperPerson(currentUser))
}

export function AccountMenuPanel({
  name,
  locationText,
  open,
  onNavigate,
  canSignOut,
  onSignOut,
}: {
  name: string
  locationText: string
  open: boolean
  onNavigate: () => void
  canSignOut: boolean
  onSignOut: () => void
}) {
  const isCurrent = useAccountMenuCurrent()
  const links = useAccountMenuItems()
  const { openList, isGuest } = useMessagesDrawer()
  const { currentUser } = useBeam()
  const isHelper = isHelperPerson(currentUser)
  const roleLabel = isHelper ? 'Helper' : 'Neighbor'
  const place = formatLocation(currentUser) || locationText

  if (!open) return null

  return (
    <div
      className="hc-account-menu is-open"
      role="menu"
      aria-label="Account"
      data-testid="account-menu"
    >
      <div className="hc-menu-head hc-menu-head-row">
        <Avatar src={currentUser.avatar} name={name} size={36} />
        <div className="min-w-0">
          <p className="name truncate">{name}</p>
          <p className="loc truncate">
            {roleLabel}
            {place ? ` · ${place}` : ''}
          </p>
        </div>
      </div>
      <ul className="hc-menu-list">
        {links.map((item) => {
          if (item.kind === 'messages') {
            return (
              <li key={item.href}>
                <button
                  type="button"
                  role="menuitem"
                  className={isCurrent(item.href) ? 'is-current' : undefined}
                  data-testid={item.testId}
                  onClick={() => {
                    onNavigate()
                    if (isGuest) {
                      window.location.href = '/auth?next=%2Fmessages'
                      return
                    }
                    openList()
                  }}
                >
                  {item.icon}
                  {item.label}
                </button>
              </li>
            )
          }
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                role="menuitem"
                className={isCurrent(item.href) ? 'is-current' : undefined}
                onClick={onNavigate}
                data-testid={item.testId}
              >
                {item.icon}
                {item.label}
              </Link>
            </li>
          )
        })}
        {canSignOut ? (
          <>
            <li className="hc-menu-sep" aria-hidden />
            <li>
              <button
                type="button"
                role="menuitem"
                data-testid="account-sign-out"
                className="hc-menu-item sign-out"
                onClick={onSignOut}
              >
                <LogOut className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
                Sign out
              </button>
            </li>
          </>
        ) : null}
      </ul>
    </div>
  )
}

export function MobileAccountLinks({
  name,
  locationText,
  onNavigate,
  canSignOut,
  onSignOut,
}: {
  name: string
  locationText: string
  onNavigate: () => void
  canSignOut: boolean
  onSignOut: () => void
}) {
  const isCurrent = useAccountMenuCurrent()
  const links = useAccountMenuItems()
  const { openList, isGuest } = useMessagesDrawer()
  const { currentUser } = useBeam()
  const isHelper = isHelperPerson(currentUser)
  const roleLabel = isHelper ? 'Helper' : 'Neighbor'
  const place = formatLocation(currentUser) || locationText

  return (
    <div className="hc-mobile-account" data-testid="mobile-account-links">
      <p className="name truncate">{name}</p>
      <p className="loc truncate">
        {roleLabel}
        {place ? ` · ${place}` : ''}
      </p>
      {links.map((item) => {
        if (item.kind === 'messages') {
          return (
            <button
              key={item.href}
              type="button"
              className={isCurrent(item.href) ? 'is-current' : undefined}
              data-testid={item.testId}
              onClick={() => {
                onNavigate()
                if (isGuest) {
                  window.location.href = '/auth?next=%2Fmessages'
                  return
                }
                openList()
              }}
            >
              {item.label}
            </button>
          )
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            className={isCurrent(item.href) ? 'is-current' : undefined}
            onClick={onNavigate}
            data-testid={item.testId}
          >
            {item.label}
          </Link>
        )
      })}
      {canSignOut ? (
        <button
          type="button"
          data-testid="mobile-account-sign-out"
          className="hc-menu-item sign-out"
          onClick={onSignOut}
        >
          Sign out
        </button>
      ) : null}
    </div>
  )
}

export function AccountMenuTrigger({
  children,
  open,
  onToggle,
}: {
  children: ReactNode
  open: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      data-testid="account-menu-trigger"
      aria-label="Account menu"
      aria-expanded={open}
      aria-haspopup="menu"
      onClick={onToggle}
      className="hc-account-btn"
    >
      {children}
    </button>
  )
}
