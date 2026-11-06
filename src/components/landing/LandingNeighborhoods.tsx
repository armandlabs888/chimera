import Link from 'next/link'
import { LandingSection } from '@/components/flat'
import { NEIGHBORHOODS } from '@/data/neighborhoods'

export function LandingNeighborhoods() {
  return (
    <LandingSection id="coverage" className="border-b border-beam-line">
      <div className="section-inner">
        <div className="max-w-2xl">
          <p className="flat-meta text-beam-amber-deep">Coverage</p>
          <h2 className="mt-2 type-h1 text-beam-charcoal">Austin neighborhood matrix</h2>
          <p className="mt-2 type-intro text-beam-cream-dim">
            Beam is scoped to eight Austin areas. In-product ranking prefers closer neighborhoods
            first so same-day help stays realistic.
          </p>
        </div>

        <div className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {NEIGHBORHOODS.map((n) => (
            <Link
              key={n.id}
              href={`/browse?neighborhood=${n.id}`}
              className="flat-row rounded-[12px] border border-beam-line bg-beam-base px-4 py-3.5 hover:bg-beam-surface-2"
            >
              <p className="text-[15px] font-semibold text-beam-cream">{n.name}</p>
              <p className="mt-0.5 type-sec text-beam-muted">Browse nearby · {n.shortName}</p>
            </Link>
          ))}
        </div>

        <p className="mt-4 type-sec text-beam-muted">
          Distance-aware sorting uses approximate neighborhood-to-neighborhood miles — not live GPS
          tracking.
        </p>
      </div>
    </LandingSection>
  )
}
