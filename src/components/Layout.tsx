'use client'

import { Zap } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { BottomNav } from './BottomNav'

const desktopLinks = [
  { href: '/', label: 'Home' },
  { href: '/browse', label: 'Browse' },
  { href: '/post', label: 'Post request' },
  { href: '/you', label: 'You' },
  { href: '/safety', label: 'Safety' },
]

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const hideChrome = pathname.startsWith('/messages/')

  return (
    <div className="min-h-dvh bg-beam-base text-beam-cream">
      <div className="pointer-events-none fixed inset-0 grain opacity-40" aria-hidden />
      {!hideChrome ? (
        <header className="sticky top-0 z-30 border-b border-beam-line/60 bg-beam-base/90 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2 touch-target">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-beam-amber/15 text-beam-amber">
                <Zap className="h-5 w-5" fill="currentColor" />
              </span>
              <span className="font-display text-xl font-semibold tracking-tight">Beam</span>
            </Link>
            <nav className="hidden items-center gap-1 md:flex" aria-label="Desktop">
              {desktopLinks.map((link) => {
                const active =
                  link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                      active ? 'bg-beam-amber-soft text-beam-amber' : 'text-beam-muted hover:text-beam-cream'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </nav>
          </div>
        </header>
      ) : null}

      <main className={`relative mx-auto w-full max-w-6xl ${hideChrome ? '' : 'pb-24 md:pb-10'}`}>
        {children}
      </main>

      {!hideChrome ? <BottomNav /> : null}
    </div>
  )
}
