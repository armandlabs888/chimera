'use client'

import Link from 'next/link'
import { Zap } from 'lucide-react'

const links = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#categories', label: 'Categories' },
  { href: '#paths', label: 'Help or earn' },
]

export function LandingNav() {
  return (
    <header className="landing-nav">
      <div className="landing-nav-inner landing-glass mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="touch-target flex items-center gap-2 rounded-xl">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-beam-amber/15 text-beam-amber">
            <Zap className="h-5 w-5" fill="currentColor" aria-hidden />
          </span>
          <span className="font-display text-xl font-semibold tracking-tight text-beam-cream">Beam</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Landing">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="touch-target rounded-xl px-3 py-2 text-xs font-medium uppercase tracking-[0.14em] text-beam-muted transition hover:text-beam-cream"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/you"
            className="touch-target hidden rounded-xl px-3 py-2 text-sm font-medium text-beam-cream-dim transition hover:text-beam-cream sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/post"
            className="touch-target inline-flex items-center justify-center rounded-xl bg-beam-amber px-4 py-2.5 text-sm font-semibold text-beam-base transition hover:bg-beam-amber-deep"
          >
            Post a request
          </Link>
        </div>
      </div>
    </header>
  )
}
