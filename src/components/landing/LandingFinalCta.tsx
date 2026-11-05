import Link from 'next/link'
import { LandingSection } from '@/components/flat'

export function LandingFinalCta() {
  return (
    <LandingSection
      tone="ink"
      className="border-t border-beam-line px-4 py-12 sm:px-6 sm:py-16"
    >
      <div className="mx-auto max-w-2xl rounded-[12px] border border-beam-line bg-beam-base px-6 py-10 text-center sm:px-10">
        <h2 className="type-h2 text-beam-cream">Ready when you are</h2>
        <p className="mx-auto mt-2 max-w-md type-sec text-beam-muted">
          Post what you need nearby, or browse open requests and send a clear offer.
        </p>
        <div className="mt-6 flex flex-col items-stretch justify-center gap-2.5 sm:flex-row sm:items-center">
          <Link
            href="/post"
            className="touch-target inline-flex items-center justify-center rounded-[10px] bg-beam-amber px-5 text-[15px] font-semibold text-beam-charcoal hover:bg-beam-amber-deep"
          >
            Post a request
          </Link>
          <Link
            href="/browse"
            className="touch-target inline-flex items-center justify-center rounded-[10px] border border-beam-line px-5 text-[15px] font-medium text-beam-cream hover:border-beam-cream/30"
          >
            Browse requests
          </Link>
        </div>
      </div>
    </LandingSection>
  )
}
