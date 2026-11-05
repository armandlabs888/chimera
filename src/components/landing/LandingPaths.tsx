import Link from 'next/link'
import { LandingSection, MetaLabel, FlatSurface } from '@/components/flat'

export function LandingPaths() {
  return (
    <LandingSection
      id="paths"
      tone="ink"
      className="scroll-mt-16 border-t border-beam-line px-4 py-12 sm:px-6 sm:py-14"
    >
      <div className="mx-auto grid max-w-[72rem] gap-3 lg:grid-cols-2">
        <FlatSurface className="p-5 sm:p-6" as="article">
          <MetaLabel className="text-beam-amber">If you need help</MetaLabel>
          <h2 className="mt-2 type-h2 text-beam-cream">Post once. Compare offers.</h2>
          <ul className="mt-4 space-y-2 type-sec text-beam-cream-dim">
            <li>Describe the job with category, neighborhood, when, and budget.</li>
            <li>Helpers respond with a named price and timing.</li>
            <li>Accept one offer, message in-thread, then mark complete and review.</li>
          </ul>
          <Link
            href="/post"
            className="btn-compact mt-5 inline-flex items-center justify-center rounded-[8px] bg-beam-amber px-4 text-[13px] font-semibold text-beam-charcoal hover:bg-beam-amber-deep"
          >
            Post a request
          </Link>
        </FlatSurface>

        <FlatSurface className="p-5 sm:p-6" as="article">
          <MetaLabel className="text-beam-amber">If you can help</MetaLabel>
          <h2 className="mt-2 type-h2 text-beam-cream">Browse nearby. Name a price.</h2>
          <ul className="mt-4 space-y-2 type-sec text-beam-cream-dim">
            <li>Open requests stay listed until filled — filter by category.</li>
            <li>Send an offer with price and ETA.</li>
            <li>Keep coordination in the thread after you’re accepted.</li>
          </ul>
          <Link
            href="/browse"
            className="btn-compact mt-5 inline-flex items-center justify-center rounded-[8px] border border-beam-line bg-beam-base px-4 text-[13px] font-semibold text-beam-cream hover:border-beam-cream/30"
          >
            Browse open requests
          </Link>
        </FlatSurface>
      </div>
    </LandingSection>
  )
}
