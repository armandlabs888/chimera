import Link from 'next/link'
import { LandingSection } from '@/components/flat'

export function LandingFinalCta() {
  return (
    <LandingSection band className="border-b border-beam-line">
      <div className="section-inner max-w-3xl text-center">
        <h2 className="type-h1 text-beam-charcoal">Ready to get something done nearby?</h2>
        <p className="mx-auto mt-3 max-w-xl type-intro text-beam-cream-dim">
          Post a practical request or browse open jobs in your Austin neighborhood — priced offers,
          in-thread coordination, honest scope.
        </p>
        <div className="mt-7 flex flex-col items-stretch justify-center gap-2.5 sm:flex-row sm:items-center">
          <Link
            href="/post"
            className="touch-target inline-flex items-center justify-center rounded-[10px] bg-beam-amber px-5 text-[15px] font-semibold text-beam-charcoal hover:bg-beam-amber-deep"
          >
            Post a request
          </Link>
          <Link
            href="/browse"
            className="touch-target inline-flex items-center justify-center rounded-[10px] border border-beam-line bg-beam-base px-5 text-[15px] font-medium text-beam-cream hover:bg-beam-surface-2"
          >
            Browse requests
          </Link>
          <Link
            href="/auth?mode=signup"
            className="touch-target inline-flex items-center justify-center px-3 text-[14px] font-medium text-beam-cream-dim underline-offset-4 hover:underline"
          >
            Create account
          </Link>
        </div>
      </div>
    </LandingSection>
  )
}
