'use client'

import {
  ArrowRight,
  Bell,
  Compass,
  Home,
  LogOut,
  MapPin,
  MessageCircle,
  Plus,
  Shield,
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
  { href: '/browse', label: 'Browse', icon: Compass },
  { href: '/home', label: 'Home', icon: Home },
  { href: '/messages', label: 'Messages', icon: MessageCircle },
  { href: '/safety', label: 'Safety', icon: Shield },
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
      <div className="app-shell relative min-h-dvh bg-[#F4F8FD] text-[#071330]">
        <LandingNav variant="light" />
        <main
          className={
            pathname === '/browse'
              ? 'beam-container py-6 sm:py-8'
              : 'beam-container py-8 sm:py-12'
          }
        >
          {children}
        </main>
        <LandingFooter />
      </div>
    )
  }

  const locationText = ready ? formatLocationLabel(currentUser) : '…'
  const showPostCta = pathname !== '/post' && !pathname.startsWith('/post/')
  const canSignOut = Boolean(authUser)
  const showHelperSetupBanner =
    ready &&
    !isLiveGuest &&
    currentUser.accountRole === 'helper' &&
    !currentUser.isHelper &&
    !pathname.startsWith('/onboarding/helper')

  return (
    <div className="app-shell relative min-h-dvh bg-[#F4F8FD] text-[#071330]">
      <div className="sticky top-0 z-40">
        {showHelperSetupBanner ? (
          <div
            className="bg-[#1D5CE5] text-white"
            data-testid="helper-setup-callout"
            role="region"
            aria-label="Finish your helper profile"
          >
            <div className="beam-container flex flex-col gap-2.5 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <p className="min-w-0 text-[13.5px] leading-[1.4]">
                <span className="font-semibold text-white">Finish your helper profile</span>
                <span className="hidden text-white/70 sm:inline" aria-hidden>
                  {' '}
                  ·{' '}
                </span>
                <span className="mt-0.5 block text-white/90 sm:mt-0 sm:inline">
                  Add your skills and rate whenever you’re ready to appear in the Helpers directory.
                </span>
              </p>
              <Link
                href="/onboarding/helper"
                data-testid="helper-setup-banner-cta"
                className="inline-flex h-8 w-fit shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 text-[13px] font-semibold text-[#1D5CE5] transition hover:bg-[#EEF4FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              >
                Add skills &amp; rate
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
              </Link>
            </div>
          </div>
        ) : null}

        <header
          className="border-b border-[rgba(7,19,48,0.08)] bg-white/95 backdrop-blur-md"
          data-testid="app-topnav"
        >
          <div className="beam-container flex h-16 items-center gap-3 sm:h-[4.25rem]">
          {/* Left: wordmark + location */}
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link href="/browse" className="shrink-0 focus-visible:outline-none">
              <BeamWordmark
                markWidth={22}
                markHeight={22}
                wordClassName="text-[20px] sm:text-[22px]"
                tone="ink"
              />
            </Link>
            <Link
              href="/you"
              className="inline-flex max-w-[11rem] items-center gap-1.5 rounded-full border border-[rgba(7,19,48,0.1)] bg-[#F8FAFC] px-2.5 py-1.5 text-[12.5px] font-semibold text-[#475569] transition hover:border-[rgba(29,92,229,0.28)] hover:bg-[#EEF4FF] hover:text-[#1D5CE5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/35 sm:max-w-[14rem]"
              title="Profile & city"
              data-testid="topnav-location"
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-[#1D5CE5]" strokeWidth={2} />
              <span className="truncate">{locationText}</span>
            </Link>
          </div>

          {/* Center: marketplace links */}
          <nav
            className="ml-2 hidden min-w-0 flex-1 items-center justify-center gap-1 md:flex"
            aria-label="Primary"
          >
            {primaryNav.map(({ href, label, icon: Icon }) => {
              const active = navItemActive(pathname, href)
              const showMsgBadge = href === '/messages' && unreadMessageCount > 0
              return (
                <Link
                  key={href}
                  href={href}
                  className={`inline-flex h-10 items-center gap-2 rounded-full px-3.5 text-[13.5px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/40 ${
                    active
                      ? 'bg-[#EEF4FF] text-[#1D5CE5]'
                      : 'text-[#64748B] hover:bg-[#F4F8FD] hover:text-[#071330]'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon className="h-[16px] w-[16px]" strokeWidth={1.85} />
                  {label}
                  {showMsgBadge ? (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1D5CE5] px-1.5 text-[10px] font-bold text-white">
                      {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                    </span>
                  ) : null}
                </Link>
              )
            })}
          </nav>

          {/* Right: CTA + notifications + account */}
          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            {process.env.NODE_ENV !== 'production' ? (
              <span className="hidden rounded-full border border-[rgba(7,19,48,0.1)] px-2.5 py-1 text-[11px] font-semibold text-[#64748B] lg:inline-flex">
                {mode === 'live' ? 'Live' : 'Demo'}
              </span>
            ) : null}

            {showPostCta ? (
              <Link
                href="/post"
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#1D5CE5] px-3.5 text-[13px] font-semibold text-white transition hover:bg-[#1649BD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/40 focus-visible:ring-offset-2"
                data-testid="topnav-post-cta"
              >
                <Plus className="h-4 w-4" strokeWidth={2.25} />
                <span className="hidden sm:inline">Post a task</span>
                <span className="sm:hidden">Post</span>
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
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(7,19,48,0.1)] bg-white text-[#475569] transition hover:bg-[#F4F8FD] hover:text-[#071330] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/40"
              >
                <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
                {unreadCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#1D5CE5] px-1 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                ) : null}
              </button>
              {notifOpen ? (
                <div
                  className="absolute right-0 top-12 z-50 w-[min(340px,calc(100vw-1.5rem))] overflow-hidden rounded-[24px] border border-[rgba(7,19,48,0.1)] bg-white shadow-[0_20px_50px_-16px_rgba(15,41,92,0.2)]"
                  role="dialog"
                  aria-label="Notifications"
                >
                  <div className="flex items-center justify-between border-b border-[rgba(7,19,48,0.06)] px-4 py-3">
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
                            className={`flex w-full flex-col gap-0.5 px-4 py-3 text-left transition hover:bg-[#F4F8FD] focus-visible:bg-[#F4F8FD] focus-visible:outline-none ${
                              !n.readAt ? 'bg-[#F4F8FD]/60' : ''
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
                className="inline-flex h-10 max-w-[11rem] items-center gap-2 rounded-full border border-[rgba(7,19,48,0.1)] bg-white py-1 pl-1 pr-2.5 transition hover:bg-[#F4F8FD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/40 sm:max-w-[14rem] sm:pr-3"
              >
                {ready ? (
                  <Avatar src={currentUser.avatar} name={currentUser.name} size={30} />
                ) : (
                  <span className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#EEF4FF] text-[#1D5CE5]">
                    <UserRound className="h-4 w-4" />
                  </span>
                )}
                <span className="hidden truncate text-[13px] font-semibold text-[#071330] sm:inline">
                  {ready ? currentUser.name.split(' ')[0] || currentUser.name : '…'}
                </span>
              </button>
              {accountOpen ? (
                <div
                  className="absolute right-0 top-12 z-50 w-[min(280px,calc(100vw-1.5rem))] overflow-hidden rounded-[22px] border border-[rgba(7,19,48,0.1)] bg-white shadow-[0_20px_50px_-16px_rgba(15,41,92,0.2)]"
                  role="menu"
                  aria-label="Account"
                  data-testid="account-menu"
                >
                  <div className="border-b border-[rgba(7,19,48,0.06)] px-4 py-3.5">
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
                    <div className="border-t border-[rgba(7,19,48,0.06)] py-1.5">
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

      <main className="beam-container relative flex-1 pb-24 pt-6 sm:pt-8 md:pb-10">
        {children}
      </main>
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
        className="block px-4 py-2.5 text-[13.5px] font-semibold text-[#071330] transition hover:bg-[#F4F8FD] focus-visible:bg-[#F4F8FD] focus-visible:outline-none"
      >
        {children}
      </Link>
    </li>
  )
}
