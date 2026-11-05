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
      <div className="landing-nav-inner mx-auto flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-beam-amber/15 text-beam-amber">
            <Zap className="h-4 w-4" fill="currentColor" aria-hidden />
          </span>
          <span className="text-[17px] font-semibold tracking-tight text-beam-charcoal">Beam</span>
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex" aria-label="Landing">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="btn-compact inline-flex items-center rounded-[8px] px-3 text-[13px] font-medium text-beam-muted transition hover:bg-beam-ink hover:text-beam-cream"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/you"
            className="btn-compact hidden items-center rounded-[8px] px-3 text-[13px] font-medium text-beam-muted hover:text-beam-cream sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/post"
            className="btn-compact inline-flex items-center justify-center rounded-[8px] bg-beam-amber px-3.5 text-[13px] font-semibold text-beam-charcoal transition hover:bg-beam-amber-deep"
          >
            Post a request
          </Link>
        </div>
      </div>
    </header>
  )
}
