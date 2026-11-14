'use client'

import {
  ArrowRight,
  ChevronDown,
  Plus,
  UserRound,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  AccountMenuPanel,
  AccountMenuTrigger,
} from '@/components/account/AccountMenuLinks'
import { BottomNav } from './BottomNav'
import { BeamWordmark } from '@/components/BeamMark'
import {
  BrowseLocationDialogHost,
  BrowseLocationTrigger,
} from '@/components/browse/BrowseLocationDialog'
import { BrowseFloatHeader } from '@/components/browse/BrowseFloatHeader'
import { MessagesDrawerHost } from '@/components/messages/MessagesDrawerHost'
import { MessagesTrigger } from '@/components/messages/MessagesTrigger'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { LandingNav } from '@/components/landing/LandingNav'
import { useBeam } from '@/context/BeamContext'
import { useBrowseLocation } from '@/hooks/useBrowseLocation'
import { Avatar } from '@/components/ui'
import '@/components/account/account-hc.css'

const primaryNav = [{ href: '/browse', label: 'Browse' }]

function shouldHideAppChrome(pathname: string, onboardingEdit: boolean) {
  if (pathname === '/onboarding' && onboardingEdit) return false
  return (
    pathname === '/' ||
    pathname === '/onboarding' ||
    pathname === '/admin' ||
    pathname.startsWith('/admin/')
  )
}

function isPublicGuestPath(pathname: string) {
  return (
    pathname === '/browse' ||
    pathname === '/safety' ||
    pathname.startsWith('/requests/') ||
    pathname.startsWith('/people/')
  )
}

function navItemActive(pathname: string, href: string) {
  if (href === '/home') return pathname === '/home'
  if (href === '/browse') return pathname === '/browse' || pathname.startsWith('/browse/')
  return pathname === href || pathname.startsWith(`${href}/`)
}

