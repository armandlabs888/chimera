'use client'

import { ArrowRight, Menu, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type MouseEvent } from 'react'
import { SiteAccountMenu } from '@/components/account/SiteAccountMenu'
import { BunkWordmark } from '@/components/BunkWordmark'
import { useMessagesDrawer } from '@/components/messages/useMessagesDrawer'
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
  const { toggle, open: messagesOpen, isGuest } = useMessagesDrawer()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const savedHref = guest ? '/auth?next=%2Fhome%3Ftab%3Dsaved' : '/home?tab=saved'
  const offersHref = guest ? '/auth?next=%2Fhome%3Ftab%3Doffers' : '/home?tab=offers'
  const postHref = guest ? '/auth?next=%2Fpost' : '/post'
  const browseActive = pathname === '/browse' || pathname.startsWith('/browse/')

  const navItems: NavItem[] = [
    { kind: 'link', href: '/browse', label: 'Browse jobs', active: browseActive },
    { kind: 'link', href: savedHref, label: 'Saved' },
    { kind: 'link', href: offersHref, label: 'My offers' },
    { kind: 'messages', label: 'Messages' },
  ]

  useEffect(() => {
    delete document.documentElement.dataset.browseJobOpen
    return () => {
      delete document.documentElement.dataset.browseJobOpen
    }
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!mobileOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mobileOpen])

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
              className="inline-flex h-6 w-fit shrink-0 items-center gap-1 rounded-md bg-white px-2.5 text-[12px] font-semibold text-[#071330] transition hover:bg-[#EEF2F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              Add skills &amp; rate
              <ArrowRight className="h-3 w-3" strokeWidth={2.25} aria-hidden />
            </Link>
          </div>
        </div>
      ) : null}

      <header className="browse-hc-header" data-testid={guest ? 'landing-nav' : 'app-topnav'} data-nav-style="flat">
        <div className="browse-hc-wrap browse-hc-header-inner">
          <BunkWordmark
            size="header"
            className="browse-hc-brand focus-visible:ring-[#1D5CE5]"
          />

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

            {guest ? (
              <div className="browse-hc-guest-auth hidden items-center gap-2 sm:flex" data-testid="guest-auth-links">
                <Link
                  href="/auth?mode=signin"
                  className="inline-flex h-10 min-h-[40px] items-center px-2 text-[13px] font-medium text-[#071330] transition hover:text-[#1D5CE5]"
                  data-testid="topnav-log-in"
                >
                  Log in
                </Link>
                <Link
                  href="/auth?mode=signup&next=%2Fbrowse"
                  className="inline-flex h-10 min-h-[40px] items-center justify-center rounded-full border border-[#E3E8EF] bg-white px-3.5 text-[13px] font-semibold text-[#071330] transition hover:bg-[#EEF2F7]"
                  data-testid="topnav-sign-up"
                >
                  Sign up
                </Link>
              </div>
            ) : (
              <SiteAccountMenu />
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
                <SiteAccountMenu mobile onNavigate={() => setMobileOpen(false)} />
              )}
            </div>
          </div>
        ) : null}
      </header>
    </div>
  )
}
