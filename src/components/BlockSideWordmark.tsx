import Link from 'next/link'
import { Outfit } from 'next/font/google'

/** BlockSide wordmark: Outfit 700, text only. Blue on light, white on dark. */
const outfit = Outfit({
  subsets: ['latin'],
  weight: ['700'],
  display: 'swap',
})

const BLOCKSIDE_BLUE = '#1D5CE5'

/**
 * Tighter tracking so the longer BlockSide mark fits mobile headers (~390)
 * without wrapping or crowding adjacent controls.
 */
const LOGO_TRACKING = '-0.04em'

type Tone = 'brand' | 'onDark' | 'white'

export function BlockSideWordmark({
  className = '',
  size = 17,
  tone = 'brand',
  href = '/',
}: {
  className?: string
  /**
   * Visual size in px, or `'header'` for responsive logo sizing:
   * 18px below `sm`, 20px from `sm` to `lg`, 24px at `lg` and up.
   * (Slightly smaller than the prior short mark because BlockSide is longer.)
   */
  size?: number | 'header'
  /** `brand`: #1D5CE5 on light. `onDark` / `white`: white on dark heroes and chrome. */
  tone?: Tone
  href?: string
}) {
  const isHeader = size === 'header'
  const color = tone === 'brand' ? BLOCKSIDE_BLUE : '#FFFFFF'

  return (
    <Link
      href={href}
      aria-label="BlockSide home"
      className={`inline-flex min-h-10 w-fit max-w-full items-center rounded-sm outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/50 ${className}`}
    >
      <span
        className={`${outfit.className} inline-block whitespace-nowrap font-bold leading-none${
          isHeader ? ' text-[18px] sm:text-[20px] lg:text-[24px]' : ''
        }`}
        style={{
          ...(isHeader ? {} : { fontSize: size }),
          letterSpacing: LOGO_TRACKING,
          fontWeight: 700,
          color,
        }}
      >
        BlockSide
      </span>
    </Link>
  )
}
