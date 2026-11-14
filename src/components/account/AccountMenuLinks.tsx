'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import type { ReactNode } from 'react'
import { useBeam } from '@/context/BeamContext'
import { isHelperPerson } from '@/lib/roles'
import './account-hc.css'

export type AccountMenuLink = {
  href: string
  label: string
  match: (path: string, search: string) => boolean
}

/** Base account menu entries. Helper/neighbor label is applied in getAccountMenuLinks. */
export const ACCOUNT_MENU_LINKS: AccountMenuLink[] = [
  { href: '/you', label: 'Profile & account', match: (path: string) => path === '/you' },
  { href: '/home', label: 'My activity', match: (path: string) => path === '/home' },
  {
    href: '/onboarding/helper',
    label: 'Helper profile',
    match: (path: string) => path.startsWith('/onboarding/helper'),
  },
  {
    href: '/onboarding?edit=1',
    label: 'Change city',
    match: (path: string, search: string) =>
      path === '/onboarding' && new URLSearchParams(search).get('edit') === '1',
  },
]

export function getAccountMenuLinks(isHelper: boolean): AccountMenuLink[] {
  return ACCOUNT_MENU_LINKS.map((item) => {
    if (item.href !== '/onboarding/helper') return item
    return {
      ...item,
      label: isHelper ? 'Helper profile' : 'Become a helper',
    }
  })
}

export function useAccountMenuCurrent() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const search = searchParams.toString()
  return (href: string) => {
    const item = ACCOUNT_MENU_LINKS.find((l) => l.href === href)
    return item ? item.match(pathname, search) : false
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
  if (!open) return null

  return (
    <div
      className="hc-account-menu is-open"
      role="menu"
      aria-label="Account"
      data-testid="account-menu"
    >
      <div className="hc-menu-head">
        <p className="name truncate">{name}</p>
        <p className="loc truncate">{locationText}</p>
      </div>
      <ul className="hc-menu-list">
        {links.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              role="menuitem"
              className={isCurrent(item.href) ? 'is-current' : undefined}
              onClick={onNavigate}
              data-testid={
                item.href === '/onboarding/helper' ? 'account-menu-helper-link' : undefined
              }
            >
              {item.label}
            </Link>
          </li>
        ))}
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

  return (
    <div className="hc-mobile-account" data-testid="mobile-account-links">
      <p className="name truncate">{name}</p>
      <p className="loc truncate">{locationText}</p>
      {links.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={isCurrent(item.href) ? 'is-current' : undefined}
          onClick={onNavigate}
          data-testid={
            item.href === '/onboarding/helper' ? 'account-menu-helper-link' : undefined
          }
        >
          {item.label}
        </Link>
      ))}
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
