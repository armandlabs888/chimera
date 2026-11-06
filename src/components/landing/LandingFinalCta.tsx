import Link from 'next/link'
import { LandingSection } from '@/components/flat'

export function LandingFinalCta() {
  return (
    <LandingSection className="canvas-dotfield border-b border-black/[0.05]">
      <div className="section-inner">
        <div className="elevated-lg mx-auto max-w-3xl px-6 py-10 text-center sm:px-10 sm:py-12">
          <h2 className="type-h1 text-beam-charcoal">Ready to get something done nearby?</h2>
          <p className="mx-auto mt-3 max-w-lg type-intro text-beam-cream-dim">
            Post a practical request or browse open jobs in your Austin neighborhood.
          </p>
          <div className="mt-7 flex flex-col items-stretch justify-center gap-2.5 sm:flex-row sm:items-center">
            <Link
              href="/post"
              className="touch-target inline-flex items-center justify-center rounded-[12px] bg-beam-amber px-5 text-[15px] font-semibold text-beam-charcoal shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] hover:bg-beam-amber-deep hover:text-white"
            >
              Post a request
            </Link>
            <Link
              href="/browse"
              className="touch-target inline-flex items-center justify-center rounded-[12px] bg-white px-5 text-[15px] font-semibold text-beam-cream shadow-[0_0_0_1px_rgba(15,23,42,0.08)] hover:bg-beam-surface-2"
            >
              Browse requests
            </Link>
            <Link
              href="/auth?mode=signup"
              className="touch-target inline-flex items-center justify-center px-3 text-[14px] font-semibold text-beam-cream-dim underline-offset-4 hover:underline"
            >
              Create account
            </Link>
          </div>
        </div>
      </div>
    </LandingSection>
  )
}
