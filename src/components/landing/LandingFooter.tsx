import Link from 'next/link'
import { BeamWordmark } from '@/components/BeamMark'

const FOOTER_LINKS = [
  { href: '/browse', label: 'Browse jobs' },
  { href: '/post', label: 'Post a task' },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/safety', label: 'Safety' },
  { href: '/terms', label: 'Terms' },
  { href: '/privacy', label: 'Privacy' },
] as const

const linkClass =
  'inline-flex min-h-[44px] items-center text-[13px] font-medium leading-snug text-[#4A5568] transition hover:text-[#071330] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93C5FD]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white'

/**
 * Slim site footer used on every page: logo + copyright, one link row.
 * White surface with top hairline to match the flat white app chrome.
 */
export function LandingFooter({
  dockPadding = false,
}: {
  /** Extra bottom padding when the mobile BottomNav dock is present. */
  dockPadding?: boolean
}) {
  return (
    <footer
      className={`shrink-0 border-t border-[#E3E8EF] bg-white ${
        dockPadding ? 'pb-24 md:pb-0' : ''
      }`}
      data-testid="landing-footer"
      data-app-footer="true"
      id="site-footer"
    >
      <div className="beam-container flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:py-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Link
            href="/"
            className="inline-flex w-fit rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93C5FD]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            aria-label="HouseCall home"
          >
            <BeamWordmark
              markWidth={18}
              markHeight={18}
              wordClassName="text-[16px] tracking-[-0.03em]"
              tone="ink"
            />
          </Link>
          <p
            className="text-[13px] leading-none text-[#4A5568]"
            data-testid="footer-legal"
          >
            © HouseCall
          </p>
        </div>

        <nav
          aria-label="Footer"
          className="flex max-w-full flex-wrap items-center gap-x-4 gap-y-0 sm:justify-end"
        >
          {FOOTER_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={linkClass}>
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
