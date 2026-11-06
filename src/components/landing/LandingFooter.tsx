import Link from 'next/link'
import { BeamWordmark } from '@/components/BeamMark'

const LINKS = [
  { href: '/browse', label: 'Browse' },
  { href: '/post', label: 'Post a request' },
  { href: '/safety', label: 'Safety' },
  { href: '/auth?mode=signin', label: 'Log in' },
  { href: '/auth?mode=signup', label: 'Sign up' },
]

export function LandingFooter() {
  return (
    <footer className="mt-[clamp(48px,6vw,88px)] border-t border-white/[0.08]">
      <div className="beam-container flex flex-col gap-8 py-10 md:flex-row md:items-end md:justify-between">
        <div>
          <BeamWordmark markWidth={44} markHeight={20} wordClassName="text-[28px]" />
          <p className="mt-4 max-w-[34ch] text-[16px] leading-[1.55] text-[#B7B2AA]">
            Help nearby. Done today.
            <br />
            Peer-to-peer, in central Austin.
          </p>
        </div>
        <nav
          className="flex flex-wrap gap-x-8 gap-y-3 text-[15px] font-medium tracking-[0.005em] text-[#B7B2AA]"
          aria-label="Footer"
        >
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="transition hover:text-[#F6F3EE]">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="beam-container pb-10 text-[13px] text-[#85817A]">
        © 2026 Beam · Austin, TX · Payments are arranged directly between neighbors.
      </div>
    </footer>
  )
}
