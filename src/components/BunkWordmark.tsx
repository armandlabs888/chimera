import Link from 'next/link'
import { Outfit } from 'next/font/google'

/** Bunk wordmark: Outfit 700, single word. Blue on light, white on dark. */
const outfit = Outfit({
  subsets: ['latin'],
  weight: ['700'],
  display: 'swap',
})

const BUNK_BLUE = '#1D5CE5'

/** Logo tracking for the wordmark at header and fixed sizes. */
const LOGO_TRACKING = '-0.02em'

type Tone = 'brand' | 'onDark' | 'white'

export function BunkWordmark({
  className = '',
  size = 17,
  tone = 'brand',
  href = '/',
}: {
  className?: string
  /**
   * Visual size in px, or `'header'` for responsive logo sizing:
   * 24px below `lg`, 28px at `lg` and up.
   */
  size?: number | 'header'
  /** `brand`: #1D5CE5 on light. `onDark` / `white`: white on dark heroes and chrome. */
  tone?: Tone
  href?: string
}) {
  const isHeader = size === 'header'
  const color = tone === 'brand' ? BUNK_BLUE : '#FFFFFF'

  return (
    <Link
      href={href}
      aria-label="Bunk home"
      className={`inline-flex min-h-10 w-fit max-w-full items-center rounded-sm outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/50 ${className}`}
    >
      <span
        className={`${outfit.className} inline-block font-bold leading-none${
          isHeader ? ' text-[24px] lg:text-[28px]' : ''
        }`}
        style={{
          ...(isHeader ? {} : { fontSize: size }),
          letterSpacing: LOGO_TRACKING,
          fontWeight: 700,
          color,
        }}
      >
        Bunk
      </span>
    </Link>
  )
}
