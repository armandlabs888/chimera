import Link from 'next/link'
import { StackSection } from '@/components/flat'

const HEADLINE = ['Help', 'nearby.', 'Done', 'today.'] as const

export function LandingHero() {
  return (
    <StackSection stick zIndex={1} tone="base" className="overflow-hidden px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-16">
      <div className="relative">
      <div className="pointer-events-none absolute inset-0 landing-ambient" aria-hidden />

      <div className="relative mx-auto flex max-w-4xl flex-col justify-center text-center md:min-h-[calc(100dvh-8rem)]">
        <p className="landing-meta mb-5 text-[11px] font-medium uppercase tracking-[0.22em] text-beam-amber sm:mb-6">
          Austin · same-day help nearby
        </p>

        <h1 className="font-display font-semibold leading-[1.02] tracking-tight text-beam-cream">
          <span className="sr-only">Help nearby. Done today.</span>
          <span aria-hidden className="landing-headline flex flex-wrap justify-center gap-x-[0.28em] gap-y-1">
            {HEADLINE.map((word, i) => (
              <span key={word + i} className="landing-word" style={{ ['--i' as string]: i }}>
                {word}
              </span>
            ))}
          </span>
        </h1>

        <p className="landing-hero-copy mx-auto mt-6 max-w-xl text-base leading-relaxed text-beam-cream-dim sm:mt-8 sm:text-lg">
          Post a practical task. Neighbors nearby reply with a price and a time. Pick an offer and
          message to coordinate — structured help, not a feed.
        </p>

        <div className="landing-cta-row mt-8 flex flex-col items-stretch justify-center gap-3 sm:mt-10 sm:flex-row sm:items-center">
          <Link
            href="/post"
            className="touch-target inline-flex min-h-11 items-center justify-center rounded-xl bg-beam-amber px-6 py-3 text-sm font-semibold text-beam-base transition hover:bg-beam-amber-deep"
          >
            Post a request
          </Link>
          <Link
            href="/browse"
            className="touch-target inline-flex min-h-11 items-center justify-center rounded-xl border border-white/12 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-beam-cream transition hover:border-beam-amber/40"
          >
            Browse requests
          </Link>
        </div>

        <p className="mt-5 text-sm text-beam-muted">
          Austin neighbors · post, priced offers, in-thread messaging
        </p>
      </div>
      </div>
    </StackSection>
  )
}
