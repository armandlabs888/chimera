'use client'

import { Zap } from 'lucide-react'
import Link from 'next/link'

const anchors = [
  { href: '#product', label: 'Product' },
  { href: '#categories', label: 'Categories' },
  { href: '#coverage', label: 'Coverage' },
  { href: '#trust', label: 'Trust' },
]

export function LandingNav() {
  return (
    <header className="landing-nav">
      <div className="landing-nav-inner mx-auto flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="landing-nav-brand flex items-center gap-2">
          <span className="landing-nav-mark flex h-8 w-8 items-center justify-center rounded-[8px]">
            <Zap className="h-4 w-4" fill="currentColor" />
          </span>
          <span className="text-[17px] font-semibold tracking-tight">Beam</span>
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Marketing">
          {anchors.map((a) => (
            <a key={a.href} href={a.href} className="landing-nav-link btn-compact inline-flex items-center rounded-[8px] px-3 text-[13px] font-medium">
              {a.label}
            </a>
          ))}
          <Link href="/browse" className="landing-nav-link btn-compact inline-flex items-center rounded-[8px] px-3 text-[13px] font-medium">
            Browse
          </Link>
          <Link href="/safety" className="landing-nav-link btn-compact inline-flex items-center rounded-[8px] px-3 text-[13px] font-medium">
            Safety
          </Link>
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link
            href="/auth?mode=signin"
            className="landing-nav-signin btn-compact hidden items-center rounded-[8px] px-3 text-[13px] font-medium sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/auth?mode=signup"
            className="btn-compact hidden items-center rounded-[8px] border border-beam-line px-3 text-[13px] font-medium text-beam-cream hover:bg-beam-surface-2 md:inline-flex"
          >
            Create account
          </Link>
          <Link
            href="/post"
            className="landing-nav-cta btn-compact inline-flex items-center rounded-[8px] px-3.5 text-[13px] font-semibold"
          >
            Post a request
          </Link>
        </div>
      </div>
    </header>
  )
}
