import Link from 'next/link'
import { Outfit } from 'next/font/google'

/** Option F wordmark: Outfit 700, House #071330 + Call #1D5CE5. */
const outfit = Outfit({
  subsets: ['latin'],
  weight: ['700'],
  display: 'swap',
})

/** Mock reference size for the -0.8px tracking (scales with `size`). */
const TRACKING_REF_PX = 22
const TRACKING_REF_PX_VALUE = -0.8

const HOUSE_INK = '#071330'
const CALL_BLUE = '#1D5CE5'

type Tone = 'brand' | 'onDark' | 'white'

export function HouseCallWordmark({
  className = '',
  size = 17,
  tone = 'brand',
  href = '/',
}: {
  className?: string
  /** Visual size in px; keeps header weight close to the prior ~17–18px mark. */
  size?: number
  /** `onDark`: House white, Call blue. `white`: all-white for dark heroes. */
  tone?: Tone
  href?: string
}) {
  const letterSpacing = `${(TRACKING_REF_PX_VALUE * size) / TRACKING_REF_PX}px`
  const houseColor = tone === 'brand' ? HOUSE_INK : '#FFFFFF'
  const callColor = tone === 'white' ? '#FFFFFF' : CALL_BLUE

  return (
    <Link
      href={href}
      aria-label="HouseCall home"
      className={`inline-flex min-h-10 w-fit max-w-full items-center rounded-sm outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/50 ${className}`}
    >
      <span
        className={`${outfit.className} inline-block font-bold leading-none`}
        style={{
          fontSize: size,
          letterSpacing,
          fontWeight: 700,
        }}
      >
        <span style={{ color: houseColor }}>House</span>
        <span style={{ color: callColor }}>Call</span>
      </span>
    </Link>
  )
}
