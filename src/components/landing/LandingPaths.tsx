import Link from 'next/link'

export function LandingPaths() {
  return (
    <section id="paths" className="relative scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
        <article className="landing-glass landing-bento p-6 sm:p-8">
          <p className="landing-meta text-[11px] uppercase tracking-[0.2em] text-beam-amber">
            If you need help
          </p>
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
        </article>

        <article className="landing-glass landing-bento p-6 sm:p-8 lg:translate-y-8">
          <p className="landing-meta text-[11px] uppercase tracking-[0.2em] text-beam-amber">
            If you can help
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-beam-cream">Browse nearby. Name a price.</h2>
          <ul className="mt-5 space-y-3 text-sm leading-relaxed text-beam-cream-dim">
            <li>Open requests stay listed until filled — filter by category.</li>
            <li>Send an offer with price and ETA; ranked matches surface skill and distance.</li>
            <li>Keep coordination in the thread after you’re accepted.</li>
          </ul>
          <Link
            href="/browse"
            className="touch-target mt-7 inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-beam-cream hover:border-beam-amber/40"
          >
            Browse open requests
          </Link>
        </article>
      </div>
    </section>
  )
}
