'use client'

import {
  ArrowRight,
  Bell,
  ChevronDown,
  LogOut,
  MapPin,
  Plus,
  UserRound,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { BottomNav } from './BottomNav'
import { BeamWordmark } from '@/components/BeamMark'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { LandingNav } from '@/components/landing/LandingNav'
import { useBeam } from '@/context/BeamContext'
import { formatLocationLabel } from '@/lib/location'
import { relativeTime } from '@/lib/matching'
import { Avatar } from '@/components/ui'

const primaryNav = [
  { href: '/browse', label: 'Browse' },
  { href: '/messages', label: 'Messages' },
]

const footerNav = [
  { href: '/safety', label: 'Safety & guidelines' },
  { href: '/browse', label: 'Browse' },
  { href: '/onboarding/helper', label: 'Helper profile' },
]

function shouldHideAppChrome(pathname: string) {
  return pathname === '/' || pathname === '/onboarding'
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

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const {
    currentUser,
    mode,
    ready,
    authUser,
    state,
    markNotificationRead,
    markAllNotificationsRead,
    signOut,
  } = useBeam()
  const hideChrome = shouldHideAppChrome(pathname)
  const [notifOpen, setNotifOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const accountRef = useRef<HTMLDivElement>(null)
  // Live guests get marketing chrome on public discovery routes.
  // Demo mode always uses the authenticated marketplace top nav.
  const isLiveGuest = mode === 'live' && !authUser
  const isBrowsePath = pathname === '/browse'
  const lockBrowseDesktop = isBrowsePath

  const notifications = state.notifications ?? []
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.readAt && n.userId === currentUser.id).length,
    [notifications, currentUser.id],
  )
  const myNotifications = useMemo(
    () =>
      notifications
        .filter((n) => n.userId === currentUser.id || mode === 'demo')
        .slice(0, 12),
    [notifications, currentUser.id, mode],
  )
  const unreadMessageCount = useMemo(
    () =>
      notifications.filter(
        (n) =>
          n.kind === 'new_message' &&
          !n.readAt &&
          (n.userId === currentUser.id || mode === 'demo'),
      ).length,
    [notifications, currentUser.id, mode],
  )

  useEffect(() => {
    setNotifOpen(false)
    setAccountOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!notifOpen && !accountOpen) return
    function onDoc(e: MouseEvent) {
      const target = e.target as Node
      if (notifOpen && notifRef.current && !notifRef.current.contains(target)) {
        setNotifOpen(false)
      }
      if (accountOpen && accountRef.current && !accountRef.current.contains(target)) {
        setAccountOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setNotifOpen(false)
        setAccountOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [notifOpen, accountOpen])

  if (hideChrome) {
    return <div className="app-shell relative min-h-dvh text-[#071330]">{children}</div>
  }

  if (isLiveGuest && isPublicGuestPath(pathname)) {
    if (pathname === '/safety') {
      return <div className="app-shell relative min-h-dvh text-[#071330]">{children}</div>
    }

    return (
      <div
        className={`app-shell relative flex min-h-dvh flex-col bg-[#F4F8FD] text-[#071330] ${
          lockBrowseDesktop ? 'xl:h-dvh xl:max-h-dvh xl:overflow-hidden' : ''
        }`}
      >
        <LandingNav variant="light" />
        <main
          className={
            pathname === '/browse'
              ? 'beam-container flex-1 py-6 sm:py-8 xl:min-h-0 xl:overflow-hidden xl:py-4'
              : 'beam-container flex-1 py-8 sm:py-12'
          }
        >
          {children}
        </main>
        {pathname === '/browse' ? (
          <footer
            className="mt-auto hidden shrink-0 border-t border-[#E2E8F0] bg-white xl:block"
            aria-label="Browse status"
          >
            <div className="beam-container flex h-9 items-center justify-between gap-4 text-[12px] text-[#64748B]">
              <p>© 2026 Beam · Neighbor-to-neighbor local help</p>
              <nav className="flex items-center gap-3 font-medium" aria-label="Footer">
                <Link href="/safety" className="hover:text-[#1D5CE5]">
                  Safety &amp; guidelines
                </Link>
                <span aria-hidden>·</span>
                <Link href="/browse" className="hover:text-[#1D5CE5]">
                  Browse
                </Link>
                <span aria-hidden>·</span>
                <Link href="/auth?mode=signup" className="hover:text-[#1D5CE5]">
                  Sign up
                </Link>
              </nav>
            </div>
          </footer>
        ) : (
          <LandingFooter />
        )}
        {pathname === '/browse' ? (
          <div className="xl:hidden">
            <LandingFooter />
          </div>
        ) : null}
      </div>
    )
  }

  const locationText = ready ? formatLocationLabel(currentUser) : '…'
  const isHelperOnboarding = pathname.startsWith('/onboarding/helper')
  const showPostCta =
    pathname !== '/post' &&
    !pathname.startsWith('/post/') &&
    !isHelperOnboarding
  const canSignOut = Boolean(authUser)
  const showHelperSetupBanner =
    ready &&
    !isLiveGuest &&
    currentUser.accountRole === 'helper' &&
    !currentUser.isHelper &&
    !isHelperOnboarding
  const shellBg = isHelperOnboarding ? 'bg-white' : 'bg-[#F4F8FD]'

  return (
    <div
      className={`app-shell relative flex min-h-dvh flex-col ${shellBg} text-[#071330] ${
        lockBrowseDesktop ? 'xl:h-dvh xl:max-h-dvh xl:overflow-hidden' : ''
      }`}
    >
      <div className={`z-40 ${lockBrowseDesktop ? 'xl:shrink-0' : 'sticky top-0'}`}>
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
          className="border-b border-[#E2E8F0] bg-white"
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
              <span className="hidden h-4 w-px bg-[#E2E8F0] md:block" aria-hidden />
              <nav
                className="hidden h-14 items-center gap-1 md:flex"
                aria-label="Primary"
              >
                {primaryNav.map(({ href, label }) => {
                  const active = navItemActive(pathname, href)
                  const showMsgBadge = href === '/messages' && unreadMessageCount > 0
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`relative inline-flex h-14 items-center gap-1.5 px-3 text-[13.5px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/40 ${
                        active
                          ? 'text-[#071330] after:absolute after:inset-x-2 after:bottom-0 after:h-[2px] after:bg-[#1D5CE5]'
                          : 'text-[#475569] hover:text-[#071330]'
                      }`}
                      aria-current={active ? 'page' : undefined}
                    >
                      {label}
                      {showMsgBadge ? (
                        <span className="inline-flex items-center justify-center rounded-md bg-[#1D5CE5] px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white">
                          {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                        </span>
                      ) : null}
                    </Link>
                  )
                })}
              </nav>
            </div>

            {/* Right: location + CTA + notifications + account */}
            <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
              {process.env.NODE_ENV !== 'production' ? (
                <span className="hidden rounded-md border border-[#E2E8F0] px-2 py-1 text-[11px] font-semibold text-[#64748B] lg:inline-flex">
                  {mode === 'live' ? 'Live' : 'Demo'}
                </span>
              ) : null}

              <Link
                href="/you"
                className="hidden h-9 max-w-[11rem] items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-[#475569] transition hover:bg-[#F8FAFC] hover:text-[#071330] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/35 sm:inline-flex sm:max-w-[14rem]"
                title="Profile & city"
                data-testid="topnav-location"
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 text-[#64748B]" strokeWidth={2} />
                <span className="truncate">{locationText}</span>
              </Link>

              <span className="hidden h-4 w-px bg-[#E2E8F0] sm:block" aria-hidden />

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

              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  data-testid="notifications-bell"
                  aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
                  aria-expanded={notifOpen}
                  aria-haspopup="dialog"
                  onClick={() => {
                    setNotifOpen((o) => !o)
                    setAccountOpen(false)
                  }}
                  className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#475569] transition hover:bg-[#F8FAFC] hover:text-[#071330] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/40"
                >
                  <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  {unreadCount > 0 ? (
                    <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-md bg-[#1D5CE5] px-1 text-[10px] font-bold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  ) : null}
                </button>
                {notifOpen ? (
                  <div
                    className="absolute right-0 top-11 z-50 w-[min(340px,calc(100vw-1.5rem))] overflow-hidden rounded-lg border border-[#E2E8F0] bg-white shadow-[0_12px_32px_-8px_rgba(7,19,48,0.12)]"
                    role="dialog"
                    aria-label="Notifications"
                  >
                    <div className="flex items-center justify-between border-b border-[#F1F5F9] px-4 py-3">
                      <p className="text-[14px] font-bold text-[#071330]">Notifications</p>
                      <button
                        type="button"
                        className="text-[12px] font-semibold text-[#1D5CE5] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/35"
                        onClick={() => void markAllNotificationsRead()}
                      >
                        Mark all read
                      </button>
                    </div>
                    <ul className="max-h-[360px] overflow-y-auto">
                      {myNotifications.length === 0 ? (
                        <li className="px-4 py-8 text-center text-[13px] text-[#64748B]">
                          You’re all caught up.
                        </li>
                      ) : (
                        myNotifications.map((n) => (
                          <li key={n.id}>
                            <button
                              type="button"
                              className={`flex w-full flex-col gap-0.5 px-4 py-3 text-left transition hover:bg-[#F8FAFC] focus-visible:bg-[#F8FAFC] focus-visible:outline-none ${
                                !n.readAt ? 'bg-[#F8FAFC]/80' : ''
                              }`}
                              onClick={() => {
                                void markNotificationRead(n.id)
                                setNotifOpen(false)
                                router.push(n.href)
                              }}
                            >
                              <span className="text-[13px] font-semibold text-[#071330]">
                                {n.title}
                              </span>
                              {n.body ? (
                                <span className="line-clamp-2 text-[12px] text-[#64748B]">
                                  {n.body}
                                </span>
                              ) : null}
                              <span className="text-[11px] text-[#94A3B8]">
                                {relativeTime(n.createdAt)}
                              </span>
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                ) : null}
              </div>

              <div className="relative" ref={accountRef}>
                <button
                  type="button"
                  data-testid="account-menu-trigger"
                  aria-label="Account menu"
                  aria-expanded={accountOpen}
                  aria-haspopup="menu"
                  onClick={() => {
                    setAccountOpen((o) => !o)
                    setNotifOpen(false)
                  }}
                  className="inline-flex h-9 max-w-[11rem] items-center gap-2 rounded-lg px-2 transition hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/40 sm:max-w-[14rem]"
                >
                  {ready ? (
                    <Avatar src={currentUser.avatar} name={currentUser.name} size={26} />
                  ) : (
                    <span className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-lg bg-[#EEF4FF] text-[#1D5CE5]">
                      <UserRound className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <span className="hidden truncate text-[13px] font-medium text-[#071330] sm:inline">
                    {ready ? currentUser.name.split(' ')[0] || currentUser.name : '…'}
                  </span>
                  <ChevronDown className="hidden h-3.5 w-3.5 shrink-0 text-[#64748B] sm:block" aria-hidden />
                </button>
                {accountOpen ? (
                  <div
                    className="absolute right-0 top-11 z-50 w-[min(280px,calc(100vw-1.5rem))] overflow-hidden rounded-lg border border-[#E2E8F0] bg-white shadow-[0_12px_32px_-8px_rgba(7,19,48,0.12)]"
                    role="menu"
                    aria-label="Account"
                    data-testid="account-menu"
                  >
                    <div className="border-b border-[#F1F5F9] px-4 py-3.5">
                      <p className="truncate text-[14px] font-bold text-[#071330]">
                        {ready ? currentUser.name : '…'}
                      </p>
                      <p className="mt-0.5 truncate text-[12.5px] text-[#64748B]">{locationText}</p>
                    </div>
                    <ul className="py-1.5">
                      <AccountMenuLink href="/you" onNavigate={() => setAccountOpen(false)}>
                        Profile &amp; account
                      </AccountMenuLink>
                      <AccountMenuLink href="/home" onNavigate={() => setAccountOpen(false)}>
                        My activity
                      </AccountMenuLink>
                      <AccountMenuLink
                        href="/onboarding/helper"
                        onNavigate={() => setAccountOpen(false)}
                      >
                        Helper profile
                      </AccountMenuLink>
                      <AccountMenuLink
                        href="/onboarding?edit=1"
                        onNavigate={() => setAccountOpen(false)}
                      >
                        Change city
                      </AccountMenuLink>
                    </ul>
                    {canSignOut ? (
                      <div className="border-t border-[#F1F5F9] py-1.5">
                        <button
                          type="button"
                          role="menuitem"
                          data-testid="account-sign-out"
                          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13.5px] font-semibold text-[#DC2626] transition hover:bg-[#FEF2F2] focus-visible:bg-[#FEF2F2] focus-visible:outline-none"
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
            </div>
          </div>
        </header>
      </div>

      <main
        className={
          lockBrowseDesktop
            ? 'beam-container relative flex-1 min-h-0 pb-4 pt-4 sm:pt-5 xl:overflow-hidden xl:pb-3 xl:pt-4'
            : 'beam-container relative flex-1 pb-10 pt-6 sm:pt-8 md:pb-10'
        }
      >
        {children}
      </main>

      <footer
        data-testid="app-footer"
        className={
          lockBrowseDesktop
            ? 'mt-auto shrink-0 border-t border-[#E2E8F0] bg-white pb-24 md:pb-0 xl:h-9 xl:pb-0'
            : 'mt-auto border-t border-[#E2E8F0] bg-white pb-24 md:pb-0'
        }
      >
        {/* Compact docked footer on locked desktop /browse */}
        {lockBrowseDesktop ? (
          <div className="beam-container hidden h-9 items-center justify-between gap-4 xl:flex">
            <p className="text-[12px] leading-none text-[#64748B]">
              © 2026 Beam · Neighbor-to-neighbor local help
            </p>
            <nav
              className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-medium text-[#475569]"
              aria-label="Footer"
            >
              {footerNav.map(({ href, label }, i) => (
                <span key={href} className="inline-flex items-center gap-3">
                  {i > 0 ? <span aria-hidden>·</span> : null}
                  <Link
                    href={href}
                    className="transition hover:text-[#1D5CE5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/35"
                  >
                    {label}
                  </Link>
                </span>
              ))}
            </nav>
          </div>
        ) : null}
        {/* Spacious footer on non-browse pages, and below xl on /browse */}
        <div
          className={`beam-container flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:py-7 ${
            lockBrowseDesktop ? 'xl:hidden' : ''
          }`}
        >
          <p className="text-[13px] leading-[1.45] text-[#64748B]">
            © 2026 Beam · Neighbor-to-neighbor local help
          </p>
          <nav
            className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13.5px] font-semibold text-[#475569]"
            aria-label="Footer"
          >
            {footerNav.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="transition hover:text-[#1D5CE5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/35"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>

      <BottomNav />
    </div>
  )
}

function AccountMenuLink({
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
        className="block px-4 py-2.5 text-[13.5px] font-semibold text-[#071330] transition hover:bg-[#F8FAFC] focus-visible:bg-[#F8FAFC] focus-visible:outline-none"
      >
        {children}
      </Link>
    </li>
  )
}
