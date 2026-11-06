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

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { currentUser, mode, ready, authUser } = useBeam()
  const hideChrome = shouldHideAppChrome(pathname)
  const [q, setQ] = useState('')
  const isGuest = mode === 'live' && !authUser

  if (hideChrome) {
    return <div className="app-shell relative min-h-dvh text-[#F6F3EE]">{children}</div>
  }

  // Public Safety page uses marketing chrome when logged out
  if (pathname === '/safety' && isGuest) {
    return <div className="app-shell relative min-h-dvh text-[#F6F3EE]">{children}</div>
  }

  const neighborhood = ready ? getNeighborhood(currentUser.neighborhood) : null

  function onSearch(e: FormEvent) {
    e.preventDefault()
    const next = q.trim()
    router.push(next ? `/browse?q=${encodeURIComponent(next)}` : '/browse')
  }

  return (
    <div className="app-shell relative min-h-dvh text-[#F6F3EE] lg:flex">
      <aside
        className="app-sidebar sticky top-0 hidden h-dvh shrink-0 flex-col lg:flex"
        data-testid="app-sidebar"
      >
        <div className="flex h-16 items-center px-4">
          <Link href="/">
            <BeamWordmark markWidth={40} markHeight={18} wordClassName="text-[24px]" />
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
                className={`flex h-10 items-center gap-2.5 rounded-[10px] px-2.5 text-[14.5px] font-medium transition ${
                  active
                    ? 'bg-[#1B1C20] text-[#F6F3EE]'
                    : 'text-[#B7B2AA] hover:bg-white/[0.04] hover:text-[#F6F3EE]'
                }`}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                {label}
              </Link>
            )
          })}
          <div className="my-3 h-px bg-white/[0.08]" />
          <Link
            href="/safety"
            className={`flex h-10 items-center gap-2.5 rounded-[10px] px-2.5 text-[14.5px] font-medium transition ${
              pathname === '/safety'
                ? 'bg-[#1B1C20] text-[#F6F3EE]'
                : 'text-[#B7B2AA] hover:bg-white/[0.04] hover:text-[#F6F3EE]'
            }`}
          >
            <Shield className="h-[18px] w-[18px]" strokeWidth={1.75} />
            Safety
          </Link>
        </nav>

        <div className="m-3 flex items-center gap-2.5 rounded-[12px] border border-white/[0.08] bg-[#141518] p-3">
          {ready ? <Avatar src={currentUser.avatar} name={currentUser.name} size={32} /> : null}
          <div className="min-w-0">
            <p className="truncate text-[14px] font-medium text-[#F6F3EE]">
              {ready ? currentUser.name : '…'}
            </p>
            <p className="truncate text-[12px] text-[#85817A]">
              {neighborhood?.shortName ?? 'Austin'}
            </p>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="app-command sticky top-0 z-30">
          <div className="flex h-16 items-center gap-3 px-4">
            <Link href="/" className="lg:hidden">
              <BeamWordmark markWidth={36} markHeight={16} wordClassName="text-[22px]" />
            </Link>

            <form onSubmit={onSearch} className="hidden min-w-0 flex-1 md:block">
              <label className="sr-only" htmlFor="app-command-search">
                Search Beam
              </label>
              <div className="relative max-w-[480px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#85817A]" />
                <input
                  id="app-command-search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search requests or skills…"
                  className="h-11 w-full rounded-[12px] border border-white/[0.1] bg-[#141518] pl-9 pr-3 text-[14px] text-[#F6F3EE] placeholder:text-[#85817A] focus:border-[#E2B66A] focus:outline-none"
                />
              </div>
            </form>

            <div className="ml-auto flex items-center gap-2">
              {neighborhood ? (
                <button
                  type="button"
                  className="hidden items-center rounded-[10px] px-3 py-2 text-[13px] font-medium text-[#B7B2AA] sm:inline-flex"
                >
                  {neighborhood.shortName} ▾
                </button>
              ) : null}
              {process.env.NODE_ENV !== 'production' ? (
                <span className="hidden rounded-full border border-white/[0.1] px-2.5 py-1 text-[12px] text-[#85817A] md:inline-flex">
                  {mode === 'live' ? 'Live' : 'Demo'}
                </span>
              ) : null}
              <Link
                href="/post"
                className="inline-flex h-10 items-center gap-1.5 rounded-[12px] bg-gradient-to-b from-[#DCAB5A] to-[#BD8A41] px-3.5 text-[13px] font-medium text-[#FFF8EC]"
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
