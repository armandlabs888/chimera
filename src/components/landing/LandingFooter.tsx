import Link from 'next/link'
import { BeamWordmark } from '@/components/BeamMark'

const LINKS = [
  { href: '/browse', label: 'Browse tasks' },
  { href: '/post', label: 'Post a request' },
  { href: '/safety', label: 'Safety & guidelines' },
  { href: '/auth?mode=signin', label: 'Sign in' },
]

export function LandingFooter() {
  return (
    <footer className="border-t border-[rgba(7,19,48,0.08)] bg-[#F4F8FD]">
      <div className="beam-container flex flex-col gap-8 py-12 md:flex-row md:items-end md:justify-between">
        <div>
          <BeamWordmark markWidth={26} markHeight={26} wordClassName="text-[26px]" tone="ink" />
          <p className="mt-4 max-w-[40ch] text-[15px] leading-[1.55] text-[#64748B]">
            Peer-to-peer everyday local help in Austin, TX. Excludes licensed trades, childcare,
            medical/senior care, and passenger driving.
          </p>
        </div>
        <nav
          className="flex flex-wrap gap-x-7 gap-y-3 text-[14.5px] font-semibold text-[#475569]"
          aria-label="Footer"
        >
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="transition hover:text-[#1D5CE5]">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="beam-container pb-10 text-[13px] text-[#94A3B8]">
        © 2026 Beam · Austin, TX · Payments are arranged directly between neighbors.
      </div>
    </footer>
  )
}
