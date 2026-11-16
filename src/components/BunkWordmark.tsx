import Link from 'next/link'
import { Outfit } from 'next/font/google'

/** Bunk wordmark: Outfit 700, single word. Blue on light, white on dark. */
const outfit = Outfit({
  subsets: ['latin'],
  weight: ['700'],
  display: 'swap',
})

/** Mock reference size for the -0.8px tracking (scales with `size`). */
const TRACKING_REF_PX = 22
const TRACKING_REF_PX_VALUE = -0.8

const BUNK_BLUE = '#1D5CE5'

type Tone = 'brand' | 'onDark' | 'white'

export function BunkWordmark({
  className = '',
  size = 17,
  tone = 'brand',
  href = '/',
}: {
  className?: string
  /** Visual size in px; keeps header weight close to the prior ~17–18px mark. */
  size?: number
  /** `brand`: #1D5CE5 on light. `onDark` / `white`: white on dark heroes and chrome. */
  tone?: Tone
  href?: string
}) {
  const letterSpacing = `${(TRACKING_REF_PX_VALUE * size) / TRACKING_REF_PX}px`
  const color = tone === 'brand' ? BUNK_BLUE : '#FFFFFF'

  return (
    <Link
      href={href}
      aria-label="Bunk home"
      className={`inline-flex min-h-10 w-fit max-w-full items-center rounded-sm outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/50 ${className}`}
    >
      <span
        className={`${outfit.className} inline-block font-bold leading-none`}
        style={{
          fontSize: size,
          letterSpacing,
          fontWeight: 700,
          color,
        }}
      >
        Bunk
      </span>
    </Link>
  )
}
