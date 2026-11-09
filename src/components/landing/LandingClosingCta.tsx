import Link from 'next/link'

/**
 * Pre-footer closing CTA — centered stack (Landing v2).
 */
export function LandingClosingCta() {
  return (
    <section className="bg-white py-12 md:py-14" data-testid="landing-closing-cta">
      <div className="mx-auto max-w-[1200px] px-5 text-center md:px-8">
        <h2 className="text-[26px] font-bold tracking-[-0.02em] text-[#071330] md:text-[30px]">
          One less thing on your list.
        </h2>
        <p className="mt-2 text-[14px] text-[#475569]">Tell us what you need a hand with.</p>
        <Link
          href="/post"
          className="mt-5 inline-flex h-11 items-center justify-center rounded-[10px] bg-[#1D5CE5] px-6 text-[15px] font-semibold text-white transition-colors hover:bg-[#1649BD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D5CE5]/45 focus-visible:ring-offset-2"
        >
          Post a task
        </Link>
      </div>
    </section>
  )
}
