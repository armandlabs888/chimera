import Link from 'next/link'
import { StackSection } from '@/components/flat'

export function LandingFinalCta() {
  return (
    <StackSection stick zIndex={6} tone="ink" className="px-4 py-16 sm:px-6 sm:py-24">
      <div className="relative mx-auto max-w-4xl overflow-hidden rounded-2xl px-6 py-12 text-center sm:px-10 sm:py-16">
        <div className="pointer-events-none absolute inset-0 landing-ambient opacity-80" aria-hidden />
        <div className="relative">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-beam-cream sm:text-5xl">
            Ready when you are
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base text-beam-cream-dim">
            Post what you need nearby, or browse open requests and send a clear offer.
          </p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link
              href="/post"
              className="touch-target inline-flex min-h-11 items-center justify-center rounded-xl bg-beam-amber px-6 py-3 text-sm font-semibold text-beam-base hover:bg-beam-amber-deep"
            >
              Post a request
            </Link>
            <Link
              href="/browse"
              className="touch-target inline-flex min-h-11 items-center justify-center rounded-xl border border-white/12 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-beam-cream hover:border-beam-amber/40"
            >
              Browse requests
            </Link>
          </div>
        </div>
      </div>
    </StackSection>
  )
}
