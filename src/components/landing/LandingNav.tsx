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
        <Link href="/" className="landing-nav-brand flex items-center gap-2">
          <span className="landing-nav-mark flex h-8 w-8 items-center justify-center rounded-[8px]">
            <Zap className="h-4 w-4" fill="currentColor" aria-hidden />
          </span>
          <span className="text-[17px] font-semibold tracking-tight">Beam</span>
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex" aria-label="Landing">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="landing-nav-link btn-compact inline-flex items-center rounded-[8px] px-3 text-[13px] font-medium transition"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/auth?mode=signin"
            className="landing-nav-signin btn-compact hidden items-center rounded-[8px] px-3 text-[13px] font-medium sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/post"
            className="landing-nav-cta btn-compact inline-flex items-center justify-center rounded-[8px] px-3.5 text-[13px] font-semibold transition"
          >
            Post a request
          </Link>
        </div>
      </div>
    </header>
  )
}
