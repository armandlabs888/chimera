'use client'

import { ArrowRight, ChevronDown, Menu, UserRound, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState, type MouseEvent } from 'react'
import {
  AccountMenuPanel,
  AccountMenuTrigger,
  MobileAccountLinks,
} from '@/components/account/AccountMenuLinks'
import { BeamWordmark } from '@/components/BeamMark'
import { useMessagesDrawer } from '@/components/messages/useMessagesDrawer'
import { Avatar } from '@/components/ui'
import { useBeam } from '@/context/BeamContext'
import { useBrowseLocation } from '@/hooks/useBrowseLocation'
import './browse-hc.css'
import '@/components/account/account-hc.css'

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
  const { currentUser, ready, authUser, signOut, mode } = useBeam()
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
  const browseActive = pathname === '/browse' || pathname.startsWith('/browse/')

  const navItems: NavItem[] = [
    { kind: 'link', href: '/browse', label: 'Browse jobs', active: browseActive },
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

  const displayName = ready ? currentUser.name : '…'
  // Demo has no auth session but still exposes Sign out for the same menu chrome as live.
  const canSignOut = Boolean(authUser) || mode === 'demo'

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
          <Link
            href="/browse"
            className="browse-hc-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]"
            aria-label="HouseCall home"
          >
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
              <div className="hc-account-desktop relative" ref={accountRef}>
                <AccountMenuTrigger open={accountOpen} onToggle={() => setAccountOpen((o) => !o)}>
                  {ready ? (
                    <Avatar src={currentUser.avatar} name={currentUser.name} size={28} />
                  ) : (
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#071330] text-white">
                      <UserRound className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <ChevronDown className="chev h-3.5 w-3.5" aria-hidden />
                </AccountMenuTrigger>
                {accountOpen ? (
                  <AccountMenuPanel
                    name={displayName}
                    locationText={locationText}
                    open={accountOpen}
                    onNavigate={() => setAccountOpen(false)}
                    canSignOut={canSignOut}
                    onSignOut={() => {
                      setAccountOpen(false)
                      void signOut()
                    }}
                  />
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
          <div className="hc-mobile-sheet border-t border-[#E3E8EF] bg-white">
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
                <MobileAccountLinks
                  name={displayName}
                  locationText={locationText}
                  onNavigate={() => setMobileOpen(false)}
                  canSignOut={canSignOut}
                  onSignOut={() => {
                    setMobileOpen(false)
                    void signOut()
                  }}
                />
              )}
            </div>
          </div>
        ) : null}
      </header>
    </div>
  )
}
