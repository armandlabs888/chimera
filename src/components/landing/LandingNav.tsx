'use client'

import { Search, Zap } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const anchors = [
  { href: '#product', label: 'Product' },
  { href: '#categories', label: 'Categories' },
  { href: '#coverage', label: 'Coverage' },
  { href: '#trust', label: 'Trust' },
]

export function LandingNav() {
  const [active, setActive] = useState('')

  useEffect(() => {
    const onHash = () => setActive(window.location.hash || '')
    onHash()
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  return (
    <header className="landing-nav" data-testid="landing-nav-capsule">
      <div className="landing-nav-inner">
        <Link href="/" className="landing-nav-brand flex items-center gap-2">
          <span className="landing-nav-mark flex h-8 w-8 items-center justify-center rounded-full">
            <Zap className="h-4 w-4" fill="currentColor" />
          </span>
          <span className="text-[16px] font-semibold tracking-tight">Beam</span>
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Marketing">
          {anchors.map((a) => (
            <a
              key={a.href}
              href={a.href}
              data-active={active === a.href ? 'true' : 'false'}
              className="landing-nav-link btn-compact inline-flex items-center rounded-full px-3 text-[13px] font-semibold"
            >
              {a.label}
            </a>
          ))}
          <Link
            href="/browse"
            className="landing-nav-link btn-compact inline-flex items-center rounded-full px-3 text-[13px] font-semibold"
          >
            Browse
          </Link>
        </nav>

        <div className="flex items-center gap-1">
          <Link
            href="/browse"
            className="btn-compact inline-flex items-center justify-center rounded-full text-beam-muted hover:bg-beam-surface-3 hover:text-beam-cream"
            aria-label="Search browse"
          >
            <Search className="h-4 w-4" />
          </Link>
          <Link
            href="/auth?mode=signin"
            className="landing-nav-signin btn-compact hidden items-center rounded-full px-3 text-[13px] font-semibold sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/auth?mode=signup"
            className="btn-compact hidden items-center rounded-full bg-white px-3 text-[13px] font-semibold text-beam-cream shadow-[0_0_0_1px_rgba(15,23,42,0.08)] hover:bg-beam-surface-2 md:inline-flex"
          >
            Create account
          </Link>
          <Link href="/post" className="landing-nav-cta btn-compact inline-flex items-center rounded-full px-3.5 text-[13px] font-semibold">
            Post a request
          </Link>
        </div>
      </div>
    </header>
  )
}
