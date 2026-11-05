import Link from 'next/link'
import { LandingSection } from '@/components/flat'

/** Modest light SaaS hero — ordinary document flow, not full-viewport. */
export function LandingHero() {
  return (
    <LandingSection tone="base" className="px-4 py-12 sm:px-6 sm:py-16 md:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <p className="landing-meta type-meta text-beam-amber">Austin · same-day help nearby</p>

        <h1 className="landing-headline mt-4 text-beam-charcoal">Help nearby. Done today.</h1>

        <p className="landing-hero-copy mx-auto mt-4 max-w-xl type-intro text-beam-cream-dim">
          Post a practical task. Neighbors nearby reply with a price and a time. Pick an offer and
          message to coordinate.
        </p>

        <div className="landing-cta-row mt-7 flex flex-col items-stretch justify-center gap-2.5 sm:flex-row sm:items-center">
          <Link
            href="/post"
            className="touch-target inline-flex items-center justify-center rounded-[10px] bg-beam-amber px-5 text-[15px] font-semibold text-beam-charcoal transition hover:bg-beam-amber-deep"
          >
            Post a request
          </Link>
          <Link
            href="/browse"
            className="touch-target inline-flex items-center justify-center rounded-[10px] border border-beam-line bg-beam-base px-5 text-[15px] font-medium text-beam-cream transition hover:border-beam-cream/30"
          >
            Browse requests
          </Link>
        </div>

        <p className="mt-4 type-sec text-beam-muted">Post · priced offers · in-thread messaging</p>
      </div>
    </LandingSection>
  )
}
