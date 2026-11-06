'use client'

import Link from 'next/link'
import { LandingSection } from '@/components/flat'
import { NEIGHBORHOODS } from '@/data/neighborhoods'

export function LandingNeighborhoods() {
  return (
    <LandingSection id="coverage">
      <div className="section-inner">
        <div className="max-w-2xl">
          <p className="flat-meta">Coverage</p>
          <h2 className="mt-3 font-serif text-[clamp(2rem,3.6vw,3rem)] font-normal text-[#FAF8F4]">
            Eight central Austin neighborhoods
          </h2>
          <p className="mt-2 text-[17px] text-[#A7A39C]">
            Beam starts around Lady Bird Lake — dense, walkable cores where same-day help actually works.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <AustinMap />
          <ul className="grid gap-2 sm:grid-cols-2">
            {NEIGHBORHOODS.map((n) => (
              <li key={n.id}>
                <Link
                  href={`/browse?neighborhood=${n.id}`}
                  className="elevated elevated-hover flex items-center justify-between gap-3 px-4 py-3 transition"
                >
                  <span className="text-[14.5px] font-medium text-[#F7F4EE]">{n.name}</span>
                  <span className="type-meta text-[#7E7A73]">Browse</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </LandingSection>
  )
}

function AustinMap() {
  return (
    <div
      data-testid="austin-map"
      className="elevated relative overflow-hidden p-4 sm:p-6"
      aria-label="Stylized map of central Austin neighborhoods around Lady Bird Lake"
    >
      <svg viewBox="0 0 560 360" className="h-auto w-full" role="img">
        <title>Central Austin coverage map</title>
        <rect width="560" height="360" fill="#121317" rx="12" />
        {/* Lady Bird Lake */}
        <path
          d="M40 210 C120 190, 200 230, 280 215 C360 200, 440 230, 520 210 L520 250 C440 270, 360 240, 280 255 C200 270, 120 230, 40 250 Z"
          fill="rgba(125, 180, 200, 0.18)"
          stroke="rgba(125, 180, 200, 0.35)"
          strokeWidth="1.5"
        />
        <text x="250" y="235" fontSize="11" fill="#7E9AAB" fontFamily="system-ui">
          Lady Bird Lake
        </text>
        {/* Neighborhood pins */}
        {[
          { x: 420, y: 100, label: 'The Domain' },
          { x: 300, y: 90, label: 'Hyde Park' },
          { x: 360, y: 130, label: 'Mueller' },
          { x: 220, y: 140, label: 'Clarksville' },
          { x: 380, y: 170, label: 'East Austin' },
          { x: 260, y: 280, label: 'Zilker' },
          { x: 320, y: 295, label: 'South Congress' },
          { x: 360, y: 270, label: 'Travis Heights' },
        ].map((p) => (
          <g key={p.label}>
            <circle cx={p.x} cy={p.y} r="7" fill="#DDA352" opacity="0.9" />
            <circle cx={p.x} cy={p.y} r="12" fill="none" stroke="rgba(221,163,82,0.35)" strokeWidth="1.5" />
            <text
              x={p.x + 14}
              y={p.y + 4}
              fontSize="11"
              fill="#D4D0C8"
              fontFamily="system-ui"
              fontWeight="500"
            >
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
