import Link from 'next/link'
import { BeamWordmark } from '@/components/BeamMark'

const LINKS = [
  { href: '/browse', label: 'Browse' },
  { href: '/post', label: 'Post' },
  { href: '/safety', label: 'Safety' },
  { href: '/auth?mode=signin', label: 'Log in' },
  { href: '/auth?mode=signup', label: 'Sign up' },
]

export function LandingFooter() {
  return (
    <footer className="border-t border-white/[0.07] bg-[#0E0F12]">
      <div className="section-inner flex flex-col gap-8 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <BeamWordmark />
          <p className="mt-3 max-w-xs text-[14px] leading-relaxed text-[#A7A39C]">
            Peer-to-peer help, locally. Structured requests and priced offers across central Austin.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Footer">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-[14px] text-[#A7A39C] hover:text-white transition"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="section-inner border-t border-white/[0.07] py-5">
        <p className="text-[12.5px] text-[#7E7A73]">
          © 2026 Beam · Austin, TX · Peer-to-peer payments · Not escrow
        </p>
      </div>
    </footer>
  )
}
