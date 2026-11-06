'use client'

import {
  Compass,
  Home,
  MessageCircle,
  Plus,
  Search,
  Shield,
  UserRound,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, type FormEvent, type ReactNode } from 'react'
import { BottomNav } from './BottomNav'
import { useBeam } from '@/context/BeamContext'
import { getNeighborhood } from '@/data/neighborhoods'
import { Avatar } from '@/components/ui'

const primaryNav = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/browse', label: 'Browse', icon: Compass },
  { href: '/messages', label: 'Messages', icon: MessageCircle },
  { href: '/you', label: 'You', icon: UserRound },
]

const secondaryNav = [
  { href: '/safety', label: 'Safety', icon: Shield },
  { href: '/', label: 'Landing', icon: Zap },
]

function shouldHideAppChrome(pathname: string) {
  return pathname === '/'
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { currentUser, mode, ready } = useBeam()
  const hideChrome = shouldHideAppChrome(pathname)
  const [q, setQ] = useState('')

  if (hideChrome) {
    return <div className="app-shell relative min-h-dvh text-beam-cream">{children}</div>
  }

  const neighborhood = ready ? getNeighborhood(currentUser.neighborhood) : null

  function onSearch(e: FormEvent) {
    e.preventDefault()
    const next = q.trim()
    router.push(next ? `/browse?q=${encodeURIComponent(next)}` : '/browse')
  }

  return (
    <div className="app-shell relative min-h-dvh text-beam-cream lg:flex">
      {/* Desktop sidebar rail */}
      <aside className="app-sidebar sticky top-0 hidden h-dvh shrink-0 flex-col lg:flex" data-testid="app-sidebar">
        <div className="flex h-14 items-center gap-2 px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-beam-amber-soft text-beam-amber-deep shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
              <Zap className="h-4 w-4" fill="currentColor" />
            </span>
            <span className="text-[17px] font-semibold tracking-tight text-beam-charcoal">Beam</span>
          </Link>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2" aria-label="Primary">
          <div className="space-y-0.5">
            <p className="px-2 pb-1 type-meta text-beam-muted">Workspace</p>
            {primaryNav.map(({ href, label, icon: Icon }) => {
              const active =
                href === '/home'
                  ? pathname === '/home'
                  : pathname === href || pathname.startsWith(`${href}/`)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2.5 rounded-[11px] px-2.5 py-2 text-[13px] font-semibold transition ${
                    active
                      ? 'bg-beam-amber-soft text-beam-amber-deep shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]'
                      : 'text-beam-cream-dim hover:bg-beam-surface-3 hover:text-beam-cream'
                  }`}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.9} />
                  {label}
                </Link>
              )
            })}
          </div>
          <div className="space-y-0.5">
            <p className="px-2 pb-1 type-meta text-beam-muted">More</p>
            {secondaryNav.map(({ href, label, icon: Icon }) => {
              const active = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2.5 rounded-[11px] px-2.5 py-2 text-[13px] font-medium transition ${
                    active
                      ? 'bg-beam-surface-3 text-beam-cream'
                      : 'text-beam-muted hover:bg-beam-surface-3 hover:text-beam-cream'
                  }`}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.9} />
                  {label}
                </Link>
              )
            })}
          </div>
        </nav>

        <div className="m-3 elevated p-3">
          <div className="flex items-center gap-2.5">
            {ready ? <Avatar src={currentUser.avatar} name={currentUser.name} size={36} /> : null}
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-beam-cream">
                {ready ? currentUser.name : '…'}
              </p>
              <p className="truncate type-meta text-beam-muted">
                {neighborhood?.shortName ?? 'Austin'} · {mode}
              </p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="app-command sticky top-0 z-30">
          <div className="flex h-14 items-center gap-3 px-4">
            <Link href="/" className="flex items-center gap-2 lg:hidden">
              <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-beam-amber-soft text-beam-amber-deep">
                <Zap className="h-4 w-4" fill="currentColor" />
              </span>
              <span className="text-[16px] font-semibold tracking-tight text-beam-charcoal">Beam</span>
            </Link>

            <form onSubmit={onSearch} className="hidden min-w-0 flex-1 md:block">
              <label className="sr-only" htmlFor="app-command-search">
                Search Beam
              </label>
              <div className="relative max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-beam-muted" />
                <input
                  id="app-command-search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search requests or skills…"
                  className="h-10 w-full rounded-[11px] bg-beam-surface-3 pl-9 pr-3 text-[13px] text-beam-cream shadow-[inset_0_1px_2px_rgba(15,23,42,0.05)] placeholder:text-beam-muted focus:outline-none focus:ring-2 focus:ring-beam-amber/40"
                />
              </div>
            </form>

            <div className="ml-auto flex items-center gap-2">
              {neighborhood ? (
                <span className="hidden items-center rounded-full bg-beam-surface-3 px-3 py-1.5 type-meta text-beam-cream-dim sm:inline-flex">
                  {neighborhood.shortName}
                </span>
              ) : null}
              <span className="hidden rounded-full bg-white px-2.5 py-1 type-meta text-beam-muted shadow-[0_0_0_1px_rgba(15,23,42,0.07)] md:inline-flex">
                {mode === 'live' ? 'Live' : 'Demo'}
              </span>
              <Link
                href="/post"
                className="btn-compact inline-flex items-center gap-1.5 rounded-[11px] bg-beam-amber px-3.5 text-[13px] font-semibold text-beam-charcoal shadow-[0_1px_2px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.35)] hover:bg-beam-amber-deep hover:text-white"
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
