'use client'

import { Zap } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { BottomNav } from './BottomNav'

const desktopLinks = [
  { href: '/', label: 'Home' },
  { href: '/browse', label: 'Browse' },
  { href: '/post', label: 'Post' },
  { href: '/you', label: 'You' },
  { href: '/safety', label: 'Safety' },
]

function shouldHideAppChrome(pathname: string) {
  return pathname === '/' || pathname.startsWith('/messages/')
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const hideChrome = shouldHideAppChrome(pathname)

  return (
    <div className="relative min-h-dvh bg-beam-base text-beam-cream">
      {!hideChrome ? (
        <header className="sticky top-0 z-30 border-b border-beam-line bg-beam-base/95 backdrop-blur-sm">
          <div className="mx-auto flex h-14 max-w-[72rem] items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-beam-amber/15 text-beam-amber">
                <Zap className="h-4 w-4" fill="currentColor" />
              </span>
              <span className="text-[17px] font-semibold tracking-tight text-beam-charcoal">Beam</span>
            </Link>
            <nav className="hidden items-center gap-0.5 md:flex" aria-label="Desktop">
              {desktopLinks.map((link) => {
                const active =
                  link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`btn-compact inline-flex items-center rounded-[8px] px-3 text-[13px] font-medium transition ${
                      active
                        ? 'bg-beam-amber-soft text-beam-amber-deep'
                        : 'text-beam-muted hover:bg-beam-ink hover:text-beam-cream'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </nav>
            <Link
              href="/post"
              className="btn-compact hidden items-center rounded-[8px] bg-beam-amber px-3.5 text-[13px] font-semibold text-beam-charcoal hover:bg-beam-amber-deep sm:inline-flex"
            >
              Post a request
            </Link>
          </div>
        </header>
      ) : null}

      <main className={`relative mx-auto w-full max-w-[72rem] ${hideChrome ? '' : 'pb-20 md:pb-8'}`}>
        {children}
      </main>

      {!hideChrome ? <BottomNav /> : null}
    </div>
  )
}
