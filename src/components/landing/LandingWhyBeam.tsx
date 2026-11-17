import Link from 'next/link'
import { LandingReveal } from './LandingReveal'

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
 * Why Bunk. Landing v2 split list (no fabricated social proof) on white.
 */
export function LandingWhyBeam() {
  return (
    <section
      className="landing-section relative overflow-hidden bg-[#F7F9FC]"
      data-testid="why-beam-section"
      id="why-beam"
    >
      <div className="beam-container relative">
        <div className="grid gap-8 md:grid-cols-[1.05fr_1fr] md:items-start md:gap-12">
          <LandingReveal>
            <p className="landing-section-eyebrow">Why Bunk</p>
            <h2 className="landing-section-title">Know what you’re choosing.</h2>
            <p className="landing-section-lede">
              Clear steps and in-app messaging, so you can compare offers and agree on the details
              before anyone starts.
            </p>
            <p className="landing-trust-verify" data-testid="why-beam-verification">
              Helpers confirm their home with a location check before they can make offers.
            </p>
            <Link
              href="/safety"
              className="mt-5 inline-flex min-h-[44px] items-center text-[14px] font-semibold text-[#1D5CE5] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/40"
            >
              Read safety &amp; community guidelines →
            </Link>
          </LandingReveal>
          <LandingReveal as="ul" className="landing-trust-list">
            {PILLARS.map((pillar) => (
              <li key={pillar.step} className="landing-trust-item">
                <span className="landing-trust-step">{pillar.step}</span>
                <div>
                  <h3>{pillar.title}</h3>
                  <p>{pillar.body}</p>
                </div>
              </li>
            ))}
          </LandingReveal>
        </div>
      </div>
    </section>
  )
}
