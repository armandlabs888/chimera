'use client'

import {
  Compass,
  Home,
  MessageCircle,
  Plus,
  Search,
  Shield,
  UserRound,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, type FormEvent, type ReactNode } from 'react'
import { BottomNav } from './BottomNav'
import { BeamWordmark } from '@/components/BeamMark'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { LandingNav } from '@/components/landing/LandingNav'
import { useBeam } from '@/context/BeamContext'
import { getNeighborhood } from '@/data/neighborhoods'
import { Avatar } from '@/components/ui'

const primaryNav = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/browse', label: 'Browse', icon: Compass },
  { href: '/messages', label: 'Messages', icon: MessageCircle },
  { href: '/you', label: 'You', icon: UserRound },
]

function shouldHideAppChrome(pathname: string) {
  return pathname === '/'
}

function isPublicGuestPath(pathname: string) {
  return (
    pathname === '/browse' ||
    pathname === '/safety' ||
    pathname.startsWith('/requests/') ||
    pathname.startsWith('/people/')
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { currentUser, mode, ready, authUser } = useBeam()
  const hideChrome = shouldHideAppChrome(pathname)
  const [q, setQ] = useState('')
  // Unauthenticated discovery: marketing chrome (no Guest sidebar / duplicate command search)
  const isGuest = !authUser

  if (hideChrome) {
    return <div className="app-shell relative min-h-dvh text-[#071330]">{children}</div>
  }

  // Logged-out public discovery: marketing chrome (no Guest sidebar / duplicate search)
  if (isGuest && isPublicGuestPath(pathname)) {
    if (pathname === '/safety') {
      return <div className="app-shell relative min-h-dvh text-[#071330]">{children}</div>
    }

    return (
      <div className="app-shell relative min-h-dvh bg-[#F4F8FD] text-[#071330]">
        <LandingNav variant="light" />
        {/* Browse owns its own vertical rhythm; other guest pages keep section padding */}
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

  const neighborhood = ready ? getNeighborhood(currentUser.neighborhood) : null
  const showCommandSearch = pathname !== '/browse'

  function onSearch(e: FormEvent) {
    e.preventDefault()
    const next = q.trim()
    router.push(next ? `/browse?q=${encodeURIComponent(next)}` : '/browse')
  }

  return (
    <div className="app-shell relative min-h-dvh text-[#071330] lg:flex">
      <aside
        className="app-sidebar sticky top-0 hidden h-dvh shrink-0 flex-col lg:flex"
        data-testid="app-sidebar"
      >
        <div className="flex h-16 items-center px-4">
          <Link href="/">
            <BeamWordmark markWidth={24} markHeight={24} wordClassName="text-[22px]" tone="ink" />
          </Link>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2" aria-label="Primary">
          {primaryNav.map(({ href, label, icon: Icon }) => {
            const active =
              href === '/home'
                ? pathname === '/home'
                : pathname === href || pathname.startsWith(`${href}/`)
            return (
              <Link
                key={href}
                href={href}
                className={`flex h-10 items-center gap-2.5 rounded-xl px-2.5 text-[14.5px] font-semibold transition ${
                  active
                    ? 'bg-[#F4F8FD] text-[#1D5CE5]'
                    : 'text-[#64748B] hover:bg-[#F4F8FD] hover:text-[#071330]'
                }`}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                {label}
              </Link>
            )
          })}
          <div className="my-3 h-px bg-[rgba(7,19,48,0.08)]" />
          <Link
            href="/safety"
            className={`flex h-10 items-center gap-2.5 rounded-xl px-2.5 text-[14.5px] font-semibold transition ${
              pathname === '/safety'
                ? 'bg-[#F4F8FD] text-[#1D5CE5]'
                : 'text-[#64748B] hover:bg-[#F4F8FD] hover:text-[#071330]'
            }`}
          >
            <Shield className="h-[18px] w-[18px]" strokeWidth={1.75} />
            Safety
          </Link>
        </nav>

        <div className="m-3 flex items-center gap-2.5 rounded-2xl border border-[rgba(7,19,48,0.08)] bg-[#F4F8FD] p-3">
          {ready ? <Avatar src={currentUser.avatar} name={currentUser.name} size={32} /> : null}
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-[#071330]">
              {ready ? currentUser.name : '…'}
            </p>
            <p className="truncate text-[12px] text-[#64748B]">
              {neighborhood?.shortName ?? 'Austin'}
            </p>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="app-command sticky top-0 z-30">
          <div className="flex h-16 items-center gap-3 px-4">
            <Link href="/" className="lg:hidden">
              <BeamWordmark markWidth={22} markHeight={22} wordClassName="text-[20px]" tone="ink" />
            </Link>

            {showCommandSearch ? (
              <form onSubmit={onSearch} className="hidden min-w-0 flex-1 md:block">
                <label className="sr-only" htmlFor="app-command-search">
                  Search Beam
                </label>
                <div className="relative max-w-[480px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    id="app-command-search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search requests or skills…"
                    className="h-11 w-full rounded-full border border-[rgba(7,19,48,0.1)] bg-[#F4F8FD] pl-9 pr-3 text-[14px] text-[#071330] placeholder:text-[#94A3B8] focus:border-[#1D5CE5] focus:outline-none"
                  />
                </div>
              </form>
            ) : (
              <div className="hidden min-w-0 flex-1 md:block" aria-hidden />
            )}

            <div className="ml-auto flex items-center gap-2">
              {neighborhood ? (
                <Link
                  href={`/browse?neighborhood=${currentUser.neighborhood}`}
                  className="hidden items-center rounded-full px-3 py-2 text-[13px] font-semibold text-[#64748B] transition hover:text-[#071330] sm:inline-flex"
                >
                  {neighborhood.shortName} ▾
                </Link>
              ) : null}
              {process.env.NODE_ENV !== 'production' ? (
                <span className="hidden rounded-full border border-[rgba(7,19,48,0.1)] px-2.5 py-1 text-[12px] text-[#64748B] md:inline-flex">
                  {mode === 'live' ? 'Live' : 'Demo'}
                </span>
              ) : null}
              <Link
                href="/post"
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#1D5CE5] px-3.5 text-[13px] font-semibold text-white hover:bg-[#1649BD]"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Post a request</span>
                <span className="sm:hidden">Post</span>
              </Link>
            </div>
          </div>
        </header>

        <main className="relative mx-auto w-full max-w-[72rem] flex-1 pb-24 md:pb-8">{children}</main>
        <BottomNav />
      </div>
    </div>
  )
}
