/** Glowing tilted halo mark — matches warm-obsidian editorial reference. */
export function BeamMark({
  className = '',
  size = 34,
}: {
  className?: string
  size?: number
}) {
  const h = Math.round(size * (16 / 34))
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 34 34"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter:
            'drop-shadow(0 0 10px rgba(235,172,84,0.8)) drop-shadow(0 0 22px rgba(213,145,58,0.5))',
        }}
      >
        <g transform="rotate(-22 17 17)">
          <ellipse
            cx="17"
            cy="17"
            rx="14"
            ry="6.5"
            stroke="#EBAC54"
            strokeWidth="2.2"
            opacity="0.55"
          />
          <ellipse
            cx="17"
            cy="17"
            rx="12.5"
            ry="5.4"
            stroke="#FFF8EB"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeDasharray="28 40"
            strokeDashoffset="4"
          />
          <ellipse
            cx="17"
            cy="17"
            rx="12.5"
            ry="5.4"
            stroke="#FFE8C0"
            strokeWidth="1.2"
            opacity="0.9"
          />
        </g>
      </svg>
      <span className="sr-only" style={{ width: h, height: h }} />
    </span>
  )
}

export function BeamWordmark({
  className = '',
  markSize = 34,
}: {
  className?: string
  markSize?: number
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <BeamMark size={markSize} />
      <span className="font-serif text-[25px] font-normal leading-none tracking-[-0.01em] text-[#F7F4EE]">
        Beam
      </span>
    </span>
  )
}
