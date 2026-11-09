import Link from 'next/link'

/**
 * Pre-footer closing CTA — centered stack at all breakpoints
 * (user correction after PR68: not desktop left/right split).
 */
export function LandingClosingCta() {
  return (
    <section
      className="border-t border-[#E2E8F0] bg-[#F4F8FD] py-14 sm:py-16"
      data-testid="landing-closing-cta"
    >
      <div className="beam-container flex flex-col items-center text-center">
        <h2 className="max-w-[22ch] font-sans text-[clamp(1.5rem,2.8vw,2rem)] font-bold leading-[1.15] tracking-[-0.02em] text-[#071330] text-balance">
          One less thing on your list.
        </h2>
        <p className="mt-3 max-w-[36ch] text-[15px] leading-[1.5] text-[#475569]">
          Tell us what you need a hand with.
        </p>
        <Link
          href="/post"
          className="mt-8 inline-flex h-12 min-h-11 items-center justify-center rounded-[10px] bg-[#1D5CE5] px-7 text-[15px] font-semibold text-white transition hover:bg-[#1649BD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/45 focus-visible:ring-offset-2"
        >
          Post a task
        </Link>
      </div>
    </section>
  )
}
