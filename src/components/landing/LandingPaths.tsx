import Link from 'next/link'
import { StackSection, MetaLabel, FlatSurface } from '@/components/flat'

export function LandingPaths() {
  return (
    <StackSection
      id="paths"
      stick
      zIndex={4}
      tone="ink"
      className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20"
    >
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
        <FlatSurface tone="panel" className="p-6 sm:p-8" as="article">
          <MetaLabel>If you need help</MetaLabel>
          <h2 className="mt-3 font-display text-3xl font-semibold text-beam-cream">Post once. Compare offers.</h2>
          <ul className="mt-5 space-y-3 text-sm leading-relaxed text-beam-cream-dim">
            <li>Describe the job with a category, neighborhood, when, and budget.</li>
            <li>Helpers respond with a named price and timing — not endless chat first.</li>
            <li>Accept one offer, message in-thread, then mark complete and review.</li>
          </ul>
          <Link
            href="/post"
            className="touch-target mt-7 inline-flex items-center justify-center rounded-xl bg-beam-amber px-5 py-3 text-sm font-semibold text-beam-base hover:bg-beam-amber-deep"
          >
            Post a request
          </Link>
        </FlatSurface>

        <FlatSurface tone="panel" className="p-6 sm:p-8 lg:mt-8" as="article">
          <MetaLabel>If you can help</MetaLabel>
          <h2 className="mt-3 font-display text-3xl font-semibold text-beam-cream">Browse nearby. Name a price.</h2>
          <ul className="mt-5 space-y-3 text-sm leading-relaxed text-beam-cream-dim">
            <li>Open requests stay listed until filled — filter by category.</li>
            <li>Send an offer with price and ETA; ranked matches surface skill and distance.</li>
            <li>Keep coordination in the thread after you’re accepted.</li>
          </ul>
          <Link
            href="/browse"
            className="touch-target mt-7 inline-flex items-center justify-center rounded-xl border border-white/12 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-beam-cream hover:border-beam-amber/40"
          >
            Browse open requests
          </Link>
        </FlatSurface>
      </div>
    </StackSection>
  )
}
