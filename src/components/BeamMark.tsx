/** Four-point sparkle mark for Beam daylight brand. */
export function BeamMark({
  className = '',
  width = 28,
  height = 28,
  color = 'currentColor',
}: {
  className?: string
  width?: number
  height?: number
  color?: string
}) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width, height }}
      aria-hidden
    >
      <svg width={width} height={height} viewBox="0 0 32 32" fill="none">
        <path
          d="M16 2.5c.55 0 1.02.36 1.18.88l1.55 5.1a6.5 6.5 0 0 0 4.29 4.29l5.1 1.55a1.25 1.25 0 0 1 0 2.36l-5.1 1.55a6.5 6.5 0 0 0-4.29 4.29l-1.55 5.1a1.25 1.25 0 0 1-2.36 0l-1.55-5.1a6.5 6.5 0 0 0-4.29-4.29l-5.1-1.55a1.25 1.25 0 0 1 0-2.36l5.1-1.55a6.5 6.5 0 0 0 4.29-4.29l1.55-5.1A1.25 1.25 0 0 1 16 2.5Z"
          fill={color}
        />
      </svg>
    </span>
  )
}

export function BeamWordmark({
  className = '',
  markWidth = 28,
  markHeight = 28,
  wordClassName = '',
  tone = 'ink',
}: {
  className?: string
  markWidth?: number
  markHeight?: number
  wordClassName?: string
  tone?: 'ink' | 'white' | 'royal' | 'onDark'
}) {
  const colors = {
    ink: { mark: '#1D5CE5', word: 'text-[#071330]' },
    white: { mark: '#FFFFFF', word: 'text-white' },
    royal: { mark: '#1D5CE5', word: 'text-[#1D5CE5]' },
    /** Blue mark + white word for navy/slate surfaces */
    onDark: { mark: '#1D5CE5', word: 'text-white' },
  }[tone]

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <BeamMark width={markWidth} height={markHeight} color={colors.mark} />
      <span
        className={`font-display text-[26px] font-bold leading-none tracking-[-0.025em] ${colors.word} ${wordClassName}`}
      >
        Beam
      </span>
    </span>
  )
}
