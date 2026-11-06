const CHIPS = [
  'Six practical categories',
  'Priced offers with arrival time',
  'In-thread coordination',
  'Bidirectional reviews',
  'Payments arranged peer-to-peer (not held by Beam)',
]

export function LandingTrustStrip() {
  return (
    <section className="border-b border-beam-line bg-beam-surface-2 py-4" aria-label="What Beam includes">
      <div className="section-inner flex flex-wrap items-center gap-2">
        {CHIPS.map((chip) => (
          <span
            key={chip}
            className="inline-flex items-center rounded-full border border-beam-line bg-beam-base px-3 py-1.5 type-sec text-beam-cream-dim"
          >
            {chip}
          </span>
        ))}
      </div>
    </section>
  )
}
