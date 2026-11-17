import Link from 'next/link'
import { LandingReveal } from './LandingReveal'

/**
 * Pre-footer closing CTA — centered stack (Landing v2).
 */
export function LandingClosingCta() {
  return (
    <section className="landing-section bg-white" data-testid="landing-closing-cta">
      <div className="beam-container text-center">
        <LandingReveal className="landing-centered w-full">
          <h2 className="landing-section-title">One less thing on your list.</h2>
          <p className="landing-section-lede mt-3 max-w-[42ch] text-balance">
            Tell us what you need a hand with.
          </p>
          <p className="landing-closing-reassure" data-testid="landing-closing-reassure">
            Free to post. No obligation.
          </p>
          <Link href="/post" className="landing-closing-cta-btn">
            Post a task
          </Link>
        </LandingReveal>
      </div>
    </section>
  )
}
