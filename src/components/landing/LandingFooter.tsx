import Link from 'next/link'
import { Zap } from 'lucide-react'

const PRODUCT = [
  { href: '#product', label: 'How it works' },
  { href: '#categories', label: 'Categories' },
  { href: '#coverage', label: 'Neighborhoods' },
  { href: '/browse', label: 'Browse' },
  { href: '/post', label: 'Post a request' },
]

const ACCOUNT = [
  { href: '/auth?mode=signin', label: 'Sign in' },
  { href: '/auth?mode=signup', label: 'Create account' },
  { href: '/you', label: 'Your account' },
  { href: '/messages', label: 'Messages' },
  { href: '/home', label: 'App home' },
]

const TRUST = [
  { href: '#trust', label: 'Trust & FAQ' },
  { href: '/safety', label: 'Safety' },
]

export function LandingFooter() {
  return (
    <footer className="border-t border-black/[0.06] bg-beam-canvas">
      <div className="section-inner py-10 sm:py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-beam-charcoal">
              <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-beam-amber-soft text-beam-amber-deep shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                <Zap className="h-4 w-4" fill="currentColor" />
              </span>
              <span className="text-[17px] font-semibold tracking-tight">Beam</span>
            </Link>
            <p className="mt-3 max-w-xs type-sec text-beam-muted">
              Help nearby. Done today. Austin peer-to-peer marketplace for practical same-day help.
            </p>
          </div>
          <FooterCol title="Product" links={PRODUCT} />
          <FooterCol title="Account" links={ACCOUNT} />
          <FooterCol title="Trust" links={TRUST} />
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-black/[0.06] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="type-sec text-beam-muted">
            Scoped to eight Austin neighborhoods · Payments arranged peer-to-peer
          </p>
          <p className="type-meta text-beam-muted">© 2026 Beam</p>
        </div>
      </div>
    </footer>
  )
}

function FooterCol({
  title,
  links,
}: {
  title: string
  links: { href: string; label: string }[]
}) {
  return (
    <div>
      <p className="type-meta text-beam-muted">{title}</p>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.href + l.label}>
            <Link href={l.href} className="type-sec font-medium text-beam-cream-dim hover:text-beam-cream">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
