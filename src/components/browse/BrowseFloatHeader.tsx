'use client'

import { ArrowRight, ChevronDown, LogOut, Menu, UserRound, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { BeamWordmark } from '@/components/BeamMark'
import { useMessagesDrawer } from '@/components/messages/useMessagesDrawer'
import { Avatar } from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import { useBrowseLocation } from '@/hooks/useBrowseLocation'
import './browse-hc.css'

type NavItem =
  | { kind: 'link'; href: string; label: string; active?: boolean }
  | { kind: 'messages'; label: string }

export function BrowseFloatHeader({
  guest,
  showHelperBanner,
}: {
  guest: boolean
  showHelperBanner: boolean
}) {
  const { currentUser, ready, authUser, signOut } = useBeam()
  const { toggle, open: messagesOpen, isGuest } = useMessagesDrawer()
  const { origin } = useBrowseLocation(currentUser)
  const pathname = usePathname()
  const locationText = ready ? origin.locationLabel : '…'
  const [accountOpen, setAccountOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)

  const savedHref = guest ? '/auth?next=%2Fyou%3Ftab%3Dsaved' : '/you?tab=saved'
  const offersHref = guest ? '/auth?next=%2Fyou%3Ftab%3Doffers' : '/you?tab=offers'
  const postHref = guest ? '/auth?next=%2Fpost' : '/post'

  const navItems: NavItem[] = [
    { kind: 'link', href: '/browse', label: 'Browse jobs', active: true },
    { kind: 'link', href: savedHref, label: 'Saved' },
    { kind: 'link', href: offersHref, label: 'My offers' },
    { kind: 'messages', label: 'Messages' },
    { kind: 'link', href: '/#how-it-works', label: 'How it works' },
  ]

  useEffect(() => {
    delete document.documentElement.dataset.browseJobOpen
    return () => {
      delete document.documentElement.dataset.browseJobOpen
    }
  }, [])

  useEffect(() => {
    setMobileOpen(false)
    setAccountOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!accountOpen && !mobileOpen) return
    function onDoc(e: MouseEvent | globalThis.MouseEvent) {
      if (accountOpen && accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setAccountOpen(false)
        setMobileOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [accountOpen, mobileOpen])

  function onMessagesClick(event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) {
    if (isGuest) return
    if ('metaKey' in event && (event.metaKey || event.altKey || event.ctrlKey || event.shiftKey)) return
    event.preventDefault()
    toggle()
    setMobileOpen(false)
  }

  return (
    <div className="browse-hc" data-testid="browse-hc-header-shell">
      {showHelperBanner ? (
        <div
          className="browse-hc-helper-banner"
          data-testid="helper-setup-callout"
          role="region"
          aria-label="Finish your helper profile"
        >
          <div className="browse-hc-wrap flex flex-col items-center justify-center gap-1.5 text-center sm:flex-row sm:flex-wrap sm:gap-3">
            <p className="min-w-0 max-w-[42rem] text-[12.5px] font-medium leading-[1.35] sm:max-w-none">
              Finish your helper profile to appear in Local Helpers.
            </p>
            <Link
              href="/onboarding/helper"
              data-testid="helper-setup-banner-cta"
              className="inline-flex h-6 w-fit shrink-0 items-center gap-1 rounded-md bg-white px-2.5 text-[12px] font-semibold text-[#071330] transition hover:bg-[#F1F5F9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              Add skills &amp; rate
              <ArrowRight className="h-3 w-3" strokeWidth={2.25} aria-hidden />
            </Link>
          </div>
        </div>
      ) : null}

      <header className="browse-hc-header" data-testid={guest ? 'landing-nav' : 'app-topnav'} data-nav-style="flat">
        <div className="browse-hc-wrap browse-hc-header-inner">
          <Link href="/browse" className="browse-hc-brand focus-visible:outline-none" aria-label="HouseCall home">
            <BeamWordmark
              markWidth={18}
              markHeight={18}
              wordClassName="text-[17px] font-bold tracking-[-0.03em] text-[#071330]"
              tone="ink"
            />
          </Link>

          <nav className="browse-hc-nav" aria-label="Primary">
            {navItems.map((item) => {
              if (item.kind === 'messages') {
                return (
                  <Link
                    key="messages"
                    href={isGuest ? '/auth?next=%2Fmessages' : '/messages'}
                    data-testid="messages-nav-trigger"
                    aria-expanded={isGuest ? undefined : messagesOpen}
                    className={messagesOpen ? 'is-active' : undefined}
                    onClick={onMessagesClick}
                  >
                    {item.label}
                  </Link>
                )
              }
              return (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  className={item.active ? 'is-active' : undefined}
                  aria-current={item.active ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="browse-hc-header-right">
            <Link href={postHref} className="browse-hc-post" data-testid="topnav-post-cta">
              Post a task
            </Link>

            {guest ? null : (
              <div className="relative hidden sm:block" ref={accountRef}>
                <button
                  type="button"
                  data-testid="account-menu-trigger"
                  aria-label="Account menu"
                  aria-expanded={accountOpen}
                  aria-haspopup="menu"
                  onClick={() => setAccountOpen((o) => !o)}
                  className="inline-flex h-10 items-center gap-2 rounded-full px-1.5 hover:bg-[#F4F8FD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/40"
                >
                  {ready ? (
                    <Avatar src={currentUser.avatar} name={currentUser.name} size={28} />
                  ) : (
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#071330] text-white">
                      <UserRound className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <ChevronDown className="h-3.5 w-3.5 text-[#3D4A5F]" aria-hidden />
                </button>
                {accountOpen ? (
                  <div
                    className="absolute right-0 top-12 z-50 w-[min(280px,calc(100vw-1.5rem))] overflow-hidden rounded-lg border border-[#E2E8F0] bg-white shadow-[0_12px_32px_-8px_rgba(7,19,48,0.12)]"
                    role="menu"
                    aria-label="Account"
                    data-testid="account-menu"
                  >
                    <div className="border-b border-[#F1F5F9] px-4 py-3.5">
                      <p className="truncate text-[14px] font-bold text-[#071330]">
                        {ready ? currentUser.name : '…'}
                      </p>
                      <p className="mt-0.5 truncate text-[12.5px] font-medium text-[#334155]">
                        {locationText}
                      </p>
                    </div>
                    <ul className="py-1.5">
                      <MenuLink href="/you" onNavigate={() => setAccountOpen(false)}>
                        Profile &amp; account
                      </MenuLink>
                      <MenuLink href="/home" onNavigate={() => setAccountOpen(false)}>
                        My activity
                      </MenuLink>
                      <MenuLink href="/onboarding/helper" onNavigate={() => setAccountOpen(false)}>
                        Helper profile
                      </MenuLink>
                      <MenuLink href="/onboarding?edit=1" onNavigate={() => setAccountOpen(false)}>
                        Change city
                      </MenuLink>
                    </ul>
                    {authUser ? (
                      <div className="border-t border-[#F1F5F9] py-1.5">
                        <button
                          type="button"
                          role="menuitem"
                          data-testid="account-sign-out"
                          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13.5px] font-semibold text-[#DC2626] hover:bg-[#FEF2F2]"
                          onClick={() => {
                            setAccountOpen(false)
                            void signOut()
                          }}
                        >
                          <LogOut className="h-4 w-4" strokeWidth={1.85} />
                          Sign out
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}

            <button
              type="button"
              className="browse-hc-menu-btn"
              aria-label={mobileOpen ? 'Close menu' : 'Menu'}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <div className="border-t border-[#E3E8EF] bg-white md:hidden">
            <div className="browse-hc-wrap flex flex-col py-2">
              {navItems.map((item) => {
                if (item.kind === 'messages') {
                  return isGuest ? (
                    <Link
                      key="messages-m"
                      href="/auth?next=%2Fmessages"
                      className="px-1 py-3 text-[15px] text-[#071330]"
                      onClick={() => setMobileOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <button
                      key="messages-m"
                      type="button"
                      className="px-1 py-3 text-left text-[15px] text-[#071330]"
                      onClick={onMessagesClick}
                    >
                      {item.label}
                    </button>
                  )
                }
                return (
                  <Link
                    key={item.href + item.label + '-m'}
                    href={item.href}
                    className="px-1 py-3 text-[15px] text-[#071330]"
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </Link>
                )
              })}
              {guest ? (
                <>
                  <Link
                    href="/auth?mode=signin"
                    className="px-1 py-3 text-[15px] text-[#071330]"
                    onClick={() => setMobileOpen(false)}
                  >
                    Log in
                  </Link>
                  <div className="px-1 pb-3 pt-1">
                    <Link
                      href="/auth?mode=signup&next=%2Fbrowse"
                      className="inline-flex h-10 w-full items-center justify-center rounded-full bg-[#1D5CE5] text-[14px] font-semibold text-white"
                      onClick={() => setMobileOpen(false)}
                    >
                      Sign up
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <Link
                    href="/you"
                    className="px-1 py-3 text-[15px] text-[#071330]"
                    onClick={() => setMobileOpen(false)}
                  >
                    Profile &amp; account
                  </Link>
                  {authUser ? (
                    <button
                      type="button"
                      className="px-1 py-3 text-left text-[15px] font-semibold text-[#DC2626]"
                      onClick={() => {
                        setMobileOpen(false)
                        void signOut()
                      }}
                    >
                      Sign out
                    </button>
                  ) : null}
                </>
              )}
            </div>
          </div>
        ) : null}
      </header>
    </div>
  )
}

function MenuLink({
  href,
  onNavigate,
  children,
}: {
  href: string
  onNavigate: () => void
  children: ReactNode
}) {
  return (
    <li>
      <Link
        href={href}
        role="menuitem"
        onClick={onNavigate}
        className="block px-4 py-2.5 text-[13.5px] font-semibold text-[#071330] hover:bg-[#F8FAFC]"
      >
        {children}
      </Link>
    </li>
  )
}
