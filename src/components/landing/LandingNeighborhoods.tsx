import Link from 'next/link'
import { LandingSection } from '@/components/flat'
import { NEIGHBORHOODS } from '@/data/neighborhoods'
import type { NeighborhoodId } from '@/types'

/** Approximate pin positions on stylized Austin SVG (viewBox 0 0 400 320). */
const PINS: { id: NeighborhoodId; x: number; y: number }[] = [
  { id: 'the-domain', x: 210, y: 42 },
  { id: 'hyde-park', x: 200, y: 110 },
  { id: 'mueller', x: 245, y: 118 },
  { id: 'clarksville', x: 155, y: 145 },
  { id: 'east-austin', x: 255, y: 155 },
  { id: 'zilker', x: 165, y: 195 },
  { id: 'south-congress', x: 200, y: 220 },
  { id: 'travis-heights', x: 230, y: 215 },
]

export function LandingNeighborhoods() {
  return (
    <LandingSection id="coverage" className="border-b border-black/[0.05] bg-white">
      <div className="section-inner">
        <div className="max-w-2xl">
          <span className="eyebrow-pill">Coverage</span>
          <h2 className="mt-3 type-h1 text-beam-charcoal">Austin neighborhood matrix</h2>
          <p className="mt-2 type-intro text-beam-cream-dim">
            Eight supported areas across Lady Bird Lake. Ranking prefers closer neighborhoods first.
          </p>
        </div>

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="elevated-md overflow-hidden bg-beam-canvas p-3 sm:p-4" data-testid="austin-map">
            <AustinMapSvg />
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {NEIGHBORHOODS.map((n) => (
              <Link
                key={n.id}
                href={`/browse?neighborhood=${n.id}`}
                className="elevated elevated-hover flex items-center justify-between px-4 py-3"
              >
                <div>
                  <p className="text-[14px] font-semibold text-beam-cream">{n.name}</p>
                  <p className="type-meta text-beam-muted">Browse nearby</p>
                </div>
                <span className="type-meta font-semibold text-beam-amber-deep">{n.shortName}</span>
              </Link>
            ))}
          </div>
        </div>

        <p className="mt-4 type-sec text-beam-muted">
          Distance-aware sorting uses approximate neighborhood miles — not live GPS tracking.
        </p>
      </div>
    </LandingSection>
  )
}

function AustinMapSvg() {
  return (
    <svg viewBox="0 0 400 320" className="h-auto w-full" role="img" aria-label="Stylized map of Austin neighborhoods">
      {/* Land wash */}
      <rect x="0" y="0" width="400" height="320" fill="#F8F9FB" rx="12" />
      {/* Structural grid */}
      {Array.from({ length: 10 }).map((_, i) => (
        <line
          key={`v${i}`}
          x1={40 + i * 36}
          y1="20"
          x2={40 + i * 36}
          y2="300"
          stroke="rgba(15,23,42,0.04)"
          strokeWidth="1"
        />
      ))}
      {Array.from({ length: 8 }).map((_, i) => (
        <line
          key={`h${i}`}
          x1="20"
          y1={30 + i * 36}
          x2="380"
          y2={30 + i * 36}
          stroke="rgba(15,23,42,0.04)"
          strokeWidth="1"
        />
      ))}

      {/* I-35 corridor */}
      <path d="M230 20 L245 300" stroke="rgba(15,23,42,0.12)" strokeWidth="3" strokeLinecap="round" />
      <text x="250" y="40" fontSize="9" fill="#71717A" fontWeight="600">
        I-35
      </text>

      {/* MoPac corridor */}
      <path d="M140 30 L150 300" stroke="rgba(15,23,42,0.1)" strokeWidth="2.5" strokeLinecap="round" />
      <text x="100" y="48" fontSize="9" fill="#71717A" fontWeight="600">
        MoPac
      </text>

      {/* Colorado River / Lady Bird Lake */}
      <path
        d="M40 168 C 90 150, 140 175, 190 168 C 240 160, 280 175, 360 162 L 360 188 C 280 200, 240 185, 190 192 C 140 200, 90 175, 40 192 Z"
        fill="#E0F2FE"
        stroke="#7DD3FC"
        strokeWidth="1.5"
      />
      <text x="150" y="182" fontSize="10" fill="#0369A1" fontWeight="600">
        Lady Bird Lake
      </text>

      {/* Downtown block hint */}
      <rect x="185" y="148" width="28" height="18" rx="3" fill="rgba(15,23,42,0.06)" />

      {PINS.map((pin) => {
        const n = NEIGHBORHOODS.find((x) => x.id === pin.id)!
        return (
          <a key={pin.id} href={`/browse?neighborhood=${pin.id}`}>
            <g className="cursor-pointer">
              <circle cx={pin.x} cy={pin.y} r="10" fill="#FEF3C7" stroke="#D97706" strokeWidth="1.5" />
              <circle cx={pin.x} cy={pin.y} r="3.5" fill="#B45309" />
              <text x={pin.x + 12} y={pin.y + 3} fontSize="10" fill="#171717" fontWeight="600">
                {n.shortName}
              </text>
            </g>
          </a>
        )
      })}
    </svg>
  )
}
