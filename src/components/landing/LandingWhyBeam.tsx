import Link from 'next/link'

const PILLARS = [
  {
    step: '01',
    title: 'See the offer.',
    body: 'Compare priced offers and arrival windows before you accept — so you know what you’re choosing.',
  },
  {
    step: '02',
    title: 'Talk through the details.',
    body: 'Use in-app messaging to confirm timing, access, and anything a helper should know.',
  },
  {
    step: '03',
    title: 'Keep the feedback useful.',
    body: 'After the job, leave a review that helps neighbors decide who to work with next time.',
  },
] as const

/**
 * Why Beam — factual pillars only (no invented live offers / counts / named testimonials).
 */
export function LandingWhyBeam() {
  return (
    <section
      className="bg-white py-16 sm:py-20"
      data-testid="why-beam-section"
      id="why-beam"
    >
      <div className="beam-container">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1D5CE5]">
          04 / Why Beam
        </p>
        <h2 className="mt-3 max-w-[16ch] font-sans text-[clamp(1.75rem,3.2vw,2.5rem)] font-bold leading-[1.12] tracking-[-0.02em] text-[#071330]">
          Know what you’re choosing.
        </h2>

        <ul className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-6 lg:gap-10">
          {PILLARS.map((pillar) => (
            <li key={pillar.step} className="min-w-0">
              <p className="text-[13px] font-bold tabular-nums text-[#1D5CE5]">{pillar.step}</p>
              <h3 className="mt-2 text-[18px] font-bold leading-snug text-[#071330]">
                {pillar.title}
              </h3>
              <p className="mt-2 text-[14.5px] leading-[1.55] text-[#475569]">{pillar.body}</p>
            </li>
          ))}
        </ul>

        <p className="mt-10">
          <Link
            href="/safety"
            className="text-[14.5px] font-semibold text-[#1D5CE5] underline-offset-2 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/40"
          >
            Read our safety & community guidelines →
          </Link>
        </p>
      </div>
    </section>
  )
}
