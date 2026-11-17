import Link from 'next/link'

const PILLARS = [
  {
    step: '01',
    title: 'See the offer first',
    body: 'Compare proposed price and arrival window before choosing.',
  },
  {
    step: '02',
    title: 'Talk through the details',
    body: 'Use in-app messages to agree on what the job involves.',
  },
  {
    step: '03',
    title: 'Leave useful feedback',
    body: 'Share a review after the task to help the next person choose.',
  },
] as const

/**
 * Why BlockSide. Landing v2 split list (no fabricated social proof) on white.
 */
export function LandingWhyBeam() {
  return (
    <section
      className="relative overflow-hidden bg-white py-11 md:py-14"
      data-testid="why-beam-section"
      id="why-beam"
    >
      <div className="beam-container relative">
        <div className="grid gap-8 md:grid-cols-[1.1fr_1fr] md:items-start">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#1D5CE5]">
              Why BlockSide
            </p>
            <h2 className="mt-1.5 text-[26px] font-bold tracking-[-0.02em] text-[#071330] md:text-[30px]">
              Know what you’re choosing.
            </h2>
            <p className="mt-2 max-w-md text-[15px] leading-[1.55] text-[#4A5568]">
              Clear steps and in-app messaging, so you can compare offers and agree on the details
              before anyone starts.
            </p>
            <Link
              href="/safety"
              className="mt-4 inline-flex min-h-10 items-center text-[14px] font-semibold text-[#1D5CE5] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/40"
            >
              Read safety &amp; community guidelines →
            </Link>
          </div>
          <ul className="space-y-4">
            {PILLARS.map((pillar) => (
              <li key={pillar.step} className="flex gap-3">
                <span className="mt-0.5 text-[13px] font-bold text-[#1D5CE5]">{pillar.step}</span>
                <div>
                  <h3 className="text-[15px] font-semibold text-[#071330]">{pillar.title}</h3>
                  <p className="mt-0.5 text-[13px] leading-5 text-[#4A5568]">{pillar.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
