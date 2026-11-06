'use client'

import { useId } from 'react'

/** Soft luminous comet-tail halo — reference-locked warm-obsidian mark. */
export function BeamMark({
  className = '',
  width = 64,
  height = 28,
}: {
  className?: string
  width?: number
  height?: number
}) {
  const uid = useId().replace(/:/g, '')
  const gradId = `halo-${uid}`
  const blurId = `haloBlur-${uid}`

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width, height }}
      aria-hidden
    >
      <span
        className="pointer-events-none absolute"
        style={{
          inset: '-40px -60px',
          background: 'radial-gradient(closest-side, rgba(230,160,70,.35), transparent)',
          filter: 'blur(12px)',
        }}
      />
      <svg width={width} height={height} viewBox="0 0 64 28" fill="none" className="relative">
        <defs>
          <linearGradient
            id={gradId}
            x1="4"
            y1="20"
            x2="60"
            y2="8"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#B87A32" stopOpacity="0" />
            <stop offset=".35" stopColor="#D9A050" stopOpacity=".55" />
            <stop offset=".75" stopColor="#FFE7B8" stopOpacity="1" />
            <stop offset="1" stopColor="#FFF6E2" stopOpacity=".95" />
          </linearGradient>
          <filter id={blurId} x="-30%" y="-80%" width="160%" height="260%">
            <feGaussianBlur stdDeviation="2.4" />
          </filter>
        </defs>
        <g transform="rotate(-14 32 14)">
          <ellipse
            cx="32"
            cy="14"
            rx="27"
            ry="8.5"
            stroke={`url(#${gradId})`}
            strokeWidth="5"
            filter={`url(#${blurId})`}
            opacity=".85"
          />
          <ellipse
            cx="32"
            cy="14"
            rx="27"
            ry="8.5"
            stroke={`url(#${gradId})`}
            strokeWidth="1.6"
          />
        </g>
      </svg>
    </span>
  )
}

export function BeamWordmark({
  className = '',
  markWidth = 64,
  markHeight = 28,
  wordClassName = '',
}: {
  className?: string
  markWidth?: number
  markHeight?: number
  wordClassName?: string
}) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <BeamMark width={markWidth} height={markHeight} />
      <span
        className={`font-serif text-[32px] font-normal leading-none tracking-[-0.01em] text-[#F6F3EE] ${wordClassName}`}
        style={{ fontVariationSettings: "'opsz' 72" }}
      >
        Beam
      </span>
    </span>
  )
}