function usesBrowseHeader(pathname: string, onboardingEdit: boolean) {
  return (
    pathname === '/browse' ||
    pathname === '/you' ||
    pathname === '/settings' ||
    pathname === '/terms' ||
    pathname === '/privacy' ||
    pathname === '/home' ||
    pathname === '/verify' ||
    pathname.startsWith('/verify/') ||
    pathname.startsWith('/onboarding/helper') ||
    (pathname === '/onboarding' && onboardingEdit)
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const onboardingEdit = pathname === '/onboarding' && searchParams.get('edit') === '1'
  const { currentUser, mode, ready, authUser, signOut } = useBeam()
  const hideChrome = shouldHideAppChrome(pathname, onboardingEdit)
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)
  // Live guests get marketing chrome on public discovery routes.
  // Demo mode always uses the authenticated marketplace top nav.
  const isLiveGuest = mode === 'live' && !authUser
  const isBrowsePath = pathname === '/browse'
  const isMessagesPath = pathname === '/messages' || pathname.startsWith('/messages/')
  // Messages keeps a tall workspace panel. Browse v3 uses normal document scroll.
  const messagesWorkspaceMain = isMessagesPath
  const browseHeader = usesBrowseHeader(pathname, onboardingEdit)

  useEffect(() => {
    setAccountOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!accountOpen) return
    function onDoc(e: MouseEvent) {
      const target = e.target as Node
      if (accountOpen && accountRef.current && !accountRef.current.contains(target)) {
        setAccountOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setAccountOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [accountOpen])

  // Must stay above early returns — hooks cannot be conditional.
  const { origin: browseOrigin } = useBrowseLocation(currentUser)
  const locationText = ready ? browseOrigin.locationLabel : '…'
  const isHelperOnboarding = pathname.startsWith('/onboarding/helper')
  const showPostCta =
    pathname !== '/post' &&
    !pathname.startsWith('/post/') &&
    !isHelperOnboarding
  const canSignOut = Boolean(authUser) || mode === 'demo'
  const showHelperSetupBanner =
    ready &&
    !isLiveGuest &&
    currentUser.accountRole === 'helper' &&
    !currentUser.isHelper &&
    !isHelperOnboarding
  const shellBg = isHelperOnboarding ? 'bg-[#F5F9FF]' : 'bg-[#F4F8FD]'

  if (hideChrome) {
    return <div className="app-shell relative min-h-dvh text-[#071330]">{children}</div>
  }

  if (browseHeader) {
    return (
      <div className="app-shell relative flex min-h-dvh flex-col bg-[#F5F9FF] text-[#071330]">
        <BrowseFloatHeader guest={isLiveGuest} showHelperBanner={showHelperSetupBanner && !isLiveGuest} />
        <main className="relative flex-1">{children}</main>
        <LandingFooter dockPadding={!isLiveGuest} />
        <BrowseLocationDialogHost />
        <MessagesDrawerHost />
        {isLiveGuest && isBrowsePath ? null : <BottomNav />}
      </div>
    )
  }

  if (isLiveGuest && isPublicGuestPath(pathname)) {
    if (pathname === '/safety') {
      return <div className="app-shell relative min-h-dvh text-[#071330]">{children}</div>
    }

    return (
      <div className="app-shell relative flex min-h-dvh flex-col bg-[#F4F8FD] text-[#071330]">
        <LandingNav
          variant="light"
          browseLocationLabel={pathname === '/browse' ? locationText : undefined}
        />
        <BrowseLocationDialogHost />
        <main className="beam-container flex-1 py-8 sm:py-12">{children}</main>
        <MessagesDrawerHost />
        <LandingFooter />
      </div>
    )
  }

  return (
    <div className={`app-shell relative flex min-h-dvh flex-col ${shellBg} text-[#071330]`}>
      <div className="sticky top-0 z-40">
        {showHelperSetupBanner ? (
          <div
            className="min-h-9 border-b border-white/10 bg-[#071330] py-1.5 text-white"
            data-testid="helper-setup-callout"
            role="region"
            aria-label="Finish your helper profile"
          >
            <div className="beam-container flex flex-col items-center justify-center gap-1.5 text-center sm:flex-row sm:flex-wrap sm:gap-3">
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

        <header
          className="border-b border-[#E3E8EF] bg-white"
          data-testid="app-topnav"
        >
          <div className="beam-container flex h-14 items-center gap-3">
            {/* Left: wordmark + primary nav */}
            <div className="flex min-w-0 items-center gap-3">
              <Link href="/browse" className="shrink-0 focus-visible:outline-none">
                <BeamWordmark
                  markWidth={18}
                  markHeight={18}
                  wordClassName="text-[18px] font-bold tracking-[-0.025em] text-[#071330]"
                  tone="ink"
                />
              </Link>
              <span className="hidden h-4 w-px bg-[#E3E8EF] md:block" aria-hidden />
              <nav
                className="hidden h-14 items-center gap-1 md:flex"
                aria-label="Primary"
              >
                {primaryNav.map(({ href, label }) => {
                  const active = navItemActive(pathname, href)
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`relative inline-flex h-14 items-center gap-1.5 px-3 text-[13.5px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/40 ${
                        active
                          ? 'text-[#071330] after:absolute after:inset-x-2 after:bottom-0 after:h-[2px] after:bg-[#1D5CE5]'
                          : 'text-[#48556A] hover:text-[#071330]'
                      }`}
                      aria-current={active ? 'page' : undefined}
                    >
                      {label}
                    </Link>
                  )
                })}
                <MessagesTrigger appearance="nav" />
              </nav>
            </div>

            {/* Right: location + CTA + account (Messages nav carries unread; no bell) */}
            <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
              {process.env.NODE_ENV !== 'production' ? (
                <span className="hidden rounded-md border border-[#D7E0EC] px-2 py-1 text-[11px] font-semibold text-[#48556A] lg:inline-flex">
                  {mode === 'live' ? 'Live' : 'Demo'}
                </span>
              ) : null}

              <MessagesTrigger appearance="icon" hideFrom="md" />

              <BrowseLocationTrigger
                label={locationText}
                className="inline-flex h-9 max-w-[9.5rem] items-center gap-1.5 rounded-lg px-2 text-[13px] font-medium text-[#48556A] transition hover:bg-[#F4F8FD] hover:text-[#071330] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/35 sm:max-w-[14rem] sm:px-2.5"
              />

              <span className="hidden h-4 w-px bg-[#E3E8EF] sm:block" aria-hidden />

              {showPostCta ? (
                <Link
                  href="/post"
                  className="hidden h-9 items-center gap-1.5 rounded-lg bg-[#1D5CE5] px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#1649BD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/40 focus-visible:ring-offset-2 sm:inline-flex"
                  data-testid="topnav-post-cta"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
                  Post a task
                </Link>
              ) : null}

              <div className="relative" ref={accountRef}>
                <AccountMenuTrigger
                  open={accountOpen}
                  onToggle={() => setAccountOpen((o) => !o)}
                >
                  {ready ? (
                    <Avatar src={currentUser.avatar} name={currentUser.name} size={26} />
                  ) : (
                    <span className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-full bg-[#F5F9FF] text-[#1D5CE5]">
                      <UserRound className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <span className="hidden truncate text-[13px] font-medium text-[#071330] sm:inline">
                    {ready ? currentUser.name.split(' ')[0] || currentUser.name : '…'}
                  </span>
                  <ChevronDown className="chev hidden h-3.5 w-3.5 shrink-0 sm:block" aria-hidden />
                </AccountMenuTrigger>
                {accountOpen ? (
                  <AccountMenuPanel
                    name={ready ? currentUser.name : '…'}
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
            </div>
          </div>
        </header>
      </div>

      <main
        className={
          messagesWorkspaceMain
            ? 'beam-container relative shrink-0 pb-4 pt-4 sm:pt-5 min-h-[calc(100dvh-3.5rem)]'
            : 'beam-container relative flex-1 pb-10 pt-6 sm:pt-8 md:pb-10'
        }
        data-workspace-main={messagesWorkspaceMain ? 'true' : undefined}
      >
        {children}
      </main>

      <LandingFooter dockPadding />

      <BrowseLocationDialogHost />
      <MessagesDrawerHost />
      <BottomNav />
    </div>
  )
}
